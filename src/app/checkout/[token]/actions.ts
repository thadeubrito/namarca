'use server';
import { revalidatePath } from 'next/cache';
import { getCheckout, startCheckout, requireMockCheckout } from '@/lib/checkout';
import { isValidPayerDocument, normalizePayerDocument } from '@/lib/pixgo';
export async function generatePix(token: string, _state: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const cpf = normalizePayerDocument(String(form.get('cpf') ?? ''));
  if (!isValidPayerDocument(cpf)) return { error: 'Informe um CPF ou CNPJ válido.' };
  try { requireMockCheckout(); if (!await getCheckout(token)) return { error: 'Link não encontrado.' }; await startCheckout(token, cpf); }
  catch {
    revalidatePath(`/checkout/${token}`);
    return { error: 'Não foi possível gerar o Pix. Tente novamente. Se já pagou, atualize a situação antes de continuar.' };
  }
  revalidatePath(`/checkout/${token}`);
  return {};
}
