'use server';
import { revalidatePath } from 'next/cache';
import { getCheckout, startCheckout, requireMockCheckout } from '@/lib/checkout';
import { isValidCpf } from '@/lib/pixgo';
export async function generatePix(token: string, _state: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const cpf = String(form.get('cpf') ?? '').replace(/[.\-\s]/g, '');
  if (!isValidCpf(cpf)) return { error: 'Informe um CPF válido. CNPJ ainda não é suportado.' };
  if (form.get('consent') !== 'on') return { error: 'Confirme que está ciente das condições de processamento pela PixGo.' };
  try { requireMockCheckout(); if (!await getCheckout(token)) return { error: 'Link não encontrado.' }; await startCheckout(token, cpf); }
  catch { return { error: 'Não foi possível gerar ou já existe uma tentativa. Atualize a página. Se a criação estiver em verificação, peça ao administrador para consultar; não gere outro Pix.' }; }
  revalidatePath(`/checkout/${token}`);
  return {};
}
