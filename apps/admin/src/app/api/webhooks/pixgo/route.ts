import { eq } from "drizzle-orm";
import { db } from "../../../../db";
import { payments, webhookReceipts, checkoutAttempts } from "../../../../db/schema";
import { getEnv } from "../../../../lib/env";
import { createPixgoClient, nextPaymentStatus, verifyKnownPayment, verifyWebhookSignature, webhookSchema } from "../../../../lib/pixgo";

import { registerCheckoutPayment, requireMockCheckout } from '@/lib/checkout';

export const runtime = "nodejs";
const MAX_BODY = 16_384;
export async function POST(request: Request) {
  // Enforce the limit while streaming; do not buffer arbitrary unauthenticated payloads.
  let raw: string;
  try {
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "invalid_body" }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); return Response.json({ error: "body_too_large" }, { status: 413 }); }
      chunks.push(value);
    }
    raw = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } catch { return Response.json({ error: "invalid_body" }, { status: 400 }); }
  try {
    if (!verifyWebhookSignature(raw, request.headers.get("x-webhook-timestamp"), request.headers.get("x-webhook-signature"), getEnv().PIXGO_WEBHOOK_SECRET)) {
      return Response.json({ error: "invalid_signature" }, { status: 401 });
    }
    let payload;
    try { payload = webhookSchema.parse(JSON.parse(raw)); }
    catch { return Response.json({ error: "invalid_event" }, { status: 400 }); }
    const headerEvent = request.headers.get("x-webhook-event");
    if (headerEvent && headerEvent !== payload.event) return Response.json({ error: "invalid_event" }, { status: 400 });
    let [known] = await db.select().from(payments).where(eq(payments.paymentId, payload.payment.id)).limit(1);
    const [attempt] = !known ? await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.externalId, payload.payment.externalId)) : [];
    if (!known && !attempt) return Response.json({ error: 'unknown_payment' }, { status: 422 });
    const remote = await createPixgoClient().getPayment(payload.payment.id);
    if (!known && attempt) {
      requireMockCheckout();
      // A signed callback may arrive before createPayment returns. Confirm against the gateway first.
      if (remote.id !== payload.payment.id || remote.externalId !== payload.payment.externalId || remote.amount !== payload.payment.amount) return Response.json({ error: 'payment_mismatch' }, { status: 422 });
      await registerCheckoutPayment(attempt.id, remote);
      [known] = await db.select().from(payments).where(eq(payments.paymentId, remote.id)).limit(1);
    }
    try { verifyKnownPayment(known, payload.payment); verifyKnownPayment(known, remote); }
    catch { return Response.json({ error: "payment_mismatch" }, { status: 422 }); }
    const result = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(payments).where(eq(payments.id, known.id)).for("update");
      verifyKnownPayment(locked, remote);
      // Receipt and financial state are committed together; nothing is deferred.
      const [receipt] = await tx.insert(webhookReceipts).values({ eventId: payload.eventId, paymentId: known.paymentId, dispatchedAt: new Date() }).onConflictDoNothing().returning();
      if (!receipt) {
        const [existing] = await tx.select().from(webhookReceipts).where(eq(webhookReceipts.eventId, payload.eventId));
        if (existing.paymentId !== known.paymentId) return "conflict";
        // Also finish receipts accepted before background processing was removed.
        if (existing.dispatchedAt) return "duplicate";
        await tx.update(webhookReceipts).set({ dispatchedAt: new Date() }).where(eq(webhookReceipts.id, existing.id));
      }
      const status = nextPaymentStatus(locked.status, remote.status);
      await tx.update(payments).set({ status, paidAt: status === "paid" ? locked.paidAt ?? new Date() : locked.paidAt, updatedAt: new Date() }).where(eq(payments.id, locked.id));
      return "accepted";
    });
    if (result === "conflict") return Response.json({ error: "event_conflict" }, { status: 409 });
    // Payment is already persisted. Publication is not implemented in this base.
    return Response.json({ status: result }, { status: 200 });
  } catch {
    return Response.json({ error: "temporarily_unavailable" }, { status: 503 });
  }
}
