'use client';
import { useActionState, useState } from 'react';
import { billingAction, type BillingState } from '@/app/admin/campanhas/[id]/billing-actions';
export function BillingButton({ id, operation, children }: { id: string; operation: string; children: React.ReactNode }) {
  const [state, action, pending] = useActionState<BillingState, FormData>(billingAction.bind(null, id), {});
  return <form action={action}><input type="hidden" name="operation" value={operation} /><button className="button secondary" disabled={pending}>{pending ? 'Processando…' : children}</button>{state.error && <p role="alert">{state.error}</p>}{state.success && <p role="status">{state.success}</p>}</form>;
}
export function CopyCheckout({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return <div className="stack"><a href={path} target="_blank" rel="noreferrer">Abrir checkout</a><button className="button secondary" onClick={async () => { try { await navigator.clipboard.writeText(new URL(path, window.location.origin).href); setCopied(true); setError(false); } catch { setError(true); } }}>{copied ? 'Link copiado' : 'Copiar link'}</button>{error && <p role="alert">Não foi possível copiar. Abra o checkout e copie o endereço.</p>}</div>;
}
