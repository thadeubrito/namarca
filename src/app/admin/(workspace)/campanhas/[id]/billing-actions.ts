'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { issueCheckout, reconcilePayment, requireMockCheckout } from '@/lib/checkout';
import { billingAmountInput, billingDescriptionInput } from '@/lib/billing-input';
export type BillingState = { error?: string; success?: string; issuedId?: string };
export async function billingAction(id: string, _state: BillingState, form: FormData): Promise<BillingState> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { error: 'Identificador inválido.' };
  const operation = form.get('operation');
  try {
    requireMockCheckout();
    if (form.get('operation') === 'issue') {
      const amount = billingAmountInput.safeParse(form.get('amount'));
      if (!amount.success) return { error: amount.error.issues[0].message };
      const description = billingDescriptionInput.safeParse(form.get('description'));
      const requestId = z.uuid().safeParse(form.get('requestId'));
      if (!description.success) return { error: 'Informe uma descrição de até 120 caracteres.' };
      if (!requestId.success) return { error: 'Recarregue a página para emitir a cobrança.' };
      const link = await issueCheckout(id, amount.data, description.data, requestId.data);
      revalidatePath('/', 'layout');
      return { issuedId: link.id };
    } else if (form.get('operation') === 'reconcile') await reconcilePayment(id);
    else return { error: 'Operação inválida.' };
  } catch {
    if (operation === 'reconcile') return { error: 'Não foi possível atualizar a situação do pagamento. Tente consultar novamente em instantes.' };
    return { error: 'Não foi possível emitir o link de cobrança. Tente novamente; o mesmo envio não cria uma cobrança duplicada.' };
  }
  revalidatePath('/', 'layout');
  return { success: 'Situação consultada.' };
}
