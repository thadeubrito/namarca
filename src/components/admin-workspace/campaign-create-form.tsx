'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { createCampaign } from '@/app/(workspace)/campanhas/nova/actions';
import { suggestCampaignSlug } from '@/lib/campaign-slug';
import { Action, Field, Notice, TextInput } from './primitives';
import { DatePickerField } from './form-controls';
import './campaign-create.css';

/** Same basic creation fields in the dialog and the standalone route. */
export function CampaignCreateForm({ cancel, onPendingChange }: { cancel: ReactNode; onPendingChange?: (pending: boolean) => void }) {
  const [state, action, pending] = useActionState(async (previous: Parameters<typeof createCampaign>[0], form: FormData) => {
    onPendingChange?.(true);
    try { return await createCampaign(previous, form); }
    finally { onPendingChange?.(false); }
  }, {});
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [customSlug, setCustomSlug] = useState(false);
  const [endsAt, setEndsAt] = useState('');
  return <form action={action} aria-busy={pending} className="ws-campaign-create-form">
    <fieldset disabled={pending} className="ws-campaign-create-fields">
      <Field label="Nome do evento"><TextInput name="name" value={name} required minLength={2} maxLength={160} autoComplete="off" placeholder="Ex.: Corrida Horizonte" onChange={event => { setName(event.target.value); if (!customSlug) setSlug(suggestCampaignSlug(event.target.value)); }} /></Field>
      <Field label="Endereço da campanha" hint="Sugerido pelo nome. Você pode ajustar antes de criar."><span className="ws-input-prefix-group"><span className="ws-input-prefix" aria-hidden="true">namarca.com/</span><TextInput name="slug" value={slug} onChange={event => { setCustomSlug(true); setSlug(event.target.value); }} required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" autoCapitalize="none" autoComplete="off" spellCheck={false} /></span></Field>
      <Field label="Data de encerramento" hint="Às 23h59 de São Paulo."><DatePickerField name="endsAt" label="Data de encerramento" value={endsAt} onValueChange={setEndsAt} required /></Field>
    </fieldset>
    {state.error && <Notice tone="error" role="alert">{state.error}</Notice>}
    <footer className="ws-campaign-create-actions">{cancel}<Action type="submit" disabled={pending}>{pending ? 'Criando…' : 'Criar campanha'}</Action></footer>
  </form>;
}
