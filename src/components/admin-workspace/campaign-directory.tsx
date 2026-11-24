'use client';

import { useState } from 'react';
import { campaignAvailability } from '@/lib/campaign-availability';
import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
import { Action, TextInput } from './primitives';
import './campaign-directory.css';

type Campaign = { deliveryPending: boolean; unpublishedChanges: boolean; suspended?: boolean; publicEndsAt?: string | null; id: string; name: string; slug: string; publicationStatus: 'unpublished' | 'pending' | 'published' | 'failed' | 'ended'; priceCents: number | null; endDate: string; clientName: string | null };
const filters = [['all', 'Todas'], ['draft', 'Rascunhos'], ['published', 'Publicadas']] as const;
type Filter = typeof filters[number][0];

function matchesFilter(campaign: Campaign, filter: Filter) {
  return filter === 'all' || (filter === 'published' ? !!campaign.publicEndsAt : !campaign.publicEndsAt);
}

/** Operational directory; preserves the newest-first order supplied by the server. */
export function CampaignDirectory({ campaigns }: { campaigns: Campaign[] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = campaigns.filter(c => matchesFilter(c, filter) && `${c.name} ${c.slug} ${c.clientName ?? ''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));

  return <div className="ws-campaign-directory">
    <div className="ws-campaign-directory-toolbar">
      <label className="ws-campaign-directory-search">
        <span className="sr-only">Buscar campanhas</span>
        <Search aria-hidden="true" size={18} />
        <TextInput type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar evento ou cliente" />
      </label>
      <div className="ws-campaign-directory-filters" role="group" aria-label="Filtrar campanhas">
        {filters.map(([value, title]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
          <span>{title}</span>
          <span className="ws-campaign-directory-filter-count">{campaigns.filter(c => matchesFilter(c, value)).length}</span>
        </button>)}
      </div>
    </div>

    {filtered.length ? <section className="ws-campaign-directory-list" aria-label="Campanhas">
      <div className="ws-campaign-directory-columns" aria-hidden="true">
        <span>Campanha</span><span>Situação</span><span>Encerramento</span><span>Ação</span>
      </div>
      {filtered.map(c => <article key={c.id} className="ws-campaign-directory-row">
        <div className="ws-campaign-directory-identity">
          <h2><Link href={`/campanhas/${c.id}`}>{c.name}</Link></h2>
          {c.clientName && <p className="ws-campaign-directory-client">{c.clientName}</p>}
          <p className="ws-campaign-directory-slug">/{c.slug}</p>
        </div>
        <dl className="ws-campaign-directory-status">
          <div><dt>Disponibilidade</dt><dd>{campaignAvailability({ published: !!c.publicEndsAt, suspended: !!c.suspended, endsAt: c.publicEndsAt ?? undefined, pending: c.deliveryPending })}</dd></div>
          {(c.deliveryPending || c.unpublishedChanges) && <div><dt className="sr-only">Publicação</dt><dd>{c.deliveryPending ? 'Envio pendente' : 'Alterações não publicadas'}</dd></div>}
        </dl>
        <div className="ws-campaign-directory-end">
          <span className="ws-campaign-directory-mobile-label">Encerramento</span>
          <span>{c.endDate}</span>
        </div>
        <Link href={`/campanhas/${c.id}`} aria-label={`Abrir campanha ${c.name}`} className="ws-campaign-directory-open">
          <ArrowUpRight aria-hidden="true" size={20} />
        </Link>
      </article>)}
    </section> : <div className="ws-campaign-directory-empty">
      <h2>{campaigns.length ? 'Nenhuma campanha nesta seleção' : 'Sua primeira campanha começa aqui'}</h2>
      <p>{campaigns.length ? 'Altere a busca ou o filtro para encontrar outro evento.' : 'Cadastre o evento e depois prepare as artes no estúdio.'}</p>
      {campaigns.length > 0 && <Action variant="secondary" onClick={() => { setSearch(''); setFilter('all'); }}>Limpar filtros</Action>}
    </div>}

    <p className="ws-campaign-directory-count" role="status">{filtered.length} de {campaigns.length} campanhas · Mais recentes primeiro</p>
  </div>;
}
