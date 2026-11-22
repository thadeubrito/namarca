'use client';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { billingAction, type BillingState } from '@/app/(workspace)/campanhas/[id]/billing-actions';
export function BillingButton({ id, operation, children }: { id: string; operation: string; children: React.ReactNode }) {
  const [state, action, pending] = useActionState<BillingState, FormData>(billingAction.bind(null, id), {});
  return <form action={action}><input type="hidden" name="operation" value={operation} /><Button type="submit" variant="outline" disabled={pending}>{pending ? 'Processando…' : children}</Button>{state.error && <p role="alert">{state.error}</p>}{state.success && <p role="status">{state.success}</p>}</form>;
}
export function CopyCheckout({ path }: { path: string }) {
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);
  const [error, setError] = useState(false);
  const copy = async (kind: 'link' | 'message') => {
    setCopied(null); setError(false);
    try {
      const url = new URL(path, window.location.origin).href;
      await navigator.clipboard.writeText(kind === 'link' ? url : `Olá! Segue o link de pagamento da sua campanha Namarca. Confira o nome, o valor e as orientações no checkout antes de pagar:\n${url}`);
      setCopied(kind);
    } catch { setError(true); }
  };
  return <div className="stack"><Button type="button" variant="ghost" asChild><a href={path} target="_blank" rel="noreferrer">Abrir checkout</a></Button><Button type="button" variant="outline" onClick={() => void copy('link')}>Copiar link</Button><Button type="button" variant="outline" onClick={() => void copy('message')}>Copiar mensagem</Button>{copied && <p role="status">{copied === 'link' ? 'Link copiado.' : 'Mensagem copiada.'}</p>}{error && <p role="alert">Não foi possível copiar. Abra o checkout e copie o endereço.</p>}</div>;
}
