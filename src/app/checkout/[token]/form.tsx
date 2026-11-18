'use client';
import { useActionState } from 'react';
import { generatePix } from './actions';
export function CheckoutForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(generatePix.bind(null, token), {});
  return <form action={action} className="stack" autoComplete="off">
    <label>CPF do pagador<input name="cpf" inputMode="numeric" maxLength={14} required autoComplete="off" placeholder="000.000.000-00" /></label>
    <p className="muted">Informe o CPF de quem fará o Pix. O documento é enviado à PixGo para processar o pagamento e não fica armazenado na Namarca. Pagamento com CNPJ ainda não está disponível.</p>
    <label className="checkout-consent"><input type="checkbox" name="consent" required /><span>Estou ciente de que o pagamento pela PixGo envolve conversão/compra de stablecoins e recebimento em DePix pelo recebedor.</span></label>
    <button className="button" disabled={pending}>{pending ? 'Gerando Pix…' : 'Gerar Pix'}</button>
    {state.error && <p className="error" role="alert">{state.error}</p>}
  </form>;
}
