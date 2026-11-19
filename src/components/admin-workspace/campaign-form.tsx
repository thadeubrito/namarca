'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { createCampaign, type CreateState } from '@/app/admin/campanhas/nova/actions';
import { Action, ActionLink, Field, Notice, Surface, TextArea, TextInput } from './primitives';

// References fetched from PaceUI registry: https://paceui.com/r/form-input.json
// and https://paceui.com/r/motion-alert.json. Adapted to native FormData/server actions,
// with visible labels, contextual fields and reduced-motion feedback; no TanStack dependency.
export type CampaignDefaults = { name: string; slug: string; endsAt: string; clientId?: string | null; notes?: string };
export type CampaignDataFormProps = {
  defaults?: CampaignDefaults;
  clients?: { id: string; name: string; contact: string }[];
  save?: (state: CreateState, form: FormData) => Promise<CreateState>;
};

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="min-w-0 space-y-6 border-b border-border pb-8 last:border-0 last:pb-0">
    <h3 className="text-base font-semibold">{title}</h3>
    <div className="space-y-5">{children}</div>
  </section>;
}

export function CampaignDataForm({ defaults, clients = [], save = createCampaign }: CampaignDataFormProps) {
  const [state, action, pending] = useActionState(save, {});
  const [clientId, setClientId] = useState(defaults?.clientId ?? '');
  const reducedMotion = useReducedMotion();
  const selected = clients.find(client => client.id === clientId);

  return <form action={action} data-campaign-navigation="true" aria-busy={pending} className="ws-campaign-form min-w-0">
    <Surface className="min-w-0 space-y-8 p-5 sm:p-8">
      <FormSection title="Evento">
        <Field label="Nome do evento"><TextInput type="text" name="name" defaultValue={defaults?.name} required minLength={2} maxLength={160} placeholder="Ex.: Corrida Horizonte" /></Field>
        <Field label="Endereço da campanha" hint="Letras minúsculas, números e hífens."><TextInput type="text" name="slug" defaultValue={defaults?.slug} required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="corrida-horizonte" /></Field>
        <Field label="Data de encerramento" hint="Às 23h59 de São Paulo."><TextInput name="endsAt" type="date" defaultValue={defaults?.endsAt} required /></Field>
      </FormSection>
      <FormSection title="Cliente e observações">
        <Field label="Cliente" hint="Opcional">
          <select className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" name="clientId" aria-label="Cliente" value={clientId} onChange={event => setClientId(event.target.value)}>
            <option value="">Sem cliente vinculado</option>
            {clients.map(client => <option key={client.id} value={client.id}>{client.name}{client.contact ? ` · ${client.contact}` : ''}</option>)}
            <option value="new">+ Cadastrar novo cliente</option>
          </select>
        </Field>
        {clientId === 'new' && <motion.div key="new-client" initial={reducedMotion ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }} className="space-y-4 border-l-2 border-border pl-5">
            <Field label="Nome do novo cliente"><TextInput type="text" name="clientName" required minLength={2} maxLength={160} placeholder="Organização ou pessoa" /></Field>
            <Field label="Contato do novo cliente" hint="Opcional · e-mail ou WhatsApp"><TextInput type="text" name="clientContact" maxLength={254} /></Field>
            <p className="text-sm text-muted-foreground">Cadastrado ao salvar, sem conta de acesso.</p>
          </motion.div>}
        {selected && <p className="text-sm text-muted-foreground">{selected.contact || 'Cliente sem contato cadastrado.'}</p>}
        <Field label="Observações do combinado" hint="Opcional"><TextArea name="notes" defaultValue={defaults?.notes} maxLength={3000} rows={5} /></Field>
      </FormSection>
      <p className="text-xs leading-relaxed text-muted-foreground">Dados internos. Não inclua CPF, credenciais ou dados de participantes.</p>
    </Surface>
    <footer className="ws-campaign-form-footer">
      {state.error && <Notice tone="error" role="alert" className="ws-campaign-form-error">{state.error}</Notice>}
      <div className="ws-campaign-form-actions"><ActionLink href="/admin" variant="ghost">Cancelar</ActionLink><Action type="submit" disabled={pending}>{pending ? 'Salvando…' : defaults ? 'Salvar alterações' : 'Salvar rascunho'}</Action></div>
    </footer>
  </form>;
}
