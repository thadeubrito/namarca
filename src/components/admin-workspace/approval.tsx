'use client';

import { useActionState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { approvePackage } from '@/app/admin/campanhas/[id]/package-actions';
import { Action, Field, Notice, Pill, Surface, TextInput } from './primitives';

// Contextual feedback adapted from https://paceui.com/r/motion-alert.json;
// native labeled fields informed by https://paceui.com/r/form-input.json.
// Server validation, revision/identity fields and dirty-guard hooks remain authoritative.
export function ApprovalForm({ campaignId, revision, identity }: { campaignId: string; revision: number; identity: string }) {
  const [state, action, pending] = useActionState(approvePackage.bind(null, campaignId), {});
  const reducedMotion = useReducedMotion();
  return <form action={action} data-campaign-approval="true" aria-busy={pending} className="min-w-0">
    <input type="hidden" name="revision" value={revision} />
    <input type="hidden" name="identity" value={identity} />
    <Surface className="overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(16rem,.6fr)]">
        <div className="min-w-0 space-y-7 p-5 sm:p-8">
          <header className="space-y-3"><Pill tone="neutral">Revisão {revision}</Pill><h3 className="text-xl font-semibold tracking-tight">Registrar aprovação</h3><p className="max-w-xl text-sm leading-relaxed text-muted-foreground">Registre após revisar a prévia e receber a aprovação.</p></header>
          <Field label="Responsável pela aprovação"><TextInput type="text" name="approvedBy" maxLength={200} required /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Canal da aprovação"><select className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" name="channel" required><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option><option value="presencial">Presencial</option><option value="outro">Outro</option></select></Field>
            <Field label="Data da aprovação"><TextInput name="approvedAt" type="date" required max={new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })} /></Field>
          </div>
        </div>
        <div className="flex min-w-0 flex-col justify-between gap-8 border-t border-border bg-muted/25 p-5 sm:p-8 lg:border-t-0 lg:border-l">
          <div className="space-y-4"><span className="font-mono text-xs text-muted-foreground">AUTORIZAÇÃO DE USO</span><p className="text-sm leading-relaxed text-muted-foreground">A versão salva será preservada; isso não aprova condições comerciais nem publica a campanha.</p></div>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed"><input className="mt-1 size-5 shrink-0 accent-primary" name="rights" type="checkbox" required /><span>Confirmo a autorização de uso dos materiais e a aprovação desta versão.</span></label>
        </div>
      </div>
      <div className="flex flex-col gap-4 border-t border-border p-5 sm:p-6">
        {(state.error || state.success) && <motion.div key={state.error || state.success} initial={reducedMotion ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25, duration: reducedMotion ? 0 : undefined }}>
          {state.error && <Notice tone="error" role="alert">{state.error}</Notice>}
          {state.success && <Notice tone="success" role="status">{state.success}</Notice>}
        </motion.div>}
        <div className="flex justify-end"><Action className="max-sm:w-full" type="submit" disabled={pending}>{pending ? 'Registrando…' : 'Registrar aprovação do pacote'}</Action></div>
      </div>
    </Surface>
  </form>;
}
