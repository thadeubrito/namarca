'use client';

import { useActionState, useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Check, Copy, Link2, MessageSquare, Send } from 'lucide-react';
import { billingAction, type BillingState } from '@/app/admin/campanhas/[id]/billing-actions';
import { Action, ActionLink, Field, TextInput, Notice } from './primitives';
import { useFormDraft } from './form-draft';
import { localMaterialId } from '@/lib/studio-draft';

const billingDraftFields = ['amount', 'description'] as const;

// PaceUI references consulted via container fetch:
// https://paceui.com/r/motion-alert.json and https://paceui.com/r/motion-spring-button.json.
// Adapted as subtle spring press/feedback around native server-action controls,
// without the registry's perpetual shaking and with reduced-motion support.
function Feedback({ error, success }: { error?: string; success?: string }) {
  const reducedMotion = useReducedMotion();
  if (!error && !success) return null;
  return <motion.div key={error || success} initial={reducedMotion ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.16 }}>
    {error && <Notice tone="error" role="alert">{error}</Notice>}
    {success && <Notice tone="success" role="status">{success}</Notice>}
  </motion.div>;
}

export function PaymentAction({ id, operation, children }: { id: string; operation: string; children: ReactNode }) {
  const [state, action, pending] = useActionState<BillingState, FormData>(billingAction.bind(null, id), {});
  const reducedMotion = useReducedMotion();
  return <form action={action} aria-busy={pending} className="space-y-3">
    <input type="hidden" name="operation" value={operation} />
    <motion.div className="inline-flex max-sm:w-full" whileTap={reducedMotion || pending ? undefined : { scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 24 }}>
      <Action className="max-sm:w-full" type="submit" variant="secondary" disabled={pending}>{pending ? 'Processando…' : children}</Action>
    </motion.div>
    <Feedback error={state.error} success={state.success} />
  </form>;
}

export function BillingIssueForm({ id, defaultAmount, draftKey }: { id: string; defaultAmount: string; draftKey?: string }) {
  const [state, action, pending] = useActionState<BillingState, FormData>(billingAction.bind(null, id), {});
  const { formRef, feedback, markSaved } = useFormDraft({ draftKey, section: 'cobranca', fields: billingDraftFields, submitting: pending });
  const [requestId, setRequestId] = useState('');
  useEffect(() => { queueMicrotask(() => setRequestId(localMaterialId())); }, []);
  useEffect(() => {
    if (!state.issuedId) return;
    queueMicrotask(() => {
      formRef.current?.reset();
      markSaved({ amount: defaultAmount, description: '' });
      setRequestId(localMaterialId());
    });
  }, [state.issuedId, formRef, markSaved, defaultAmount]);
  return <form ref={formRef} action={action} aria-busy={pending} className="ws-billing-issue">
    <input type="hidden" name="operation" value="issue" />
    <input type="hidden" name="requestId" value={requestId} />
    <Field label="Descrição"><TextInput name="description" required maxLength={120} placeholder="Ex.: campanha inicial ou alteração adicional" disabled={pending} /></Field>
    <div className="ws-billing-amount">
      <Field label="Valor da cobrança (R$)" >
        <TextInput name="amount" type="text" inputMode="decimal" required maxLength={7} placeholder="395,00" defaultValue={defaultAmount} disabled={pending} />
      </Field>
    </div>
    <Action className="ws-billing-submit" type="submit" disabled={pending || !requestId}><Send aria-hidden />{pending ? 'Emitindo…' : 'Emitir link de cobrança'}</Action>
    <div className="ws-billing-issue-feedback">{feedback}<Feedback error={state.error} success={state.success} /></div>
  </form>;
}

export function CheckoutShare({ path, compact = false }: { path: string; compact?: boolean }) {
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);
  const [error, setError] = useState(false);
  const copy = async (kind: 'link' | 'message') => {
    setCopied(null);
    setError(false);
    try {
      const url = new URL(path, window.location.origin).href;
      await navigator.clipboard.writeText(kind === 'link' ? url : `Olá! Segue o link de pagamento da sua campanha Namarca. Confira o nome, o valor e as orientações no checkout antes de pagar:\n${url}`);
      setCopied(kind);
    } catch { setError(true); }
  };

  return <div className={`ws-billing-share${compact ? ' ws-billing-share-compact' : ''}`}>
    {!compact && <><h3>Compartilhar cobrança</h3><div className="ws-billing-link"><Link2 aria-hidden /><span title={path}>{path}</span><ActionLink href={path} target="_blank" rel="noreferrer" variant="ghost">Abrir checkout<ArrowUpRight aria-hidden /></ActionLink></div></>}
    <div className="ws-billing-buttons">{compact && <ActionLink href={path} target="_blank" rel="noreferrer" variant="ghost">Abrir checkout<ArrowUpRight aria-hidden /></ActionLink>}<Action type="button" variant={compact ? 'ghost' : 'primary'} onClick={() => void copy('link')}>{copied === 'link' ? <Check aria-hidden /> : <Copy aria-hidden />}{copied === 'link' ? 'Link copiado' : 'Copiar link'}</Action><Action type="button" variant="secondary" onClick={() => void copy('message')}>{copied === 'message' ? <Check aria-hidden /> : <MessageSquare aria-hidden />}{copied === 'message' ? 'Mensagem copiada' : 'Copiar mensagem'}</Action></div>
    <span className="sr-only" role="status">{copied === 'link' ? 'Link copiado.' : copied === 'message' ? 'Mensagem copiada.' : ''}</span>
    <Feedback error={error ? 'Não foi possível copiar. Abra o checkout e copie o endereço.' : undefined} />
  </div>;
}
