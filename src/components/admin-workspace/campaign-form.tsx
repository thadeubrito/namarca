'use client';

import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { createCampaign, type CreateState } from '@/app/(workspace)/campanhas/nova/actions';
import { Action, ActionLink, Field, Notice, TextArea, TextInput } from './primitives';
import { useFormDraft } from './form-draft';
import { DatePickerField, SelectField } from './form-controls';
import { SaveStatus } from './save-status';

const draftFields = ['name', 'slug', 'endsAt', 'clientId', 'clientName', 'clientContact', 'notes'] as const;

// References fetched from PaceUI registry: https://paceui.com/r/form-input.json
// and https://paceui.com/r/motion-alert.json. Adapted to native FormData/server actions,
// with visible labels, contextual fields and reduced-motion feedback; no TanStack dependency.
export type CampaignDefaults = { name: string; slug: string; endsAt: string; clientId?: string | null; notes?: string };
export type CampaignDataFormProps = {
  defaults?: CampaignDefaults;
  draftKey?: string;
  slugLocked?: boolean;
  clients?: { id: string; name: string; contact: string }[];
  save?: (state: CreateState, form: FormData) => Promise<CreateState>;
};

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="ws-form-group">
    <h3 className="text-base font-semibold">{title}</h3>
    <div className="space-y-5">{children}</div>
  </section>;
}

export function CampaignDataForm({ defaults, clients = [], save = createCampaign, draftKey, slugLocked = false }: CampaignDataFormProps) {
  const [state, action, pending] = useActionState(save, {});
  const [clientId, setClientId] = useState(defaults?.clientId ?? '');
  const [endsAt, setEndsAt] = useState(defaults?.endsAt ?? '');
  const reducedMotion = useReducedMotion();
  const selected = clients.find(client => client.id === clientId);
  const { formRef, feedback, dirty, markSaved } = useFormDraft({
    draftKey, section: 'dados', fields: draftFields, submitting: pending,
    onRecover: values => { setClientId(values.clientId ?? ''); setEndsAt(values.endsAt ?? ''); },
    resolveStoredValues: values => {
      // A successful inline creation replaces "new" with the persisted client ID.
      // Only reconcile against the client actually linked by the server.
      const linked = clients.find(client => client.id === defaults?.clientId);
      if (values.clientId === 'new' && linked && linked.name === values.clientName?.trim() && linked.contact === (values.clientContact ?? '').trim()) {
        return { ...values, clientId: linked.id, clientName: '', clientContact: '' };
      }
      return values;
    },
  });

  const appliedSave = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!state.saved || state.saved.token === appliedSave.current) return;
    appliedSave.current = state.saved.token;
    setClientId(state.saved.values.clientId);
    setEndsAt(state.saved.values.endsAt);
    for (const [field, value] of Object.entries(state.saved.values)) {
      const control = formRef.current?.elements.namedItem(field);
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) {
        control.defaultValue = value;
        control.value = value;
      }
    }
    markSaved(state.saved.values);
    window.dispatchEvent(new Event('namarca:editor-saved'));
  }, [state.saved, markSaved, formRef]);

  return <form ref={formRef} action={action} data-campaign-save={defaults ? 'details' : undefined} data-campaign-navigation="true" aria-busy={pending} className="ws-campaign-form min-w-0">
    <div className="ws-form-groups">
      <FormSection title="Evento">
        <Field label="Nome do evento"><TextInput type="text" name="name" defaultValue={defaults?.name} required minLength={2} maxLength={160} placeholder="Ex.: Corrida Horizonte" /></Field>
        <Field label="Endereço da campanha" hint={slugLocked ? 'Endereço preservado para manter os links já divulgados.' : 'Letras minúsculas, números e hífens.'}><span className="ws-input-prefix-group"><span className="ws-input-prefix" aria-hidden="true">namarca.com/</span><TextInput type="text" name="slug" readOnly={slugLocked} defaultValue={defaults?.slug} required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="corrida-horizonte" /></span></Field>
        <Field label="Data de encerramento" hint="Às 23h59 de São Paulo."><DatePickerField name="endsAt" label="Data de encerramento" value={endsAt} onValueChange={setEndsAt} required /></Field>
      </FormSection>
      <FormSection title="Cliente e observações">
        <Field label="Cliente" hint="Opcional">
          <SelectField name="clientId" label="Cliente" value={clientId} onValueChange={setClientId} options={[
            { value: '', label: 'Sem cliente vinculado' },
            ...(clientId && clientId !== 'new' && !clients.some(client => client.id === clientId) ? [{ value: clientId, label: 'Cliente vinculado' }] : []),
            ...clients.map(client => ({ value: client.id, label: `${client.name}${client.contact ? ` · ${client.contact}` : ''}` })),
            { value: 'new', label: '+ Cadastrar novo cliente' },
          ]} />
        </Field>
        {clientId === 'new' && <motion.div key="new-client" initial={reducedMotion ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }} className="space-y-4 border-l-2 border-border pl-5">
            <Field label="Nome do novo cliente"><TextInput type="text" name="clientName" required minLength={2} maxLength={160} placeholder="Organização ou pessoa" /></Field>
            <Field label="Contato do novo cliente" hint="Opcional · e-mail ou WhatsApp"><TextInput type="text" name="clientContact" maxLength={254} /></Field>
            <p className="text-sm text-muted-foreground">Cadastrado ao salvar, sem conta de acesso.</p>
          </motion.div>}
        {selected && <p className="text-sm text-muted-foreground">{selected.contact || 'Cliente sem contato cadastrado.'}</p>}
        <Field label="Observações do combinado" hint="Opcional"><TextArea name="notes" defaultValue={defaults?.notes} maxLength={3000} rows={5} /></Field>
      </FormSection>
    </div>
    <p className="ws-form-privacy">Dados internos. Não inclua CPF, credenciais ou dados de participantes.</p>
    <footer className="ws-campaign-form-footer">
      {feedback}
      {state.error && <Notice tone="error" role="alert" className="ws-campaign-form-error">{state.error}</Notice>}
      <div className="ws-campaign-form-actions"><SaveStatus dirty={dirty} saving={pending} successToken={state.saved?.token} /><ActionLink href="/" variant="ghost">Cancelar</ActionLink><Action type="submit" disabled={pending}>{pending ? 'Salvando…' : defaults ? 'Salvar detalhes' : 'Salvar rascunho'}</Action></div>
    </footer>
  </form>;
}
