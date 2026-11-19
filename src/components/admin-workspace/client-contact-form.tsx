'use client';

import { useActionState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { saveClient, type ClientState } from '@/app/admin/clientes/actions';
import { Action, ActionLink, Field, Notice, Surface, TextInput } from './primitives';

export function ClientContactForm({ client }: { client?: { id: string; name: string; contact: string } }) {
  const [state, action, pending] = useActionState<ClientState, FormData>(saveClient.bind(null, client?.id ?? null), {});
  return <Surface className="overflow-hidden">
    <form action={action} className="min-w-0">
      <div className="border-b border-border px-6 py-5 sm:px-8">
        <h2 className="text-base font-semibold">{client ? 'Ficha do cliente' : 'Dados do cliente'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{client ? 'Mantenha o nome e o contato de referência atualizados.' : 'Um nome para identificar. Um contato para conversar.'}</p>
      </div>
      <div className="space-y-6 px-6 py-7 sm:px-8">
        <Field label="Nome do cliente" hint="Obrigatório">
          <TextInput aria-label="Nome do cliente" type="text" name="name" required minLength={2} maxLength={160} defaultValue={client?.name ?? ''} autoComplete="organization" placeholder="Nome da pessoa ou organização" />
        </Field>
        <Field label="Contato" hint="Opcional · e-mail ou WhatsApp">
          <TextInput aria-label="Contato" type="text" name="contact" maxLength={254} defaultValue={client?.contact ?? ''} placeholder="Como entrar em contato" />
        </Field>
        {client && <Notice>Altera o cliente em todas as campanhas vinculadas, sem mudar valores ou cobranças emitidas.</Notice>}
        {state.error && <Notice role="alert" tone="error">{state.error}</Notice>}
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <ActionLink href="/admin/clientes" variant="ghost">Clientes</ActionLink>
        <Action type="submit" disabled={pending} aria-busy={pending}>{pending ? 'Salvando…' : client ? 'Salvar cliente' : 'Cadastrar cliente'}{client ? <Check className="size-4" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}</Action>
      </div>
    </form>
  </Surface>;
}
