import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

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
// Values stay in memory only; never include them in assertions, logs or captures.
const payerDocuments: string[] = [];
function syntheticCpf(): string {
  const digits = Array.from({ length: 9 }, () => randomInt(10));
  for (const length of [9, 10]) {
    const n = digits.reduce((sum, d, i) => sum + d * (length + 1 - i), 0) * 10 % 11;
    digits.push(n === 10 ? 0 : n);
  }
  const value = digits.join('');
  if (/^(\d)\1+$/.test(value)) return syntheticCpf();
  payerDocuments.push(value);
  return value;
}
function syntheticCnpj(alphanumeric: boolean): string {
  const alphabet = alphanumeric ? '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '0123456789';
  // Force a letter in the alphanumeric case and avoid a repeated numeric base.
  let value = alphanumeric ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[randomInt(26)] : String(randomInt(1, 10));
  for (let i = 1; i < 12; i++) value += alphabet[randomInt(alphabet.length)];
  for (const weights of [[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]]) {
    const remainder = weights.reduce((sum, weight, i) => sum + (value.charCodeAt(i) - 48) * weight, 0) % 11;
    value += String(remainder < 2 ? 0 : 11 - remainder);
  }
  payerDocuments.push(value);
  return value;
}
function assertNoPayerDocuments(value: unknown) {
  const serialized = JSON.stringify(value);
  assert.ok(!payerDocuments.some(document => serialized.toUpperCase().includes(document)), 'Payer document must not be retained');
  assert.ok(!/"(?:cpf|cnpj|payerCpf|receiver_cpf|payer_document)"\s*:/i.test(serialized), 'Payer identity fields must not be retained');
}
let stage = 'safety gate';
async function main() {
  safetyGate();
  const [{ db, pool }, schema, { eq, sql }, checkout, { createPixgoClient }, { chromium, expect }] = await Promise.all([
    import('../src/db'), import('../src/db/schema'), import('drizzle-orm'), import('../src/lib/checkout'), import('../src/lib/pixgo'), import('@playwright/test'),
  ]);
  const { campaigns, checkoutLinks, checkoutAttempts, checkoutAttemptEvents, payments, webhookReceipts, publicationTasks } = schema;
  const gateway = createPixgoClient();
  const campaignIds: string[] = [];
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  async function fixture(name: string, amountCents = 4321, description = 'Campanha', requestId = randomUUID()) {
    const id = randomUUID();
    await db.insert(campaigns).values({ id, name, slug: `checkout-test-${id}`, priceCents: amountCents, endsAt: new Date(Date.now() + 86400000) });
    campaignIds.push(id);
    return checkout.issueCheckout(id, amountCents, description, requestId);
  }
  async function history(checkoutId: string) {
    return db.select().from(payments).where(eq(payments.checkoutId, checkoutId));
  }
  async function mockPayments() {
    const response = await fetch('http://pixgo-mock:4010/api/v1/payment/list', {
      headers: { 'X-API-Key': process.env.PIXGO_API_KEY! }, redirect: 'error', signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.success, true);
    assert.ok(Array.isArray(result.data));
    return result.data as Array<{ payment_id: string; external_id: string }>;
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
    stage = 'snapshot and request idempotency';
    const link = await fixture('Synthetic checkout snapshot');
    assert.match(link.token, /^[a-f0-9]{64}$/);
    await db.update(campaigns).set({ name: 'Changed synthetic name', priceCents: 9876 }).where(eq(campaigns.id, link.campaignId));
    const repeated = await Promise.all(Array.from({ length: 5 }, () => checkout.issueCheckout(link.campaignId, link.amountCents, link.description, link.id)));
    for (const item of repeated) assert.deepEqual(item, link);
    assert.equal(link.description, 'Campanha');
    await assert.rejects(checkout.issueCheckout(link.campaignId, 9876, link.description, link.id));
    await assert.rejects(checkout.issueCheckout(link.campaignId, link.amountCents, 'Adicional divergente', link.id));
    const other = await fixture('Synthetic request ownership');
    await assert.rejects(checkout.issueCheckout(other.campaignId, link.amountCents, link.description, link.id));
    assert.equal((await db.select().from(checkoutLinks).where(eq(checkoutLinks.campaignId, link.campaignId))).length, 1);
    assert.deepEqual(await checkout.getCheckout(link.token), link);
    assert.equal(await checkout.getCheckout('invalid'), null);
    console.log('PASS: explicit requestId reuses immutable snapshot concurrently; campaign/amount/description mismatches rejected');

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

    stage = 'lost create response and inconclusive lookups';
    const retryLink = await fixture('Synthetic manual retry');
    const nativeFetch = globalThis.fetch;
    const calls: Array<{ method: string; path: string; started: number; ended: number }> = [];
    let inFlight = 0;
    let maxInFlight = 0;
    // Scoped fault injection: real mock POST, lost response, no automatic GET.
    // This does not patch the app or mock, and never retains request bodies.
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.hostname, 'pixgo-mock');
      const call = { method: init?.method ?? 'GET', path: url.pathname, started: Date.now(), ended: 0 };
      calls.push(call);
      maxInFlight = Math.max(maxInFlight, ++inFlight);
      try {
        if (call.method === 'POST') {
          const response = await nativeFetch(input, init);
          assert.ok(response.ok);
          throw new Error('Synthetic lost response');
        }
        assert.equal(url.pathname, '/api/v1/payment/list');
        await new Promise(resolve => setTimeout(resolve, 30));
        return Response.json({ success: true, data: [] });
      } finally { call.ended = Date.now(); inFlight--; }
    };
    try { await assert.rejects(checkout.startCheckout(retryLink.token, syntheticCpf())); }
    finally { globalThis.fetch = nativeFetch; }
    assert.deepEqual(calls.map(c => [c.method, c.path]), [['POST', '/api/v1/payment/create']]);
    assert.equal(maxInFlight, 1);
    const [uncertain] = await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, retryLink.id));
    assert.equal(uncertain.state, 'unknown');
    assert.equal(uncertain.queryCount, 0);
    assert.equal(uncertain.lastQueriedAt, null);
    assert.equal(uncertain.retryReleasedAt, null);
    assert.equal(uncertain.retryReleasedBy, null);
    assert.equal((await history(retryLink.id)).length, 0);
    const queries = await db.select().from(checkoutAttemptEvents).where(eq(checkoutAttemptEvents.attemptId, uncertain.id));
    assert.equal(queries.length, 0);
    const oldRemote = await gateway.findMockPayment(uncertain.externalId);
    const beforeRetry = await mockPayments();
    assert.equal(beforeRetry.filter(row => row.external_id === uncertain.externalId).length, 1);
    console.log('PASS: lost POST preserves unknown with zero automatic GETs, no payment registration and no authorization event');

    stage = 'explicit new creation on same token';
    await checkout.startCheckout(retryLink.token, syntheticCpf());
    const newHistory = await history(retryLink.id);
    assert.equal(newHistory.length, 1);
    assert.notEqual(newHistory[0].paymentId, oldRemote.id);
    assert.equal((await mockPayments()).length, beforeRetry.length + 1);
    assert.deepEqual((await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.id, uncertain.id)))[0], uncertain);
    assert.deepEqual(await db.select().from(checkoutAttemptEvents).where(eq(checkoutAttemptEvents.attemptId, uncertain.id)), []);
    assert.equal((await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, retryLink.id))).length, 2);
    assert.deepEqual(await checkout.getCheckout(retryLink.token), retryLink);

    stage = 'active payment blocks explicit retry';
    const [blocked] = await db.insert(checkoutAttempts).values({ checkoutId: retryLink.id, externalId: randomUUID(), state: 'unknown', createdAt: new Date(Date.now() - 31000) }).returning();
    const beforeActiveBlock = await mockPayments();
    await assert.rejects(checkout.startCheckout(retryLink.token, syntheticCpf()), /Já existe uma cobrança/);
    assert.deepEqual(await mockPayments(), beforeActiveBlock);
    assert.equal((await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, retryLink.id))).length, 3);
    assert.equal((await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.id, blocked.id)))[0].retryReleasedAt, null);
    assert.equal((await db.select().from(checkoutAttemptEvents).where(eq(checkoutAttemptEvents.attemptId, blocked.id))).length, 0);
    await db.delete(checkoutAttempts).where(eq(checkoutAttempts.id, blocked.id));

    stage = 'old callback after explicit retry';
    await action(oldRemote.id, 'complete');
    const afterOldCallback = await history(retryLink.id);
    assert.equal(afterOldCallback.length, 2);
    assert.deepEqual(afterOldCallback.find(row => row.id === newHistory[0].id), newHistory[0]);
    assert.equal(afterOldCallback.find(row => row.paymentId === oldRemote.id)?.status, 'paid');
    assert.equal((await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.id, uncertain.id)))[0].state, 'registered');
    await checkout.registerCheckoutPayment(uncertain.id, oldRemote);
    assert.deepEqual(await history(retryLink.id), afterOldCallback);
    await action(oldRemote.id, 'complete');
    assert.equal((await db.select().from(webhookReceipts).where(eq(webhookReceipts.paymentId, oldRemote.id))).length, 1);
    console.log('PASS: explicit retry creates another POST on same token without admin; active payment blocks; old callback and duplicate preserve both payments');

    stage = 'recent creating blocks and stale creating permits explicit retry';
    const creatingLink = await fixture('Synthetic creating guard');
    const [creatingAttempt] = await db.insert(checkoutAttempts).values({ checkoutId: creatingLink.id, externalId: randomUUID(), state: 'creating' }).returning();
    const beforeCreating = await mockPayments();
    await assert.rejects(checkout.startCheckout(creatingLink.token, syntheticCpf()), /ainda está em andamento/);
    assert.deepEqual(await mockPayments(), beforeCreating);
    assert.equal((await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, creatingLink.id))).length, 1);
    const staleCreatedAt = new Date(Date.now() - 16000);
    await db.update(checkoutAttempts).set({ createdAt: staleCreatedAt }).where(eq(checkoutAttempts.id, creatingAttempt.id));
    await checkout.startCheckout(creatingLink.token, syntheticCpf());
    assert.equal((await history(creatingLink.id)).length, 1);
    assert.equal((await mockPayments()).length, beforeCreating.length + 1);
    assert.equal((await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, creatingLink.id))).length, 2);
    assert.deepEqual((await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.id, creatingAttempt.id)))[0], { ...creatingAttempt, createdAt: staleCreatedAt });
    console.log('PASS: creating younger than 15s blocks without POST; stale creating older than 15s permits explicit retry and remains intact');

    stage = 'unknown registration compatibility';
    const recovery = await fixture('Synthetic recovery');
    const [attempt] = await db.insert(checkoutAttempts).values({ checkoutId: recovery.id, externalId: randomUUID(), state: 'unknown' }).returning();
    const remote = await gateway.createPayment({ externalId: attempt.externalId, amountCents: recovery.amountCents, payerCpf: syntheticCpf() });
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
    console.log('PASS: explicit registration remains idempotent and rejects mismatch; registered active payment blocks retry');

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
    const visualMeasurements: unknown[] = [];
    const visualFailures: string[] = [];
    const captureDirectory = '/tmp/namarca-checkout-visible-code';
    await mkdir(captureDirectory, { recursive: true });
    async function checkResponsive(state: 'form' | 'pending' | 'paid' | 'refunded' | 'expired' | 'uncertain' | 'pending-code' | 'expired-then-unknown' | 'unknown-then-expired' | 'pending-error' | 'payment-details' | 'long-name') {
      for (const { width, height } of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 320, height: 568 }, { width: 1440, height: 900 }]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(400); // Measure settled entrance, not an animation frame.
        const shapeGeometry = await page.locator('.checkout-brand-shape').evaluate(element => {
          const shape = element.getBoundingClientRect();
          const card = element.parentElement!.getBoundingClientRect();
          const logo = element.querySelector('a')!.getBoundingClientRect();
          return { shapeTop: shape.top, shapeHeight: shape.height, halfOutside: card.top - shape.top, centerDelta: shape.x + shape.width / 2 - card.x - card.width / 2, logoTop: logo.top, logoHeight: logo.height, logoWidth: logo.width, groupTop: shape.top, groupBottom: card.bottom, groupCenterDelta: (shape.top + card.bottom) / 2 - innerHeight / 2 };
        });
        assert.equal(shapeGeometry.shapeHeight, 48, 'Brand shape is 48px');
        assert.ok(Math.abs(shapeGeometry.halfOutside - 24) <= 1, 'Half the brand shape lies outside the card');
        assert.ok(Math.abs(shapeGeometry.centerDelta) <= 1, 'Brand shape is horizontally centered');
        assert.ok(shapeGeometry.logoTop >= 0, 'Logo remains reachable at document top');
        assert.ok(shapeGeometry.logoHeight >= 44 && shapeGeometry.logoWidth >= 44, 'Logo target is at least 44px');
        visualMeasurements.push({ state, width, height, shapeGeometry });
        await expect(page.getByText('Ver código Pix', { exact: true })).toHaveCount(0);
        await expect(page.getByText(/Escaneie|Scan|Link privado/i)).toHaveCount(0);
        if (state.startsWith('pending') || state === 'payment-details') {
          const visibleCode = page.getByRole('textbox', { name: 'Pix Copia e Cola', exact: true });
          await expect(visibleCode).toBeVisible();
          await expect(visibleCode).toHaveAttribute('readonly', '');
          assert.equal(await visibleCode.evaluate(element => element.closest('details')), null);
          await expect(page.locator('.checkout-payment-heading h2')).toHaveText('Aguardando pagamento');
          await expect(page.locator('.checkout-payment-heading [role="timer"]')).toBeVisible();
        }
        const brand = page.locator('.checkout-brand');
        await expect(brand).toBeVisible();
        await expect(brand).toHaveText('namarca');
        assert.equal(await page.getByText('namarca', { exact: true }).count(), 1);
        const brandDecoration = await brand.evaluate(element => [element, ...element.querySelectorAll('*')].map(node => ({
          before: getComputedStyle(node, '::before').content,
          after: getComputedStyle(node, '::after').content,
        })));
        for (const decoration of brandDecoration) {
          assert.ok(['none', 'normal', '""'].includes(decoration.before), 'Brand must not add pseudo text/decorations');
          assert.ok(['none', 'normal', '""'].includes(decoration.after), 'Brand must not add pseudo text/decorations');
        }
        stage = `visual geometry ${state} ${width}x${height}`;
        // String evaluation avoids tsx/esbuild __name helpers in serialized nested callbacks.
        const dimensions = await page.evaluate(`(() => {
          const root = document.documentElement;
          function visible(element) { return element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden'; }
          function geometry(element) {
            const rect = element.getBoundingClientRect();
            return { tag: element.tagName, className: element.className, top: Math.round(rect.top), bottom: Math.round(rect.bottom), width: Math.round(rect.width * 100) / 100, height: Math.round(rect.height * 100) / 100 };
          }
          return {
            viewport: root.clientWidth, innerHeight: window.innerHeight,
            document: root.scrollWidth, body: document.body.scrollWidth,
            scrollHeight: Math.max(root.scrollHeight, document.body.scrollHeight),
            controls: [...document.querySelectorAll('.checkout-card input, .checkout-card button, .checkout-card a, .checkout-card summary, .checkout-card textarea')].filter(visible).map(geometry),
            sections: [...document.querySelectorAll('.checkout-card > *, .checkout-qr')].filter(visible).map(geometry),
            clipping: [...document.querySelectorAll('html, body, .checkout-shell, .checkout-card, .checkout-card section, .checkout-card footer')].filter(visible).filter(element => ['hidden', 'clip'].includes(getComputedStyle(element).overflowY) || ['hidden', 'clip'].includes(getComputedStyle(element).overflowX)).map(geometry),
          };
        })()`) as {
          viewport: number; innerHeight: number; document: number; body: number; scrollHeight: number;
          controls: Array<{ height: number; width: number }>; sections: unknown[]; clipping: unknown[];
        };
        const standardCollapsed = ['form', 'pending', 'paid', 'expired', 'uncertain'].includes(state);
        const issues = [
          ...(dimensions.document > dimensions.viewport || dimensions.body > dimensions.viewport ? ['horizontal overflow'] : []),
          ...(standardCollapsed && dimensions.scrollHeight > dimensions.innerHeight ? [`vertical overflow ${dimensions.scrollHeight - dimensions.innerHeight}px`] : []),
          ...(dimensions.controls.some(control => control.height < 44 || control.width < 44) ? ['control below 44px'] : []),
          ...(dimensions.clipping.length ? ['content overflow hidden/clip'] : []),
        ];
        visualMeasurements.push({ state: state === 'uncertain' ? 'unknown' : state, width, height, ...dimensions, issues });
        if (issues.length) visualFailures.push(`${state} ${width}x${height}: ${issues.join(', ')}`);
        console.log(`VISUAL: ${state} ${width}x${height} scrollHeight=${dimensions.scrollHeight} innerHeight=${dimensions.innerHeight} scrollWidth=${Math.max(dimensions.document, dimensions.body)}; ${issues.length ? issues.join(', ') : dimensions.scrollHeight > dimensions.innerHeight ? 'expanded/exceptional content scrolls; controls >=44px; no clipping' : 'fits; controls >=44px; no clipping'}`);
        await writeFile(`${captureDirectory}/measurements.json`, JSON.stringify(visualMeasurements, null, 2));
        // Capture only the empty form or states where the CPF field is absent.
        if (state === 'form' || state === 'long-name' || state === 'expired' || state === 'uncertain' || state === 'expired-then-unknown' || state === 'unknown-then-expired') await expect(page.getByRole('textbox', { name: /CPF ou CNPJ do pagador/ })).toHaveValue('');
        else await expect(page.getByRole('textbox', { name: /CPF ou CNPJ do pagador/ })).toHaveCount(0);
        await page.screenshot({ path: `${captureDirectory}/checkout-${state === 'uncertain' ? 'unknown' : state}-${width}x${height}.png`, fullPage: true });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      console.log(`CAPTURE: ${state}; CPF-free synthetic screenshots and measured geometry in ${captureDirectory}`);
    }
    const response = await page.goto(`http://app:3000/checkout/${publicLink.token}`, { timeout: 120000 });
    assert.equal(response?.status(), 200);
    await expect(page.getByRole('heading', { name: publicLink.campaignName, exact: true })).toBeVisible();
    await checkResponsive('form');
    const longLink = await fixture('Campanha com nome público muito longo para verificar quebra natural sem cortar informações importantes no celular', 4321, 'Descrição pública longa '.repeat(5).trim());
    await page.goto(`http://app:3000/checkout/${longLink.token}`);
    await checkResponsive('long-name');
    await page.locator('.checkout-footer summary').click();
    await expect(page.locator('.checkout-footer details p')).toBeVisible();
    // Expanded content may scroll, but the final content must remain reachable.
    await page.locator('.checkout-footer details p').scrollIntoViewIfNeeded();
    await page.goto(`http://app:3000/checkout/${publicLink.token}`);
    await page.getByRole('textbox', { name: /CPF ou CNPJ do pagador/ }).fill(syntheticCpf());
    await page.getByRole('button', { name: 'Gerar Pix', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Aguardando pagamento', exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: 'QR Code para pagamento via Pix' })).toBeVisible();
    assert.equal((await history(publicLink.id)).length, 1);
    const publicPayment = (await history(publicLink.id))[0];
    assert.equal(publicPayment.status, 'pending');
    await checkResponsive('pending');
    stage = 'absolute countdown, reload, visibility and reduced motion';
    const timer = page.getByRole('timer', { name: 'Tempo restante para pagar' });
    const readSeconds = async () => {
      const text = await timer.innerText();
      assert.match(text, /^\d{2,}:\d{2}(?::\d{2})?$/);
      return text.split(':').reduce((sum, part) => sum * 60 + Number(part), 0);
    };
    await expect(page.locator('.checkout-payment-heading h2')).toHaveText('Aguardando pagamento');
    await expect(page.locator('.checkout-payment-heading').getByRole('timer', { name: 'Tempo restante para pagar' })).toBeVisible();
    await expect(timer).toHaveAttribute('aria-live', 'off');
    assert.equal(await timer.evaluate(element => !!element.parentElement?.closest('[aria-live="polite"], [aria-live="assertive"], [role="status"], [role="alert"]')), false);
    await expect(page.locator('.checkout-countdown [role="status"]')).toBeEmpty();
    const secondsBefore = await readSeconds();
    await page.waitForTimeout(2200);
    assert.ok(await readSeconds() <= secondsBefore - 2, 'Countdown decreases after two seconds');
    await page.reload();
    await expect(timer).not.toHaveText('—:—');
    assert.ok(await readSeconds() <= secondsBefore - 2, 'Reload must not restart the countdown');
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    assert.ok(await readSeconds() <= secondsBefore - 2, 'Visibility update preserves absolute expiration');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    assert.equal(await page.locator('.checkout-card').evaluate(element => getComputedStyle(element).animationName), 'none');
    assert.equal(await page.getByRole('button', { name: 'Copiar código Pix', exact: true }).evaluate(element => getComputedStyle(element).transitionDuration), '0s');
    await expect(timer).not.toHaveText('—:—');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    console.log('PASS: absolute countdown decreases, survives reload/visibility, timer is not live; reduced-motion disables entrance/transitions');

    stage = 'short SQL expiry only changes countdown message';
    const shortLink = await fixture('Synthetic short countdown');
    const [shortPayment] = await db.insert(payments).values({ campaignId: shortLink.campaignId, checkoutId: shortLink.id, externalId: randomUUID(), paymentId: randomUUID(), amountCents: shortLink.amountCents, status: 'pending', qrCode: 'SYNTHETIC-NONPAYABLE-COUNTDOWN', expiresAt: new Date(Date.now() + 6000) }).returning();
    const remoteBeforeExpiry = await mockPayments();
    const requests: string[] = [];
    const recordPost = (request: { method(): string }) => { if (request.method() === 'POST') requests.push('POST'); };
    page.on('request', recordPost);
    await page.goto(`http://app:3000/checkout/${shortLink.token}`);
    await expect(page.locator('.checkout-countdown')).toHaveAttribute('data-ended', 'true', { timeout: 15000 });
    await expect(page.getByText('Prazo encerrado. Atualize a situação.', { exact: true })).toBeVisible();
    await expect(page.locator('.checkout-countdown [role="status"]')).toHaveText('O prazo do Pix terminou. Atualize a situação para verificar o pagamento.');
    await expect(page.getByRole('heading', { name: 'Aguardando pagamento', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Gerar Pix|Tentar novamente/ })).toHaveCount(0);
    await page.waitForTimeout(2100);
    page.off('request', recordPost);
    assert.deepEqual(requests, [], 'Reaching zero must not POST');
    assert.deepEqual(await history(shortLink.id), [shortPayment], 'Visual expiration must not mutate financial status');
    assert.deepEqual(await mockPayments(), remoteBeforeExpiry, 'Visual expiration must not create remote payment');
    assert.deepEqual(await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, shortLink.id)), []);
    console.log('PASS: short SQL expiry reaches message only, with zero POST/new payment/financial mutation');
    await page.goto(`http://app:3000/checkout/${publicLink.token}`);
    stage = 'clipboard and always visible Pix code';
    const code = page.getByRole('textbox', { name: 'Pix Copia e Cola', exact: true });
    await expect(page.getByText('Ver código Pix', { exact: true })).toHaveCount(0);
    await expect(code).toBeVisible();
    assert.equal(await code.evaluate(element => element.closest('details')), null, 'Pix code must not be disclosed through details');
    await expect(code).toHaveValue(publicPayment.qrCode!);
    assert.equal(await code.getAttribute('readonly'), '');
    await checkResponsive('pending-code');
    await page.evaluate(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (value) => { window.copiedPix = value; }
    } })`);
    stage = 'clipboard success button';
    await page.getByRole('button', { name: 'Copiar código Pix', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Código Pix copiado', exact: true })).toBeVisible();
    assert.equal(await page.evaluate(() => (window as unknown as { copiedPix: string }).copiedPix), publicPayment.qrCode);
    stage = 'clipboard success announcement';
    await expect(page.locator('.checkout-copy [role="status"]')).toHaveText('Código Pix copiado.');
    await page.evaluate(`Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async () => { throw new DOMException('Denied', 'NotAllowedError'); }
    } })`);
    stage = 'clipboard denied retry';
    await page.getByRole('button', { name: 'Código Pix copiado', exact: true }).click();
    stage = 'clipboard denied alert';
    await expect(page.locator('.checkout-copy [role="alert"]')).toHaveText('Selecione o código acima e copie manualmente.');
    await expect(code).toBeVisible();
    await expect(code).toHaveValue(publicPayment.qrCode!);
    await expect(code).toHaveAttribute('readonly', '');
    await expect(page.getByRole('button', { name: 'Copiar código Pix', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Código Pix copiado', exact: true })).toHaveCount(0);
    await expect(page.locator('.checkout-copy [role="status"]')).toBeEmpty();
    await checkResponsive('pending-error');
    await page.locator('.checkout-footer summary').click();
    await expect(page.locator('.checkout-footer details p')).toBeVisible();
    await checkResponsive('payment-details');
    await page.locator('.checkout-footer details p').scrollIntoViewIfNeeded();
    console.log('PASS: always visible readonly Pix code equals persisted value; clipboard API success confirms on button; denied retry clears previous success and directs manual selection');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Gerar Pix', exact: true })).toHaveCount(0);
    await action(publicPayment.paymentId, 'complete');
    await page.getByRole('link', { name: 'Atualizar situação', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Pagamento confirmado', exact: true })).toBeVisible();
    await expect(page.getByText('Pagamento confirmado', { exact: true })).toHaveCount(1);
    await checkResponsive('paid');
    console.log('PASS: anonymous Playwright real submit at 390px, persisted QR/pending, reload prevents retry, callback paid visible');

    stage = 'additional public states';
    await action(publicPayment.paymentId, 'refund');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Pagamento reembolsado', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gerar Pix', exact: true })).toHaveCount(0);
    await checkResponsive('refunded');
    const expiredLink = await fixture('Synthetic expired checkout');
    await checkout.startCheckout(expiredLink.token, syntheticCpf());
    const [expiredPayment] = await history(expiredLink.id);
    // Explicit local fixture only: this tests rendering, not a gateway expiration event.
    await db.update(payments).set({ status: 'expired' }).where(eq(payments.id, expiredPayment.id));
    await page.goto(`http://app:3000/checkout/${expiredLink.token}`);
    await expect(page.getByRole('heading', { name: 'Pix expirado', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gerar Pix', exact: true })).toBeVisible();
    await checkResponsive('expired');
    stage = 'public recent creating';
    const generatingLink = await fixture('Synthetic generating checkout');
    // Future fixture timestamp keeps this recent while Next compiles the page.
    const [generatingAttempt] = await db.insert(checkoutAttempts).values({ checkoutId: generatingLink.id, externalId: randomUUID(), state: 'creating', createdAt: new Date(Date.now() + 60000) }).returning();
    await page.goto(`http://app:3000/checkout/${generatingLink.token}`);
    await expect(page.getByRole('heading', { name: 'Gerando seu Pix', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Atualizar situação', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /CPF ou CNPJ do pagador/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Gerar Pix|Tentar novamente/ })).toHaveCount(0);
    await db.update(checkoutAttempts).set({ createdAt: new Date(Date.now() - 16000) }).where(eq(checkoutAttempts.id, generatingAttempt.id));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Não foi possível gerar o Pix', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
    console.log('PASS: public recent creating shows generating/refresh without form; stale creating offers explicit retry');

    const uncertainLink = await fixture('Synthetic uncertain checkout');
    const [publicUnknown] = await db.insert(checkoutAttempts).values({ checkoutId: uncertainLink.id, externalId: randomUUID(), state: 'unknown' }).returning();
    await page.goto(`http://app:3000/checkout/${uncertainLink.token}`);
    await expect(page.getByRole('heading', { name: 'Não foi possível gerar o Pix', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
    await checkResponsive('uncertain');

    stage = 'public explicit retry without admin authorization';
    const releasedPublic = uncertainLink;
    const beforePublicRetry = await mockPayments();
    await page.getByRole('textbox', { name: /CPF ou CNPJ do pagador/ }).fill(syntheticCpf());
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Aguardando pagamento', exact: true })).toBeVisible();
    const [activePublic] = await history(releasedPublic.id);
    assert.equal((await history(releasedPublic.id)).length, 1);
    assert.equal((await mockPayments()).length, beforePublicRetry.length + 1);
    assert.equal((await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, releasedPublic.id))).length, 2);
    assert.deepEqual((await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.id, publicUnknown.id)))[0], publicUnknown);
    assert.deepEqual(await db.select().from(checkoutAttemptEvents).where(eq(checkoutAttemptEvents.attemptId, publicUnknown.id)), []);
    // Newer terminal fixture must not shadow an older active payment in the UI.
    await db.insert(payments).values({ campaignId: releasedPublic.campaignId, checkoutId: releasedPublic.id, externalId: randomUUID(), paymentId: randomUUID(), amountCents: releasedPublic.amountCents, status: 'expired', createdAt: new Date(Date.now() + 1000) });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Aguardando pagamento', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gerar Pix', exact: true })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Pix Copia e Cola', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Pix Copia e Cola', exact: true })).toHaveAttribute('readonly', '');
    await expect(page.getByRole('textbox', { name: 'Pix Copia e Cola', exact: true })).toHaveValue(activePublic.qrCode!);
    console.log('PASS: public unknown shows failure and empty form; anonymous real resubmit needs no authorization, preserves unknown and selects active payment over newer expired fixture');

    stage = 'public expired and unknown chronological precedence';
    for (const unknownIsNewer of [true, false]) {
      const state = unknownIsNewer ? 'expired-then-unknown' : 'unknown-then-expired';
      const precedenceLink = await fixture(`Synthetic ${state} checkout`);
      const older = new Date(Date.now() - 60000);
      const newer = new Date(Date.now() - 30000);
      const [terminal] = await db.insert(payments).values({ campaignId: precedenceLink.campaignId, checkoutId: precedenceLink.id, externalId: randomUUID(), paymentId: randomUUID(), amountCents: precedenceLink.amountCents, status: 'expired', createdAt: unknownIsNewer ? older : newer }).returning();
      const [unknown] = await db.insert(checkoutAttempts).values({ checkoutId: precedenceLink.id, externalId: randomUUID(), state: 'unknown', createdAt: unknownIsNewer ? newer : older }).returning();
      const remoteBefore = await mockPayments();
      await page.goto(`http://app:3000/checkout/${precedenceLink.token}`);
      const failedHeading = page.getByRole('heading', { name: 'Não foi possível gerar o Pix', exact: true });
      const expiredHeading = page.getByRole('heading', { name: 'Pix expirado', exact: true });
      await expect(unknownIsNewer ? failedHeading : expiredHeading).toBeVisible();
      await expect(unknownIsNewer ? expiredHeading : failedHeading).toHaveCount(0);
      await expect(page.getByRole('button', { name: unknownIsNewer ? 'Tentar novamente' : 'Gerar Pix', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Atualizar situação', exact: true })).toBeVisible();
      await checkResponsive(state);
      await page.reload();
      await expect(unknownIsNewer ? failedHeading : expiredHeading).toBeVisible();
      await expect(unknownIsNewer ? expiredHeading : failedHeading).toHaveCount(0);
      assert.deepEqual(await history(precedenceLink.id), [terminal]);
      assert.deepEqual(await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, precedenceLink.id)), [unknown]);
      assert.deepEqual(await mockPayments(), remoteBefore);
      assert.deepEqual(await db.select().from(checkoutAttemptEvents).where(eq(checkoutAttemptEvents.attemptId, unknown.id)), []);
    }
    console.log('PASS: newer unknown hides older expired; newer expired hides older unknown; mutually exclusive states survive reload without financial mutation');

    for (const alphanumeric of [false, true]) {
      const kind = alphanumeric ? 'alphanumeric' : 'numeric';
      stage = `public ${kind} CNPJ invalid submit`;
      const cnpjLink = await fixture(`Synthetic ${kind} CNPJ checkout`);
      const document = syntheticCnpj(alphanumeric);
      const invalid = document.slice(0, -1) + String((Number(document.at(-1)) + 1) % 10);
      payerDocuments.push(invalid);
      const remoteBefore = await mockPayments();
      await page.goto(`http://app:3000/checkout/${cnpjLink.token}`);
      const field = page.getByRole('textbox', { name: /CPF ou CNPJ do pagador/ });
      await expect(field).toHaveAttribute('name', 'cpf'); // Backward-compatible form payload.
      await field.fill(invalid);
      await page.getByRole('button', { name: 'Gerar Pix', exact: true }).click();
      stage = `public ${kind} CNPJ invalid response`;
      await expect(page.locator('.checkout-form [role="alert"]')).toHaveText('Informe um CPF ou CNPJ válido.');
      stage = `public ${kind} CNPJ invalid persistence`;
      assert.equal((await history(cnpjLink.id)).length, 0);
      assert.equal((await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, cnpjLink.id))).length, 0);
      assert.deepEqual(await mockPayments(), remoteBefore, 'Rejected document must not create a remote payment');

      stage = `public ${kind} CNPJ valid submit`;
      // Formatting and lowercase must normalize in the real server action.
      const formatted = `${document.slice(0, 2)}.${document.slice(2, 5)}.${document.slice(5, 8)}/${document.slice(8, 12)}-${document.slice(12)}`.toLowerCase();
      await field.fill(formatted);
      await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Aguardando pagamento', exact: true })).toBeVisible();
      await expect(page.getByRole('img', { name: 'QR Code para pagamento via Pix' })).toBeVisible();
      await expect(field).toHaveCount(0);
      const cnpjHistory = await history(cnpjLink.id);
      assert.equal(cnpjHistory.length, 1);
      assert.equal(cnpjHistory[0].status, 'pending');
      assert.equal(cnpjHistory[0].amountCents, cnpjLink.amountCents);
      assert.ok(cnpjHistory[0].qrCode);
      const cnpjAttempts = await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, cnpjLink.id));
      assert.equal(cnpjAttempts.length, 1);
      assert.equal(cnpjAttempts[0].state, 'registered');
      const remoteAfter = await mockPayments();
      assert.equal(remoteAfter.length, remoteBefore.length + 1);
      assert.equal(remoteAfter.filter(item => item.external_id === cnpjAttempts[0].externalId && item.payment_id === cnpjHistory[0].paymentId).length, 1);
      await page.reload();
      await expect(page.getByRole('button', { name: 'Gerar Pix', exact: true })).toHaveCount(0);
      assert.deepEqual(await history(cnpjLink.id), cnpjHistory);
      assertNoPayerDocuments(cnpjHistory);
      assertNoPayerDocuments(cnpjAttempts);
      assertNoPayerDocuments(remoteAfter);
      console.log(`PASS: synthetic ${kind} CNPJ real submit normalizes formatting/case; invalid check digit creates no attempt/payment; pending survives reload without retry`);
    }

    stage = 'paid campaign plus independent additional charge';
    const initial = await fixture('Synthetic campaign plus additional', 30000);
    await checkout.startCheckout(initial.token, syntheticCpf());
    const [initialPayment] = await history(initial.id);
    assert.equal(initialPayment.amountCents, 30000);
    await action(initialPayment.paymentId, 'complete');
    const originalPaid = await history(initial.id);
    assert.equal(originalPaid.length, 1);
    assert.equal(originalPaid[0].status, 'paid');
    assert.ok(originalPaid[0].paidAt instanceof Date);
    const originalAttempts = await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, initial.id));
    assert.equal(originalAttempts.length, 1);
    await assert.rejects(checkout.startCheckout(initial.token, syntheticCpf()));

    // No requestId: a fresh intention on the SAME campaign must create a new link,
    // even though its initial R$300 payment is already paid.
    const additional = await checkout.issueCheckout(initial.campaignId, 10000, 'Adicional de materiais');
    assert.notEqual(additional.id, initial.id);
    assert.notEqual(additional.token, initial.token);
    assert.equal(additional.amountCents, 10000);
    assert.equal(additional.description, 'Adicional de materiais');
    assert.equal(additional.campaignId, initial.campaignId);
    assert.equal((await db.select().from(checkoutLinks).where(eq(checkoutLinks.campaignId, initial.campaignId))).length, 2);
    assert.deepEqual(await checkout.issueCheckout(initial.campaignId, 10000, additional.description, additional.id), additional);
    assert.deepEqual(await checkout.getCheckout(initial.token), initial);
    const [unchangedCampaign] = await db.select().from(campaigns).where(eq(campaigns.id, initial.campaignId));
    assert.equal(unchangedCampaign.priceCents, 30000);

    await page.goto(`http://app:3000/checkout/${initial.token}`);
    await expect(page.getByRole('heading', { name: 'Pagamento confirmado', exact: true })).toBeVisible();
    await expect(page.getByText('Campanha', { exact: true })).toBeVisible();
    await expect(page.locator('.checkout-total strong')).toHaveText(/R\$\s*300,00/);
    await expect(page.getByRole('button', { name: 'Gerar Pix', exact: true })).toHaveCount(0);
    await page.goto(`http://app:3000/checkout/${additional.token}`);
    await expect(page.getByRole('heading', { name: initial.campaignName, exact: true })).toBeVisible();
    await expect(page.getByText(additional.description, { exact: true })).toBeVisible();
    await expect(page.locator('.checkout-total strong')).toHaveText(/R\$\s*100,00/);
    await expect(page.getByRole('heading', { name: 'Pagamento confirmado', exact: true })).toHaveCount(0);
    await page.getByRole('textbox', { name: /CPF ou CNPJ do pagador/ }).fill(syntheticCpf());
    await page.getByRole('button', { name: 'Gerar Pix', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Aguardando pagamento', exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: 'QR Code para pagamento via Pix' })).toBeVisible();
    const additionalHistory = await history(additional.id);
    assert.equal(additionalHistory.length, 1);
    const [additionalPayment] = additionalHistory;
    assert.equal(additionalPayment.amountCents, 10000);
    assert.equal(additionalPayment.status, 'pending');
    assert.equal(additionalPayment.paidAt, null);
    assert.notEqual(additionalPayment.paymentId, initialPayment.paymentId);
    const additionalAttempts = await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, additional.id));
    assert.equal(additionalAttempts.length, 1);
    assert.equal(additionalAttempts[0].state, 'registered');
    assert.notEqual(additionalAttempts[0].externalId, originalAttempts[0].externalId);
    assert.equal(additionalPayment.externalId, additionalAttempts[0].externalId);
    assert.deepEqual(await history(initial.id), originalPaid);
    assert.deepEqual(await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, initial.id)), originalAttempts);
    await assert.rejects(checkout.startCheckout(additional.token, syntheticCpf()));
    await page.reload();
    await expect(page.getByText(additional.description, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Aguardando pagamento', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gerar Pix', exact: true })).toHaveCount(0);
    assert.deepEqual(await history(additional.id), additionalHistory);
    console.log('PASS: paid R$300 campaign accepts independent R$100 additional; public descriptions/amounts and separate attempts; original snapshot/payment preserved');

    stage = 'payer document privacy';
    // Inspect full persisted rows (including receipts and retry audit), not merely typed columns.
    for (const table of [campaigns, checkoutLinks, checkoutAttempts, checkoutAttemptEvents, payments, webhookReceipts, publicationTasks]) {
      assertNoPayerDocuments(await db.select().from(table));
    }
    assertNoPayerDocuments(await mockPayments());
    console.log('PASS: synthetic payer documents and identity fields absent from domain rows, receipts and mock payment list');

    stage = 'no publication';
    for (const id of campaignIds) {
      const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
      assert.equal(campaign.preparationStatus, 'draft');
      assert.equal(campaign.publicationStatus, 'unpublished');
      assert.equal((await db.select().from(publicationTasks).where(eq(publicationTasks.campaignId, id))).length, 0);
    }
    console.log('PASS: all synthetic campaigns remain draft/unpublished, no publication tasks');
    stage = 'compact visual acceptance (financial and retry regressions completed)';
    if (visualFailures.length) console.log(`VISUAL NOT ACCEPTED:\n${visualFailures.join('\n')}`);
    assert.equal(visualFailures.length, 0, 'Compact visual acceptance failed; see CPF-free measurements.json and captures');
  } finally {
    await browser?.close();
    try {
      for (const id of campaignIds) {
        const rows = await db.select().from(payments).where(eq(payments.campaignId, id));
        for (const row of rows) await db.delete(webhookReceipts).where(eq(webhookReceipts.paymentId, row.paymentId));
        await db.delete(payments).where(eq(payments.campaignId, id));
        const links = await db.select().from(checkoutLinks).where(eq(checkoutLinks.campaignId, id));
        for (const link of links) {
          const attempts = await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, link.id));
          for (const attempt of attempts) await db.delete(checkoutAttemptEvents).where(eq(checkoutAttemptEvents.attemptId, attempt.id));
          await db.delete(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, link.id));
        }
        await db.delete(checkoutLinks).where(eq(checkoutLinks.campaignId, id));
        await db.delete(campaigns).where(eq(campaigns.id, id));
      }
      for (const table of [campaigns, checkoutLinks, checkoutAttempts, checkoutAttemptEvents, payments, webhookReceipts, publicationTasks]) {
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
