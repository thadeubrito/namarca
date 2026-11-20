import { randomBytes, randomUUID } from 'node:crypto';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { campaigns, checkoutAttempts, checkoutLinks, payments } from '@/db/schema';
import { getEnv } from './env';
import { z } from 'zod';
import { billingDescriptionInput } from './billing-input';
import { createPixgoClient, decimalToCents, nextPaymentStatus, verifyKnownPayment, isValidPayerDocument, type GatewayPayment } from './pixgo';

export const checkoutTokenValid = (token: string) => /^[a-f0-9]{64}$/.test(token);
export function requireMockCheckout() {
  if (getEnv().PIXGO_MODE !== 'mock' || new URL(getEnv().PIXGO_BASE_URL).hostname !== 'pixgo-mock') throw new Error('Checkout disponível apenas no simulador local.');
}
export async function issueCheckout(campaignId: string, amountCents?: number, description = 'Campanha', requestId: string = randomUUID()) {
  requireMockCheckout();
  return db.transaction(async tx => {
    const [campaign] = await tx.select().from(campaigns).where(eq(campaigns.id, campaignId)).for('update');
    if (!campaign) throw new Error('Campanha não encontrada.');
    if (!z.uuid().safeParse(requestId).success || !billingDescriptionInput.safeParse(description).success) throw new Error('Cobrança inválida.');
    // A mesma emissão é idempotente; uma nova intenção usa outro UUID.
    const [existing] = await tx.select().from(checkoutLinks).where(eq(checkoutLinks.id, requestId));
    if (existing) {
      if (existing.campaignId !== campaignId || existing.amountCents !== (amountCents ?? campaign.priceCents) || existing.description !== description.trim()) throw new Error('Emissão divergente.');
      return existing;
    }
    const amount = amountCents ?? campaign.priceCents;
    if (!amount || !Number.isSafeInteger(amount) || amount < 1000 || amount > 600000) throw new Error('Defina um valor entre R$ 10 e R$ 6.000 antes de emitir.');
    // Mantém o valor legado inicial; adicionais nunca sobrescrevem o preço da campanha.
    if (campaign.priceCents === null) await tx.update(campaigns).set({ priceCents: amount, updatedAt: new Date() }).where(eq(campaigns.id, campaignId));
    const [link] = await tx.insert(checkoutLinks).values({ id: requestId, campaignId, token: randomBytes(32).toString('hex'), campaignName: campaign.name, description: description.trim(), amountCents: amount }).returning();
    return link;
  });
}
export async function getCheckout(token: string) {
  if (!checkoutTokenValid(token)) return null;
  const [link] = await db.select().from(checkoutLinks).where(eq(checkoutLinks.token, token));
  return link ?? null;
}
export async function registerCheckoutPayment(attemptId: string, remote: GatewayPayment) {
  return db.transaction(async tx => {
    const [found] = await tx.select().from(checkoutAttempts).where(eq(checkoutAttempts.id, attemptId));
    if (!found) throw new Error('Tentativa não encontrada.');
    await tx.select().from(checkoutLinks).where(eq(checkoutLinks.id, found.checkoutId)).for('update');
    const [attempt] = await tx.select().from(checkoutAttempts).where(eq(checkoutAttempts.id, attemptId)).for('update');
    const [link] = await tx.select().from(checkoutLinks).where(eq(checkoutLinks.id, attempt.checkoutId));
    if (remote.externalId !== attempt.externalId || decimalToCents(remote.amount) !== link.amountCents) throw new Error('Cobrança divergente.');
    const [existing] = await tx.select().from(payments).where(eq(payments.externalId, attempt.externalId));
    if (existing) {
      verifyKnownPayment(existing, remote);
      await tx.update(checkoutAttempts).set({ state: 'registered' }).where(eq(checkoutAttempts.id, attempt.id));
      return;
    }
    const expiresAt = remote.expiresAt ? new Date(remote.expiresAt) : null;
    if (expiresAt && !Number.isFinite(expiresAt.getTime())) throw new Error('Expiração inválida.');
    await tx.insert(payments).values({ campaignId: link.campaignId, checkoutId: link.id, externalId: attempt.externalId, paymentId: remote.id, amountCents: link.amountCents, status: remote.status, paidAt: remote.status === 'paid' ? new Date() : null, qrCode: remote.qrCode ?? null, expiresAt });
    await tx.update(checkoutAttempts).set({ state: 'registered' }).where(eq(checkoutAttempts.id, attempt.id));
  });
}
export async function startCheckout(token: string, payerCpf: string) {
  requireMockCheckout();
  if (!isValidPayerDocument(payerCpf)) throw new Error('Documento inválido.');
  const link = await getCheckout(token);
  if (!link) throw new Error('Link não encontrado.');
  const attempt = await db.transaction(async tx => {
    await tx.select().from(checkoutLinks).where(eq(checkoutLinks.id, link.id)).for('update');
    const attempts = await tx.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, link.id));
    if (attempts.some(a => a.state === 'creating' && Date.now() - a.createdAt.getTime() < 15000)) throw new Error('A geração do Pix ainda está em andamento. Aguarde alguns instantes.');
    const history = await tx.select().from(payments).where(eq(payments.checkoutId, link.id));
    if (history.some(p => !['expired', 'cancelled'].includes(p.status))) throw new Error('Já existe uma cobrança. Atualize a página para consultar.');
    const [created] = await tx.insert(checkoutAttempts).values({ checkoutId: link.id, externalId: randomUUID(), state: 'creating' }).returning();
    return created;
  });
  try {
    const remote = await createPixgoClient().createPayment({ externalId: attempt.externalId, amountCents: link.amountCents, payerCpf });
    await registerCheckoutPayment(attempt.id, remote);
  } catch {
    await db.update(checkoutAttempts).set({ state: 'unknown' }).where(and(eq(checkoutAttempts.id, attempt.id), ne(checkoutAttempts.state, 'registered')));
    // Falha de resposta não prova ausência no provedor. Preserva unknown para callback tardio,
    // mas a política aprovada permite uma nova tentativa explícita do cliente.
    throw new Error('Não foi possível gerar o Pix. Tente novamente.');
  }
}
export async function reconcilePayment(id: string) {
  requireMockCheckout();
  const [known] = await db.select().from(payments).where(eq(payments.id, id));
  if (!known) throw new Error('Cobrança não encontrada.');
  const remote = await createPixgoClient().getPayment(known.paymentId);
  verifyKnownPayment(known, remote);
  await db.transaction(async tx => {
    const [locked] = await tx.select().from(payments).where(eq(payments.id, id)).for('update');
    const status = nextPaymentStatus(locked.status, remote.status);
    await tx.update(payments).set({ status, paidAt: status === 'paid' ? locked.paidAt ?? new Date() : locked.paidAt, updatedAt: new Date() }).where(eq(payments.id, id));
  });
}
