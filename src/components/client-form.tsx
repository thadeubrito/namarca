'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { saveClient, type ClientState } from '@/app/admin/clientes/actions';

export function ClientForm({ client }: { client?: { id: string; name: string; contact: string } }) {
  const [state, action, pending] = useActionState<ClientState, FormData>(saveClient.bind(null, client?.id ?? null), {});
  return <form action={action} className="panel stack">
    <label>Nome do cliente<input name="name" required minLength={2} maxLength={160} defaultValue={client?.name ?? ''} autoComplete="organization" /></label>
    <label>Contato <small>Opcional · e-mail ou WhatsApp</small><input name="contact" maxLength={254} defaultValue={client?.contact ?? ''} /></label>
    {client && <p className="muted">As alterações serão vistas em todas as campanhas vinculadas a este cliente. Valores e cobranças já emitidas não mudam.</p>}
    {state.error && <p role="alert">{state.error}</p>}
    <div className="actions"><button className="button" disabled={pending}>{pending ? 'Salvando…' : client ? 'Salvar cliente' : 'Cadastrar cliente'}</button><Link href="/admin/clientes">Voltar para clientes</Link></div>
  </form>;
}
