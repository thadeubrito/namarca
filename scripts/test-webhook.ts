import assert from "node:assert/strict";
import { createHmac, randomInt, randomUUID } from "node:crypto";

// Deliberately no DB/application imports before the local-only safety gate.
function localOnly() {
  assert.equal(process.env.NODE_ENV, "development", "Requires NODE_ENV=development");
  assert.equal(process.env.PIXGO_MODE, "mock", "Requires explicit PIXGO_MODE=mock");
  const database = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(database.protocol, "postgresql:", "Requires local PostgreSQL");
  assert.equal(database.hostname, "postgres", "Requires Docker postgres host");
  assert.ok(!database.port || database.port === "5432", "Requires local DB port");
  assert.equal(process.env.PIXGO_BASE_URL, "http://pixgo-mock:4010/api/v1", "Requires Docker PixGo mock URL");
  assert.equal(process.env.PIXGO_WEBHOOK_URL, "http://app:3000/api/webhooks/pixgo", "Requires Docker app callback");
  assert.ok(process.env.PIXGO_MOCK_DEV_TOKEN, "Requires local mock dev token");
  assert.ok(process.env.PIXGO_WEBHOOK_SECRET, "Requires local webhook signing secret");
}

function syntheticCpf(): string {
  const digits = Array.from({ length: 9 }, () => randomInt(10));
  for (const length of [9, 10]) {
    const remainder = digits.reduce((sum, digit, i) => sum + digit * (length + 1 - i), 0) * 10 % 11;
    digits.push(remainder === 10 ? 0 : remainder);
  }
  const value = digits.join("");
  return /^(\d)\1+$/.test(value) ? syntheticCpf() : value;
}

