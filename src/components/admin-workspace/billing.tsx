'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { billingAction, type BillingState } from '@/app/admin/campanhas/[id]/billing-actions';
import { Action, ActionLink, Field, TextInput, Notice } from './primitives';
import { useFormDraft } from './form-draft';

const billingDraftFields = ['amount'] as const;

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
  const { formRef, feedback, saveLocal, dirty } = useFormDraft({ draftKey, section: 'cobranca', fields: billingDraftFields, submitting: pending });
  return <form ref={formRef} action={action} aria-busy={pending} className="max-w-md space-y-4">
    <input type="hidden" name="operation" value="issue" />
    <Field label="Valor da cobrança (R$)" hint="De R$ 10,00 a R$ 6.000,00. O valor fica fixo após emitir o link.">
      <TextInput name="amount" type="text" inputMode="decimal" required maxLength={7} placeholder="395,00" defaultValue={defaultAmount} disabled={pending} />
    </Field>
    <p className="text-xs text-muted-foreground">Rascunho neste navegador. Salvar o rascunho não salva no servidor nem emite cobrança.</p>
    {feedback}
    <p className="text-xs text-muted-foreground" role="status">{dirty ? 'Cobrança com alterações locais. Nenhum link emitido por estas alterações.' : 'Cobrança sem alterações pendentes.'}</p>
    <div className="flex flex-wrap gap-2">
      <Action type="button" variant="secondary" disabled={pending || !draftKey} onClick={saveLocal}>Salvar rascunho da cobrança</Action>
      <Action type="submit" disabled={pending}>{pending ? 'Emitindo…' : 'Emitir link de cobrança'}</Action>
    </div>
    <Feedback error={state.error} success={state.success} />
  </form>;
}

export function CheckoutShare({ path }: { path: string }) {
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

  return <div className="min-w-0 space-y-4">
    <div className="flex flex-col gap-3 border-l-2 border-border pl-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h4 className="text-sm font-semibold">Compartilhar cobrança</h4><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Envie o link ou uma mensagem com as orientações de pagamento.</p></div>
      <ActionLink href={path} target="_blank" rel="noreferrer" variant="ghost">Abrir checkout</ActionLink>
    </div>
    <div className="flex flex-col gap-2 sm:flex-row"><Action type="button" variant="secondary" onClick={() => void copy('link')}>Copiar link</Action><Action type="button" variant="secondary" onClick={() => void copy('message')}>Copiar mensagem</Action></div>
    <Feedback error={error ? 'Não foi possível copiar. Abra o checkout e copie o endereço.' : undefined} success={copied ? (copied === 'link' ? 'Link copiado.' : 'Mensagem copiada.') : undefined} />
  </div>;
}
