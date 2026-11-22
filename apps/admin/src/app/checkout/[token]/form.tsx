'use client';
import { useActionState } from 'react';
import { generatePix } from './actions';
export function CheckoutForm({ token, retry = false }: { token: string; retry?: boolean }) {
  const [state, action, pending] = useActionState(generatePix.bind(null, token), {});
  return <form action={action} className="stack checkout-form" aria-busy={pending} autoComplete="off">
    <label>CPF ou CNPJ do pagador<input name="cpf" type="text" maxLength={18} autoCapitalize="characters" spellCheck={false} required disabled={pending} aria-describedby="checkout-cpf-hint" autoComplete="off" placeholder="CPF ou CNPJ" /></label>
    <p className="muted" id="checkout-cpf-hint">Faça o Pix de uma conta vinculada ao CPF ou CNPJ informado.</p>
    <button className="button" disabled={pending}>{pending ? 'Gerando Pix…' : retry || state.error ? 'Tentar novamente' : 'Gerar Pix'}</button>
    {state.error && <p className="error" role="alert">{state.error}</p>}
  </form>;
}
