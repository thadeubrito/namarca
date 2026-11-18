import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getEnv } from "./env";

const MAX_CENTS = 2_147_483_647;
export function centsToDecimal(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_CENTS) throw new Error("Invalid amount");
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
export function decimalToCents(amount: string): number {
  if (!/^(0|[1-9]\d*)\.\d{2}$/.test(amount)) throw new Error("Amount must be an exact decimal string");
  const [whole, fraction] = amount.split(".");
  const value = BigInt(whole) * 100n + BigInt(fraction);
  if (value <= 0n || value > BigInt(MAX_CENTS)) throw new Error("Invalid amount");
  return Number(value);
}
export function numberAmountToCents(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_CENTS / 100) throw new Error("Invalid gateway amount");
  const decimal = amount.toFixed(2);
  if (Number(decimal) !== amount) throw new Error("Gateway amount has fractional cents");
  return decimalToCents(decimal);
}
export function isValidCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  for (const length of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(value[i]) * (length + 1 - i);
    const digit = (sum * 10) % 11;
    if ((digit === 10 ? 0 : digit) !== Number(value[length])) return false;
  }
  return true;
}
const identifier = z.string().min(1).max(200).regex(/^[a-zA-Z0-9_.:-]+$/);
export const createPaymentSchema = z.object({
  externalId: identifier.max(50),
  amountCents: z.number().int().min(1000).max(600000),
  payerCpf: z.string().refine(isValidCpf, "Invalid payer document"),
}).strict();
const remoteStatus = z.enum(["pending", "completed", "expired", "cancelled", "canceled", "refunded"]);
const remoteDataSchema = z.object({
  payment_id: identifier,
  external_id: identifier,
  amount: z.number().refine((v) => { try { numberAmountToCents(v); return true; } catch { return false; } }),
  status: remoteStatus,
  qr_code: z.string().max(100_000).optional(),
  expires_at: z.string().max(64).optional(),
});
export type GatewayPayment = {
  id: string; externalId: string; amount: string;
  status: "pending" | "paid" | "expired" | "cancelled" | "refunded";
  qrCode?: string; expiresAt?: string;
};
function normalizePayment(data: z.infer<typeof remoteDataSchema>): GatewayPayment {
  return {
    id: data.payment_id, externalId: data.external_id,
    amount: centsToDecimal(numberAmountToCents(data.amount)),
    status: data.status === "completed" ? "paid" : data.status === "canceled" ? "cancelled" : data.status,
    ...(data.qr_code !== undefined ? { qrCode: data.qr_code } : {}),
    ...(data.expires_at !== undefined ? { expiresAt: data.expires_at } : {}),
  };
}
const responseEnvelopeSchema = z.object({ success: z.boolean(), data: remoteDataSchema });
export const paymentResponseSchema = responseEnvelopeSchema.transform((response) => normalizePayment(response.data));
export const webhookSchema = z.object({
  event: z.enum(["payment.completed", "payment.expired", "payment.refunded", "payment.cancelled", "payment.canceled"]),
  timestamp: z.iso.datetime({ offset: true }),
  data: remoteDataSchema,
}).superRefine((value, context) => {
  if (value.event !== `payment.${value.data.status}`) context.addIssue({ code: "custom", message: "Event and status mismatch" });
}).transform((value) => ({
  event: value.event,
  timestamp: value.timestamp,
  // Gateway has no unique delivery ID. State transitions are deduplicated per payment.
  eventId: createHash("sha256").update(`${value.data.payment_id}:${value.event}`).digest("hex"),
  payment: normalizePayment(value.data),
}));
export function verifyWebhookSignature(rawBody: string, timestamp: string | null, signature: string | null, secret: string, nowMs = Date.now()): boolean {
  if (!timestamp || !/^\d{10}$/.test(timestamp) || !signature || !/^[a-fA-F0-9]{64}$/.test(signature) || !secret) return false;
  if (Math.abs(nowMs - Number(timestamp) * 1000) > 300_000) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && timingSafeEqual(expected, actual);
}
export function verifyKnownPayment(known: { paymentId: string; externalId: string; amountCents: number }, remote: GatewayPayment): void {
  if (known.paymentId !== remote.id || known.externalId !== remote.externalId || known.amountCents !== decimalToCents(remote.amount)) throw new Error("Payment reconciliation mismatch");
}
export function nextPaymentStatus(current: GatewayPayment["status"], incoming: GatewayPayment["status"]): GatewayPayment["status"] {
  if (current === "refunded" || incoming === "refunded") return "refunded";
  if (current === "paid" || incoming === "paid") return "paid";
  if (current !== "pending") return current;
  return incoming;
}

export function createPixgoClient() {
  const env = getEnv();
  async function request(path: string, init?: RequestInit): Promise<GatewayPayment> {
    const response = await fetch(`${env.PIXGO_BASE_URL.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "X-API-Key": env.PIXGO_API_KEY, ...init?.headers },
      signal: AbortSignal.timeout(4000), cache: "no-store", redirect: "error",
    });
    if (!response.ok && response.status !== 410) throw new Error(`PixGo request failed (${response.status})`);
    // Never propagate response bodies, payer identity, or Zod errors containing input.
    let parsed;
    try { parsed = responseEnvelopeSchema.safeParse(await response.json()); }
    catch { throw new Error("Invalid PixGo response"); }
    if (!parsed.success) throw new Error("Invalid PixGo response");
    const payment = normalizePayment(parsed.data.data);
    if (response.status === 410 && !["expired", "cancelled", "refunded"].includes(payment.status)) throw new Error("Invalid terminal PixGo response");
    if (response.status !== 410 && !parsed.data.success) throw new Error("PixGo rejected request");
    return payment;
  }
  return {
    mode: env.PIXGO_MODE,
    createPayment: async (input: z.input<typeof createPaymentSchema>) => {
      const parsed = createPaymentSchema.safeParse(input);
      if (!parsed.success) throw new Error("Invalid payment request");
      const data = parsed.data;
      // Provider does NOT document Idempotency-Key semantics. Never automatically retry POST.
      const payment = await request("/payment/create", { method: "POST", body: JSON.stringify({ external_id: data.externalId, amount: Number(centsToDecimal(data.amountCents)), receiver_cpf: data.payerCpf, webhook_url: env.PIXGO_WEBHOOK_URL }) });
      verifyKnownPayment({ paymentId: payment.id, externalId: data.externalId, amountCents: data.amountCents }, payment);
      return payment;
    },
    getPayment: (id: string) => request(`/payment/${encodeURIComponent(identifier.parse(id))}/status`),
  };
}
