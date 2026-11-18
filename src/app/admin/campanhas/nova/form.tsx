'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { CampaignSections } from '@/components/campaign-sections';
import { createCampaign } from './actions';
import type { CreateState } from './actions';
export type CampaignDefaults = { name: string; slug: string; endsAt: string; price: string; clientId?: string | null; notes?: string };
export function CampaignForm({ defaults, clients = [], save = createCampaign }: { defaults?: CampaignDefaults; clients?: { id: string; name: string; contact: string }[]; save?: (state: CreateState, form: FormData) => Promise<CreateState> }) {
  const [state, action, pending] = useActionState(save, {});
  const [clientId, setClientId] = useState(defaults?.clientId ?? '');
  const selected = clients.find(client => client.id === clientId);
  return <form action={action} className="panel stack" data-campaign-navigation="true">
    <CampaignSections label="Dados do rascunho" items={[
      { id: 'evento', label: 'Evento e valor', content: <div className="stack">
    <label>Nome do evento<input name="name" defaultValue={defaults?.name} required minLength={2} maxLength={160} placeholder="Ex.: Corrida Horizonte" /></label>
    <label>Endereço da campanha<input name="slug" defaultValue={defaults?.slug} required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="corrida-horizonte" /><small>Somente letras minúsculas, números e hífens.</small></label>
    <div className="grid"><label>Data de encerramento<input name="endsAt" type="date" defaultValue={defaults?.endsAt} required /><small>Encerramento às 23h59, horário de São Paulo.</small></label><label>Valor da campanha (R$)<input name="price" defaultValue={defaults?.price} type="text" inputMode="decimal" placeholder="A definir" maxLength={10} /><small>Opcional. Salvar não gera cobrança nem altera cobranças já emitidas.</small></label></div>
    </div> },
      { id: 'cliente', label: 'Cliente e observações', content: <div className="stack">
    <label>Cliente <small>Opcional · selecione ou cadastre aqui</small><select name="clientId" aria-label="Cliente" value={clientId} onChange={event => setClientId(event.target.value)}><option value="">Sem cliente vinculado</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}{client.contact ? ` · ${client.contact}` : ''}</option>)}<option value="new">+ Cadastrar novo cliente</option></select></label>
    {clientId === 'new' && <div className="grid"><label>Nome do novo cliente<input name="clientName" required minLength={2} maxLength={160} placeholder="Organização ou pessoa" /></label><label>Contato do novo cliente <small>Opcional · e-mail ou WhatsApp</small><input name="clientContact" maxLength={254} /></label><small>O cliente será cadastrado ao salvar a campanha. Não cria conta de acesso.</small></div>}
    {selected && <p className="muted">{selected.contact || 'Cliente sem contato cadastrado.'}</p>}
    <label>Observações do combinado <small>Opcional · apenas o que for importante para esta campanha</small><textarea name="notes" defaultValue={defaults?.notes} maxLength={3000} rows={3} /></label>
    </div> },
    ]} />
    <small>Dados internos. Não inclua CPF, credenciais ou dados de participantes.</small>
    {state.error && <div className="error" role="alert">{state.error}</div>}
    <div className="form-footer"><Link href="/admin" className="button secondary">Cancelar</Link><button className="accent" disabled={pending}>{pending ? 'Salvando…' : defaults ? 'Salvar alterações' : 'Salvar rascunho'}</button></div>
  </form>;
}
