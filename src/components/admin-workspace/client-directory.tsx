import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
import { Action, ActionLink, TextInput } from './primitives';
import { ClientEmpty, ClientEntrance } from './client-motion';
import './client-directory.css';

export function ClientMonogram({ name }: { name: string }) {
  return <span aria-hidden="true" className="ws-client-monogram">{name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('pt-BR')}</span>;
}

export function ClientDirectory({ rows, query }: { rows: { id: string; name: string; contact: string; campaignCount: number }[]; query: string }) {
  return <ClientEntrance className="ws-client-directory">
    <form method="get" role="search" className="ws-client-search">
      <div className="ws-client-directory-toolbar">
        <label className="ws-client-directory-search" htmlFor="client-search">
          <span className="sr-only">Buscar por nome ou contato</span>
          <Search size={18} aria-hidden="true" />
          <TextInput id="client-search" name="q" defaultValue={query} maxLength={254} placeholder="Buscar nome ou contato" />
        </label>
        <Action type="submit" variant="secondary">Buscar</Action>
        {query && <ActionLink href="/clientes" variant="ghost">Limpar busca</ActionLink>}
      </div>
    </form>

    <section className="ws-client-directory-results" aria-labelledby="client-directory-heading">
      <header className="ws-client-directory-heading">
        <h2 id="client-directory-heading">{query ? 'Resultados da busca' : 'Todos os clientes'}</h2>
        <span>{rows.length} {rows.length === 1 ? 'cliente' : 'clientes'}{query ? ' encontrados' : ''}</span>
      </header>
      {rows.length ? <ul className="ws-client-directory-list">{rows.map(client => <li key={client.id}>
        <Link href={`/clientes/${client.id}`} aria-label={client.name} className="ws-client-row">
          <ClientMonogram name={client.name} />
          <div className="ws-client-directory-identity">
            <h3>{client.name}</h3>
            <p>{client.contact || 'Contato não informado'}</p>
          </div>
          <span className="ws-client-directory-campaigns">{client.campaignCount} {client.campaignCount === 1 ? 'campanha' : 'campanhas'}</span>
          <span className="ws-client-directory-open"><ArrowUpRight size={20} aria-hidden="true" /></span>
        </Link>
      </li>)}</ul> : <ClientEmpty title={query ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'} description={query ? 'Tente outro nome ou contato.' : 'Cadastre o primeiro contato para vincular às suas campanhas.'} action={<ActionLink href={query ? '/clientes' : '/clientes/novo'} variant="secondary">{query ? 'Limpar busca' : 'Cadastrar primeiro cliente'}</ActionLink>} />}
    </section>
  </ClientEntrance>;
}
