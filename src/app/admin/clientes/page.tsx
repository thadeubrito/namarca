import Link from 'next/link';
import { asc, count, eq, ilike, or } from 'drizzle-orm';
import { db } from '@/db';
import { campaigns, clients } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { clientSearchPattern } from '@/lib/client-input';

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 254) : '';
  const rows = await db.select({ id: clients.id, name: clients.name, contact: clients.contact, campaignCount: count(campaigns.id) })
    .from(clients).leftJoin(campaigns, eq(campaigns.clientId, clients.id))
    .where(q ? or(ilike(clients.name, clientSearchPattern(q)), ilike(clients.contact, clientSearchPattern(q))) : undefined)
    .groupBy(clients.id).orderBy(asc(clients.name), asc(clients.id));
  return <>
    <div className="page-heading"><div><p className="eyebrow">Administrativo / Clientes</p><h1>Clientes</h1><p>Contatos e campanhas de quem contrata suas ativações.</p></div><Link className="button" href="/admin/clientes/novo">Novo cliente</Link></div>
    <form method="get" className="panel stack" role="search"><label>Buscar por nome ou contato<input name="q" defaultValue={q} maxLength={254} placeholder="Nome, e-mail ou WhatsApp" /></label><div className="actions"><button className="button secondary">Buscar</button>{q && <Link href="/admin/clientes">Limpar busca</Link>}</div><small>O contato pode conter dados pessoais; evite compartilhar a URL da busca.</small></form>
    <section className="panel" aria-label="Lista de clientes"><h2>{rows.length} {rows.length === 1 ? 'cliente' : 'clientes'}{q ? ' encontrados' : ''}</h2>{rows.length ? <div className="table-scroll"><table><thead><tr><th>Cliente</th><th>Contato</th><th>Campanhas</th></tr></thead><tbody>{rows.map(client => <tr key={client.id}><td><Link href={`/admin/clientes/${client.id}`}>{client.name}</Link></td><td style={{ overflowWrap: 'anywhere' }}>{client.contact || 'Não informado'}</td><td>{client.campaignCount}</td></tr>)}</tbody></table></div> : <p className="muted">{q ? 'Nenhum cliente encontrado. Tente outro nome ou contato.' : 'Nenhum cliente cadastrado. Cadastre aqui ou ao preparar uma campanha.'}</p>}</section>
  </>;
}
