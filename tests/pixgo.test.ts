import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { centsToDecimal, decimalToCents, createPaymentSchema, numberAmountToCents, paymentResponseSchema, createPixgoClient, verifyKnownPayment, verifyWebhookSignature, webhookSchema } from "../src/lib/pixgo";

test("exact decimal amounts without binary floating point rounding", () => {
  for (const cents of [1, 10, 99, 100, 1050, 2147483647]) assert.equal(decimalToCents(centsToDecimal(cents)), cents);
  for (const amount of ["1", "1.1", "1.001", "1e2", "-1.00", "0.00", "01.00", "21474836.48", "NaN", "Infinity"]) assert.throws(() => decimalToCents(amount));
  for (const cents of [0, -1, 1.1, Infinity, NaN, 2147483648]) assert.throws(() => centsToDecimal(cents));
});
test("HMAC validates raw bytes, window, and strict hex lengths", () => {
  const raw = '{"id":"evt-1","paymentId":"pay-1"}';
  const timestamp = "1770000000";
  const secret = "test-secret-minimum-16";
  const sign = (value: string) => createHmac("sha256", secret).update(`${timestamp}.${value}`).digest("hex");
  const now = Number(timestamp) * 1000;
  assert.equal(verifyWebhookSignature(raw, timestamp, sign(raw), secret, now), true);
  assert.equal(verifyWebhookSignature(raw, timestamp, sign(raw).toUpperCase(), secret, now), true);
  assert.equal(verifyWebhookSignature(raw + " ", timestamp, sign(raw), secret, now), false);
  for (const signature of ["ff", "g".repeat(64), "a".repeat(63), "a".repeat(66), "", null]) assert.equal(verifyWebhookSignature(raw, timestamp, signature, secret, now), false);
  assert.equal(verifyWebhookSignature(raw, timestamp, sign(raw), secret, now + 300001), false);
  assert.equal(verifyWebhookSignature(raw, timestamp, sign(raw), secret, now - 300001), false);
  assert.equal(verifyWebhookSignature(raw, "1770000000.1", sign(raw), secret, now), false);
});
test("requests validated and webhook extra fields discarded", () => {
  assert.equal(createPaymentSchema.safeParse({ externalId: "attempt-1", amountCents: 1000, payerCpf: "52998224725" }).success, true);
  for (const payerCpf of ["11111111111", "52998224726", "invalid"]) assert.equal(createPaymentSchema.safeParse({ externalId: "a", amountCents: 1000, payerCpf }).success, false);
  assert.equal(createPaymentSchema.safeParse({ externalId: "a", amountCents: 999, payerCpf: "52998224725" }).success, false);
  const event = { event: "payment.completed", timestamp: "2026-01-01T00:00:00Z", data: { payment_id: "pay", external_id: "a", amount: 10, status: "completed", customer: { cpf: "never" } } };
  const parsed = webhookSchema.parse(event);
  assert.equal(parsed.payment.status, "paid");
  assert.equal(JSON.stringify(parsed).includes("never"), false);
  assert.equal(webhookSchema.parse({ ...event, timestamp: "2026-02-01T00:00:00Z" }).eventId, parsed.eventId);
  assert.equal(webhookSchema.safeParse({ ...event, event: "payment.refunded" }).success, false);
});
test("numeric gateway amounts and wrapper normalize without payer identity", () => {
  assert.equal(numberAmountToCents(25.50), 2550);
  assert.equal(numberAmountToCents(0.29), 29);
  for (const amount of [10.001, NaN, Infinity, 0, -1]) assert.throws(() => numberAmountToCents(amount));
  const normalized = paymentResponseSchema.parse({ success: true, data: { payment_id: "pay", external_id: "a", amount: 10, status: "refunded", customer_cpf: "secret", qr_code: "qr", expires_at: "2026-01-01T00:00:00" } });
  assert.equal(normalized.status, "refunded");
  assert.equal(normalized.amount, "10.00");
  assert.equal(JSON.stringify(normalized).includes("secret"), false);
});

test("adapter integrates with local mock HTTP server", async () => {
  // Import plain JS mock inside this test, never contact the live provider.
  const { createMock } = await import("../services/pixgo-mock/server.mjs");
  const key = "local-test-secret-123456";
  let delivered: { raw: string; headers: Record<string, string> } | undefined;
  const mockOptions = { apiKey: key, webhookSecret: key, devToken: key, deliver: (async (_url, init) => {
    delivered = { raw: String(init?.body), headers: Object.fromEntries(new Headers(init?.headers).entries()) };
    return new Response("ok");
  }) as typeof fetch };
  const server = await createMock(mockOptions);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const previous = { ...process.env };
  Object.assign(process.env, { DATABASE_URL: "postgresql://unused", S3_ACCESS_KEY_ID: key, S3_SECRET_ACCESS_KEY: key, PIXGO_API_KEY: key, PIXGO_WEBHOOK_SECRET: key, PIXGO_BASE_URL: `${base}/api/v1`, PIXGO_MODE: "mock", PIXGO_WEBHOOK_URL: "http://app:3000/api/webhooks/pixgo" });
  try {
    const client = createPixgoClient();
    const payment = await client.createPayment({ externalId: "test-attempt", amountCents: 1050, payerCpf: "52998224725" });
    assert.equal(payment.amount, "10.50");
    assert.equal(payment.status, "pending");
    assert.equal((await client.getPayment(payment.id)).externalId, "test-attempt");
    for (const [action, status] of [["complete", "paid"], ["refund", "refunded"]] as const) {
      const response = await fetch(`${base}/__dev/payments/${payment.id}/${action}`, { method: "POST", headers: { "x-dev-token": key } });
      assert.equal(response.status, 200);
      assert.equal((await client.getPayment(payment.id)).status, status);
      assert.ok(delivered);
      assert.equal(verifyWebhookSignature(delivered.raw, delivered.headers["x-webhook-timestamp"], delivered.headers["x-webhook-signature"], key), true);
      assert.equal(webhookSchema.parse(JSON.parse(delivered.raw)).payment.status, status);
      assert.equal(delivered.raw.includes("52998224725"), false);
    }
    const expires = await client.createPayment({ externalId: "expires", amountCents: 1000, payerCpf: "52998224725" });
    assert.equal((await fetch(`${base}/__dev/payments/${expires.id}/expire`, { method: "POST", headers: { "x-dev-token": key } })).status, 200);
    assert.equal((await client.getPayment(expires.id)).status, "expired");
  } finally {
    process.env = previous;
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("server payment must match all persisted identifiers and amount", () => {
  const known = { paymentId: "pay", externalId: "attempt", amountCents: 100 };
  const remote = { id: "pay", externalId: "attempt", amount: "1.00", status: "paid" as const };
  assert.doesNotThrow(() => verifyKnownPayment(known, remote));
  for (const changed of [{ ...remote, id: "other" }, { ...remote, externalId: "other" }, { ...remote, amount: "2.00" }]) assert.throws(() => verifyKnownPayment(known, changed));
});
