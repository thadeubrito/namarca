'use server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { issueCheckout, reconcilePayment, registerCheckoutPayment, requireMockCheckout } from '@/lib/checkout';
import { db } from '@/db';
import { checkoutAttempts } from '@/db/schema';
import { createPixgoClient } from '@/lib/pixgo';
import { billingAmountInput } from '@/lib/billing-input';
export type BillingState = { error?: string; success?: string };
export async function billingAction(id: string, _state: BillingState, form: FormData): Promise<BillingState> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { error: 'Identificador inválido.' };
  try {
    requireMockCheckout();
    if (form.get('operation') === 'issue') {
      const amount = billingAmountInput.safeParse(form.get('amount'));
      if (!amount.success) return { error: amount.error.issues[0].message };
      await issueCheckout(id, amount.data);
    } else if (form.get('operation') === 'recover') {
      const [attempt] = await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.id, id));
      if (!attempt) return { error: 'Tentativa não encontrada.' };
      if (Date.now() - attempt.createdAt.getTime() < 15000) return { error: 'Aguarde a criação em andamento antes de consultar.' };
      await registerCheckoutPayment(id, await createPixgoClient().findMockPayment(attempt.externalId));
    } else if (form.get('operation') === 'reconcile') await reconcilePayment(id);
    else return { error: 'Operação inválida.' };
  } catch { return { error: 'Não foi possível concluir. Confira o valor (R$ 10–6.000) e tente consultar novamente. Se a criação estiver em verificação, não emita outra cobrança até confirmar o resultado na PixGo.' }; }
  revalidatePath('/admin', 'layout');
  return { success: 'Consulta ou emissão concluída.' };
}
