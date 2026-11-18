import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';

// Run in an isolated Docker network: app and pixgo-mock must be test-only aliases.
// Never import application modules until the exact disposable database gate passes.
function safetyGate() {
  assert.equal(process.env.NODE_ENV, 'development');
  assert.equal(process.env.PIXGO_MODE, 'mock');
  const url = new URL(process.env.DATABASE_URL ?? '');
  assert.equal(url.protocol, 'postgresql:');
  assert.equal(url.hostname, 'postgres');
  assert.ok(!url.port || url.port === '5432');
  assert.equal(url.pathname, '/namarca_checkout_test');
  assert.equal(process.env.BETTER_AUTH_URL, 'http://app:3000');
  assert.equal(process.env.PIXGO_BASE_URL, 'http://pixgo-mock:4010/api/v1');
  assert.equal(process.env.PIXGO_WEBHOOK_URL, 'http://app:3000/api/webhooks/pixgo');
  assert.equal(process.env.CHECKOUT_TEST_ISOLATED, '1');
  assert.ok(process.env.PIXGO_MOCK_DEV_TOKEN);
}
function syntheticCpf(): string {
  const digits = Array.from({ length: 9 }, () => randomInt(10));
  for (const length of [9, 10]) {
    const n = digits.reduce((sum, d, i) => sum + d * (length + 1 - i), 0) * 10 % 11;
    digits.push(n === 10 ? 0 : n);
  }
  const value = digits.join('');
  return /^(\d)\1+$/.test(value) ? syntheticCpf() : value;
}
let stage = 'safety gate';
async function main() {
  safetyGate();
  const [{ db, pool }, schema, { eq, sql }, checkout, { createPixgoClient }, { chromium, expect }] = await Promise.all([
    import('../src/db'), import('../src/db/schema'), import('drizzle-orm'), import('../src/lib/checkout'), import('../src/lib/pixgo'), import('@playwright/test'),
  ]);
  const { campaigns, checkoutLinks, checkoutAttempts, payments, webhookReceipts, publicationTasks } = schema;
  const gateway = createPixgoClient();
  const campaignIds: string[] = [];
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  async function fixture(name: string) {
    const id = randomUUID();
    await db.insert(campaigns).values({ id, name, slug: `checkout-test-${id}`, priceCents: 4321, endsAt: new Date(Date.now() + 86400000) });
    campaignIds.push(id);
    return checkout.issueCheckout(id);
  }
  async function history(checkoutId: string) {
    return db.select().from(payments).where(eq(payments.checkoutId, checkoutId));
  }
  async function action(paymentId: string, name: 'complete' | 'refund') {
    const response = await fetch(`http://pixgo-mock:4010/__dev/payments/${paymentId}/${name}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(60000), headers: { 'X-Dev-Token': process.env.PIXGO_MOCK_DEV_TOKEN! },
    });
    assert.equal(response.status, 200, 'Mock callback must succeed against isolated app');
    const result = await response.json();
    assert.equal(result.webhook_delivered, true);
  }
  try {
    stage = 'empty isolated database';
    const counts = await db.execute(sql`select (select count(*) from campaigns)::int as campaigns, (select count(*) from auth_user)::int as users`);
    assert.deepEqual(counts.rows, [{ campaigns: 0, users: 0 }], 'Refuse reused database with campaign/account data');
    stage = 'snapshot and repeated issue';
    const link = await fixture('Synthetic checkout snapshot');
    assert.match(link.token, /^[a-f0-9]{64}$/);
    await db.update(campaigns).set({ name: 'Changed synthetic name', priceCents: 9876 }).where(eq(campaigns.id, link.campaignId));
    const repeated = await Promise.all(Array.from({ length: 5 }, () => checkout.issueCheckout(link.campaignId)));
    for (const item of repeated) assert.deepEqual(item, link);
    assert.equal((await db.select().from(checkoutLinks).where(eq(checkoutLinks.campaignId, link.campaignId))).length, 1);
    assert.equal(await checkout.getCheckout('invalid'), null);
    console.log('PASS: immutable name/amount snapshot and repeated concurrent issue reuse one link');

    stage = 'concurrent startCheckout';
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => checkout.startCheckout(link.token, syntheticCpf())));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    const [payment] = await history(link.id);
    assert.equal((await history(link.id)).length, 1);
    assert.equal(payment.amountCents, 4321);
    assert.equal(payment.status, 'pending');
    assert.ok(payment.qrCode);
    assert.ok(payment.expiresAt instanceof Date);
    const attempts = await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, link.id));
    assert.equal(attempts.length, 1);
    assert.equal(attempts[0].state, 'registered');
    assert.equal((await gateway.findMockPayment(attempts[0].externalId)).id, payment.paymentId);
    console.log('PASS: six simultaneous starts produce exactly one registered attempt and remote payment');

    stage = 'unknown recovery';
    const recovery = await fixture('Synthetic recovery');
    const [attempt] = await db.insert(checkoutAttempts).values({ checkoutId: recovery.id, externalId: randomUUID(), state: 'unknown' }).returning();
    const remote = await gateway.createPayment({ externalId: attempt.externalId, amountCents: recovery.amountCents, payerCpf: syntheticCpf() });
    await assert.rejects(checkout.startCheckout(recovery.token, syntheticCpf()));
    assert.equal((await history(recovery.id)).length, 0);
    const found = await gateway.findMockPayment(attempt.externalId);
    await assert.rejects(checkout.registerCheckoutPayment(attempt.id, { ...found, amount: '43.22' }));
    assert.equal((await history(recovery.id)).length, 0);
    await checkout.registerCheckoutPayment(attempt.id, found);
    await checkout.registerCheckoutPayment(attempt.id, found);
    assert.equal((await history(recovery.id)).length, 1);
    assert.equal((await history(recovery.id))[0].paymentId, remote.id);
    assert.equal((await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.id, attempt.id)))[0].state, 'registered');
    await assert.rejects(checkout.startCheckout(recovery.token, syntheticCpf()));
    console.log('PASS: unknown blocks retry; mock lookup + registration recover idempotently; mismatch rejected');

    stage = 'warm callback';
    const warm = await fetch('http://app:3000/api/webhooks/pixgo', { method: 'POST', body: '{}', signal: AbortSignal.timeout(120000) });
    assert.equal(warm.status, 401);
    stage = 'pending reconciliation';
    await checkout.reconcilePayment(payment.id);
    assert.equal((await history(link.id))[0].status, 'pending');
    assert.equal((await history(link.id))[0].paidAt, null);
    stage = 'paid reconciliation';
    await action(payment.paymentId, 'complete');
    // Emulate a missed local financial update, only on this synthetic row. The
    // stock mock always sends callbacks, so restore stale state before querying.
    await db.update(payments).set({ status: 'pending', paidAt: null }).where(eq(payments.id, payment.id));
    await checkout.reconcilePayment(payment.id);
    const paid = (await history(link.id))[0];
    assert.equal(paid.status, 'paid');
    assert.ok(paid.paidAt instanceof Date);
    stage = 'refunded reconciliation';
    await action(payment.paymentId, 'refund');
    await db.update(payments).set({ status: 'paid', paidAt: paid.paidAt }).where(eq(payments.id, payment.id));
    await checkout.reconcilePayment(payment.id);
    const refunded = (await history(link.id))[0];
    assert.equal(refunded.status, 'refunded');
    assert.deepEqual(refunded.paidAt, paid.paidAt);
    await checkout.reconcilePayment(payment.id);
    assert.equal((await history(link.id))[0].status, 'refunded');
    console.log('PASS: pending/paid/refunded reconciliation against real mock status; paidAt retained');

    stage = 'callback before local registration';
    const race = await fixture('Synthetic callback race');
    const [racing] = await db.insert(checkoutAttempts).values({ checkoutId: race.id, externalId: randomUUID(), state: 'creating' }).returning();
    const racingRemote = await gateway.createPayment({ externalId: racing.externalId, amountCents: race.amountCents, payerCpf: syntheticCpf() });
    assert.equal((await history(race.id)).length, 0);
    await action(racingRemote.id, 'complete');
    const beforeLateResponse = await history(race.id);
    assert.equal(beforeLateResponse.length, 1);
    assert.equal(beforeLateResponse[0].status, 'paid');
    await checkout.registerCheckoutPayment(racing.id, racingRemote); // delayed pending create response
    assert.deepEqual(await history(race.id), beforeLateResponse);
    await action(racingRemote.id, 'complete');
    assert.equal((await db.select().from(webhookReceipts).where(eq(webhookReceipts.paymentId, racingRemote.id))).length, 1);
    console.log('PASS: callback auto-registers before create response; delayed registration cannot regress paid; duplicate receipt avoided');

    stage = 'public browser submit';
    const publicLink = await fixture('Synthetic public checkout');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // no admin login/cookies
    page.setDefaultTimeout(60000);
    async function checkResponsive(state: 'form' | 'pending' | 'paid') {
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
        const dimensions = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
        }));
        assert.ok(dimensions.document <= dimensions.viewport && dimensions.body <= dimensions.viewport,
          `Horizontal overflow at ${width}px in ${state}`);
        // Capture only the empty form or states where the CPF field is absent.
        if (state === 'form') await expect(page.getByRole('textbox', { name: /CPF do pagador/ })).toHaveValue('');
        else await expect(page.getByRole('textbox', { name: /CPF do pagador/ })).toHaveCount(0);
        await page.screenshot({ path: `/tmp/checkout-${state}-${width}.png`, fullPage: true });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      console.log(`PASS: ${state} has no horizontal overflow at 390px and 1440px; CPF-free synthetic screenshots in /tmp`);
    }
    const response = await page.goto(`http://app:3000/checkout/${publicLink.token}`, { timeout: 120000 });
    assert.equal(response?.status(), 200);
    await expect(page.getByRole('heading', { name: publicLink.campaignName, exact: true })).toBeVisible();
    await checkResponsive('form');
    await page.getByRole('textbox', { name: /CPF do pagador/ }).fill(syntheticCpf());
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Gerar Pix', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Aguardando pagamento', exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: 'QR Code para pagamento via Pix' })).toBeVisible();
    assert.equal((await history(publicLink.id)).length, 1);
    const publicPayment = (await history(publicLink.id))[0];
    assert.equal(publicPayment.status, 'pending');
    await checkResponsive('pending');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Gerar Pix', exact: true })).toHaveCount(0);
    await action(publicPayment.paymentId, 'complete');
    await page.getByRole('link', { name: 'Atualizar situação', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Pagamento confirmado', exact: true })).toBeVisible();
    await checkResponsive('paid');
    console.log('PASS: anonymous Playwright real submit at 390px, persisted QR/pending, reload prevents retry, callback paid visible');

    stage = 'no publication';
    for (const id of campaignIds) {
      const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
      assert.equal(campaign.preparationStatus, 'draft');
      assert.equal(campaign.publicationStatus, 'unpublished');
      assert.equal((await db.select().from(publicationTasks).where(eq(publicationTasks.campaignId, id))).length, 0);
    }
    console.log('PASS: all synthetic campaigns remain draft/unpublished, no publication tasks');
  } finally {
    await browser?.close();
    try {
      for (const id of campaignIds) {
        const rows = await db.select().from(payments).where(eq(payments.campaignId, id));
        for (const row of rows) await db.delete(webhookReceipts).where(eq(webhookReceipts.paymentId, row.paymentId));
        await db.delete(payments).where(eq(payments.campaignId, id));
        const links = await db.select().from(checkoutLinks).where(eq(checkoutLinks.campaignId, id));
        for (const link of links) await db.delete(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, link.id));
        await db.delete(checkoutLinks).where(eq(checkoutLinks.campaignId, id));
        await db.delete(campaigns).where(eq(campaigns.id, id));
      }
      for (const table of [campaigns, checkoutLinks, checkoutAttempts, payments, webhookReceipts, publicationTasks]) {
        assert.equal((await db.select().from(table)).length, 0);
      }
      console.log('CLEANUP: isolated database fixtures removed and empty domain tables verified; discard test-only mock container');
    } finally { await pool.end(); }
  }
}
main().catch(() => {
  // Never log errors from browser, DB or gateway: they may contain personal data.
  console.error(`FAIL: checkout integration at ${stage}; sensitive details suppressed`);
  process.exitCode = 1;
});
