'use client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { CampaignSections } from '@/components/campaign-sections';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createCampaign } from './actions';
import type { CreateState } from './actions';
export type CampaignDefaults = { name: string; slug: string; endsAt: string; price: string; clientId?: string | null; notes?: string };
export function CampaignForm({ defaults, clients = [], save = createCampaign }: { defaults?: CampaignDefaults; clients?: { id: string; name: string; contact: string }[]; save?: (state: CreateState, form: FormData) => Promise<CreateState> }) {
  const [state, action, pending] = useActionState(save, {});
  const [clientId, setClientId] = useState(defaults?.clientId ?? '');
  const selected = clients.find(client => client.id === clientId);
  return <form action={action} className="min-w-0" data-campaign-navigation="true">
    <Card className="gap-5">
      <CardHeader className="border-b max-md:px-4">
        <CardTitle className="text-base">Dados do rascunho</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 max-md:px-4">
        <CampaignSections label="Dados do rascunho" items={[
          { id: 'evento', label: 'Evento e valor', content: <div className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 space-y-4 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Evento</h3>
              <label className="grid gap-2">Nome do evento<Input type="text" name="name" defaultValue={defaults?.name} required minLength={2} maxLength={160} placeholder="Ex.: Corrida Horizonte" /></label>
              <label className="grid gap-2">Endereço da campanha<Input type="text" name="slug" defaultValue={defaults?.slug} required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="corrida-horizonte" /><small>Letras minúsculas, números e hífens.</small></label>
            </div>
            <div className="min-w-0 space-y-4 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Prazo e valor</h3>
              <label className="grid gap-2">Data de encerramento<Input name="endsAt" type="date" defaultValue={defaults?.endsAt} required /><small>Às 23h59 de São Paulo.</small></label>
              <label className="grid gap-2">Valor da campanha (R$)<Input name="price" defaultValue={defaults?.price} type="text" inputMode="decimal" placeholder="A definir" maxLength={10} /><small>Opcional. Não gera nem altera cobranças.</small></label>
            </div>
          </div> },
          { id: 'cliente', label: 'Cliente e observações', content: <div className="grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 space-y-4 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Cliente</h3>
              <label className="grid gap-2">Cliente <small>Opcional</small><select name="clientId" aria-label="Cliente" value={clientId} onChange={event => setClientId(event.target.value)}><option value="">Sem cliente vinculado</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}{client.contact ? ` · ${client.contact}` : ''}</option>)}<option value="new">+ Cadastrar novo cliente</option></select></label>
              {clientId === 'new' && <div className="grid gap-4">
                <label className="grid gap-2">Nome do novo cliente<Input type="text" name="clientName" required minLength={2} maxLength={160} placeholder="Organização ou pessoa" /></label>
                <label className="grid gap-2">Contato do novo cliente <small>Opcional · e-mail ou WhatsApp</small><Input type="text" name="clientContact" maxLength={254} /></label>
                <small>Cadastrado ao salvar, sem conta de acesso.</small>
              </div>}
              {selected && <p className="text-sm text-muted-foreground">{selected.contact || 'Cliente sem contato cadastrado.'}</p>}
            </div>
            <div className="min-w-0 space-y-4 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Observações</h3>
              <label className="grid gap-2">Observações do combinado <small>Opcional</small><Textarea name="notes" defaultValue={defaults?.notes} maxLength={3000} rows={5} /></label>
            </div>
          </div> },
        ]} />
        <small>Dados internos. Não inclua CPF, credenciais ou dados de participantes.</small>
        {state.error && <div className="error" role="alert">{state.error}</div>}
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t max-md:flex-col-reverse max-md:items-stretch max-md:px-4">
        <Button type="button" variant="outline" asChild><Link href="/">Cancelar</Link></Button>
        <Button type="submit" disabled={pending}>{pending ? 'Salvando…' : defaults ? 'Salvar alterações' : 'Salvar rascunho'}</Button>
      </CardFooter>
    </Card>
  </form>;
}
