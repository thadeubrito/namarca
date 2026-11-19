import Link from 'next/link';
import { ArrowUpRight, Plus, Search } from 'lucide-react';
import { Action, ActionLink, Surface, TextInput } from './primitives';
import { ClientEmpty, ClientEntrance } from './client-motion';

export function ClientMonogram({ name }: { name: string }) {
  return <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted text-sm font-semibold tracking-wide text-foreground">{name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('pt-BR')}</span>;
}

export function ClientDirectory({ rows, query }: { rows: { id: string; name: string; contact: string; campaignCount: number }[]; query: string }) {
  return <ClientEntrance>
    <Surface className="overflow-hidden !p-0" aria-label="Lista de clientes">
      <form method="get" role="search" className="border-b border-border p-5 sm:p-7">
        <label htmlFor="client-search" className="mb-2 block text-sm font-medium">Buscar por nome ou contato</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><TextInput id="client-search" name="q" defaultValue={query} maxLength={254} placeholder="Nome, e-mail ou WhatsApp" className="!pl-10" aria-describedby="client-search-privacy" /></div>
          <Action type="submit" variant="secondary">Buscar</Action>
          {query && <ActionLink href="/admin/clientes" variant="ghost">Limpar busca</ActionLink>}
        </div>
        <p id="client-search-privacy" className="mt-3 text-xs text-muted-foreground">A busca pode conter dados pessoais. Não compartilhe a URL.</p>
      </form>
      <div className="flex items-center justify-between px-5 py-4 sm:px-7"><h2 className="text-sm font-medium">{query ? 'Resultados da busca' : 'Diretório de contatos'}</h2><span className="text-xs tabular-nums text-muted-foreground">{rows.length} {rows.length === 1 ? 'cliente' : 'clientes'}{query ? ' encontrados' : ''}</span></div>
      {rows.length ? <ul className="m-0 list-none divide-y divide-border p-0">{rows.map(client => <li key={client.id}>
        <Link href={`/admin/clientes/${client.id}`} aria-label={client.name} className="group flex min-w-0 items-center gap-4 px-5 py-6 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring sm:gap-5 sm:px-7">
          <ClientMonogram name={client.name} />
          <div className="min-w-0 flex-1"><h3 className="break-words text-base font-semibold [overflow-wrap:anywhere]">{client.name}</h3><p className="mt-1 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">{client.contact || 'Não informado'}</p><p className="mt-2 text-xs text-muted-foreground sm:hidden">{client.campaignCount} {client.campaignCount === 1 ? 'campanha' : 'campanhas'}</p></div>
          <span className="hidden shrink-0 text-sm tabular-nums text-muted-foreground sm:block">{client.campaignCount} {client.campaignCount === 1 ? 'campanha' : 'campanhas'}</span>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border transition-colors group-hover:bg-foreground group-hover:text-background"><ArrowUpRight className="size-4 motion-safe:transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" aria-hidden="true" /></span>
        </Link>
      </li>)}</ul> : <ClientEmpty title={query ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'} description={query ? 'Tente outro nome ou contato.' : 'Cadastre o primeiro contato para vincular às suas campanhas.'} action={<ActionLink href={query ? '/admin/clientes' : '/admin/clientes/novo'} variant="secondary">{!query && <Plus className="size-4" aria-hidden="true" />}{query ? 'Limpar busca' : 'Cadastrar primeiro cliente'}</ActionLink>} />}
    </Surface>
  </ClientEntrance>;
}
