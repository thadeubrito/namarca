'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Search } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Action, EmptyState, Pill, Surface, TextInput } from './primitives';

type Campaign = { id: string; name: string; slug: string; preparationStatus: 'draft' | 'validated' | 'approved'; publicationStatus: 'unpublished' | 'pending' | 'published' | 'failed' | 'ended'; priceCents: number | null; endDate: string; clientName: string | null };
const preparation = { draft: 'Rascunho', validated: 'Validada', approved: 'Aprovada' };
const publication = { unpublished: 'Não publicada', pending: 'Pendente', published: 'Publicada', failed: 'Falha', ended: 'Encerrada' };
/** PaceUI app-project-3 card composition, rewritten around campaign data instead of tasks. */
export function CampaignDirectory({ campaigns }: { campaigns: Campaign[] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const reduced = useReducedMotion();
  const filtered = campaigns.filter(c => (filter === 'all' || (filter === 'approved' ? c.preparationStatus === 'approved' : c.preparationStatus !== 'approved')) && `${c.name} ${c.slug} ${c.clientName ?? ''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  return <><div className="ws-directory-toolbar"><div className="ws-filterbar" aria-label="Filtrar campanhas">{[['all', 'Todas'], ['preparing', 'Em preparação'], ['approved', 'Aprovadas']].map(([value, title]) => <Action key={value} variant={filter === value ? 'primary' : 'ghost'} aria-pressed={filter === value} onClick={() => setFilter(value)}>{title}<span className="tabular-nums">{campaigns.filter(c => value === 'all' || (value === 'approved' ? c.preparationStatus === 'approved' : c.preparationStatus !== 'approved')).length}</span></Action>)}</div><label className="relative block min-w-0 sm:w-72"><span className="sr-only">Buscar campanhas</span><Search aria-hidden className="absolute left-3 top-3 size-4 text-muted-foreground" /><TextInput type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar evento ou cliente" className="!pl-9" /></label></div>
    {filtered.length ? <div className="ws-project-grid">{filtered.map(c => <motion.article key={c.id} layout={!reduced} transition={{ type: 'spring', stiffness: 350, damping: 30 }}><Surface className="ws-project h-full"><div className="ws-project-top"><Pill tone={c.preparationStatus === 'approved' ? 'success' : 'neutral'}>{preparation[c.preparationStatus]}</Pill><Link href={`/admin/campanhas/${c.id}`} aria-label={`Abrir campanha ${c.name}`} className="flex size-10 items-center justify-center rounded-md hover:bg-muted"><ArrowUpRight aria-hidden className="size-4" /></Link></div><div className="space-y-2"><Link className="ws-project-name" href={`/admin/campanhas/${c.id}`}>{c.name}</Link><p className="ws-project-slug">/{c.slug}</p></div><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{c.clientName || 'Sem cliente vinculado'}</span><span className="ws-project-value tabular-nums">{c.priceCents === null ? 'Valor a definir' : (c.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div><div className="ws-project-bottom"><span>{publication[c.publicationStatus]}</span><span className="flex items-center gap-2"><CalendarDays aria-hidden className="size-3.5" />{c.endDate}</span></div></Surface></motion.article>)}</div> : <EmptyState title={campaigns.length ? 'Nenhuma campanha nesta seleção' : 'Sua primeira campanha começa aqui'} description={campaigns.length ? 'Altere a busca ou o filtro para encontrar outro evento.' : 'Cadastre o evento e depois prepare as artes no estúdio.'} action={campaigns.length ? <Action variant="secondary" onClick={() => { setSearch(''); setFilter('all'); }}>Limpar filtros</Action> : undefined} />}
    <p className="ws-count">{filtered.length} de {campaigns.length} campanhas · Mais recentes primeiro</p>
  </>;
}