let stage = "local safety gate";
async function main() {
  localOnly();
  stage = "module imports";
  const [{ db, pool }, { campaigns, payments, webhookReceipts }, { eq }, { createPixgoClient, isValidCpf }] = await Promise.all([
    import("../src/db"), import("../src/db/schema"), import("drizzle-orm"), import("../src/lib/pixgo"),
  ]);
  const campaignId = randomUUID();
  const paymentRowId = randomUUID();
  const externalId = `webhook-test-${randomUUID()}`;
  const amountCents = 4321;
  let gatewayId: string | undefined;
  let mockCreated = false;
  const callback = "http://app:3000/api/webhooks/pixgo";

  async function send(raw: string, validSignature: boolean) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = validSignature
      ? createHmac("sha256", process.env.PIXGO_WEBHOOK_SECRET!).update(`${timestamp}.${raw}`).digest("hex")
      : "0".repeat(64);
    return fetch(callback, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(60_000),
      headers: { "content-type": "application/json", "x-webhook-timestamp": timestamp, "x-webhook-signature": signature },
      body: raw,
    });
  }
  async function snapshot() {
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentRowId));
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
    const receipts = gatewayId ? await db.select().from(webhookReceipts).where(eq(webhookReceipts.paymentId, gatewayId)) : [];
    receipts.sort((a, b) => a.eventId.localeCompare(b.eventId));
    return { payment, campaign, receipts };
  }
  async function action(name: "complete" | "refund") {
    const response = await fetch(`http://pixgo-mock:4010/__dev/payments/${gatewayId}/${name}`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { "X-Dev-Token": process.env.PIXGO_MOCK_DEV_TOKEN! },
    });
    assert.equal(response.status, 200, `Mock ${name} must deliver callback end to end`);
    const result = await response.json();
    assert.equal(result.success, true, `Mock ${name} accepted`);
    assert.equal(result.webhook_delivered, true, `Mock ${name} callback delivered`);
  }
  function event(status: "completed" | "refunded", cents = amountCents) {
    return JSON.stringify({ event: `payment.${status}`, timestamp: new Date().toISOString(), data: {
      payment_id: gatewayId, external_id: externalId, amount: cents / 100, status,
    } });
  }

  try {
    // Warm the real Next route before the mock's deliberately short callback timeout.
    stage = "warm HTTP route";
    assert.equal((await send("{}", false)).status, 401, "Unsigned callback rejected");
    const cpf = syntheticCpf();
    assert.ok(isValidCpf(cpf), "Generated synthetic CPF must validate");
    stage = "create mock payment";
    const remote = await createPixgoClient().createPayment({ externalId, amountCents, payerCpf: cpf });
    gatewayId = remote.id;
    mockCreated = true;
    assert.equal(remote.status, "pending", "Mock starts pending");
    assert.equal(remote.amount, "43.21", "Known amount round trips exactly");
    await db.insert(campaigns).values({ id: campaignId, name: "Webhook integration fixture", slug: externalId, endsAt: new Date(Date.now() + 86_400_000), priceCents: amountCents });
    await db.insert(payments).values({ id: paymentRowId, campaignId, externalId, paymentId: gatewayId, amountCents });
    const pending = await snapshot();
    assert.equal(pending.payment.status, "pending");
    assert.equal(pending.receipts.length, 0);

    assert.equal((await send(event("completed"), false)).status, 401, "Invalid signature rejected");
    assert.deepEqual(await snapshot(), pending, "Invalid signature must not mutate payment, campaign or receipts");
    assert.equal((await send(event("completed", amountCents + 1), true)).status, 422, "Signed amount mismatch rejected");
    assert.deepEqual(await snapshot(), pending, "Amount mismatch must not mutate payment, campaign or receipts");
    console.log("PASS: invalid signature and signed amount mismatch leave all fixture state unchanged");

    stage = "complete callback and paid assertions";
    await action("complete");
    const paid = await snapshot();
    assert.equal(paid.payment.status, "paid", "Payment is paid immediately after callback, without worker/cron");
    assert.ok(paid.payment.paidAt instanceof Date, "Payment records paidAt");
    assert.equal(paid.campaign.publicationStatus, "unpublished", "Payment does not publish campaign");
    assert.equal(paid.receipts.length, 1, "Exactly one receipt");
    assert.ok(paid.receipts[0].dispatchedAt instanceof Date, "Receipt processed synchronously (dispatchedAt)");
    console.log("PASS: mock completion callback synchronously marks paid and receipt processed; campaign stays unpublished");

    stage = "duplicate completion";
    await action("complete");
    assert.deepEqual(await snapshot(), paid, "Duplicate callback must not add receipts or modify state/timestamps");
    const duplicate = await send(event("completed"), true);
    assert.equal(duplicate.status, 200);
    assert.deepEqual(await duplicate.json(), { status: "duplicate" }, "Route explicitly acknowledges duplicate");
    assert.deepEqual(await snapshot(), paid, "Explicit duplicate is also a no-op");
    console.log("PASS: repeated mock callback and signed duplicate are idempotent (one receipt)");

    stage = "refund callback and assertions";
    await action("refund");
    const refunded = await snapshot();
    assert.equal(refunded.payment.status, "refunded", "Refund applied synchronously, without worker/cron");
    assert.deepEqual(refunded.payment.paidAt, paid.payment.paidAt, "Refund preserves paidAt history");
    assert.equal(refunded.campaign.publicationStatus, "unpublished");
    assert.equal(refunded.receipts.length, 2, "Completion and refund each have one receipt");
    assert.ok(refunded.receipts.every(receipt => receipt.dispatchedAt instanceof Date), "All receipts processed");
    await action("refund");
    assert.deepEqual(await snapshot(), refunded, "Duplicate refund is a no-op");
    console.log("PASS: refund immediately marks refunded; two processed receipts; duplicate refund is a no-op");
  } finally {
    try {
      // Delete only this run's UUID-scoped fixtures, in foreign-key order.
      if (gatewayId) await db.delete(webhookReceipts).where(eq(webhookReceipts.paymentId, gatewayId));
      await db.delete(payments).where(eq(payments.id, paymentRowId));
      await db.delete(campaigns).where(eq(campaigns.id, campaignId));
      assert.equal((await db.select().from(payments).where(eq(payments.id, paymentRowId))).length, 0);
      assert.equal((await db.select().from(campaigns).where(eq(campaigns.id, campaignId))).length, 0);
      if (gatewayId) assert.equal((await db.select().from(webhookReceipts).where(eq(webhookReceipts.paymentId, gatewayId))).length, 0);
      console.log("CLEANUP: only this run's database fixtures removed and absence verified");
    } finally {
      await pool.end();
      if (mockCreated) console.log("LIMITATION: local mock has no DELETE endpoint; one synthetic payment remains in its local volume (no CPF stored by mock)");
    }
  }
}

main().catch(() => {
  // Never print provider responses, connection strings, CPF, secrets or raw payloads.
  console.error(`FAIL: webhook integration at ${stage}; no sensitive details logged`);
  process.exitCode = 1;
});
