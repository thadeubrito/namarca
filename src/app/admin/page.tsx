import Link from 'next/link';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
const preparation = { draft: 'Rascunho', validated: 'Validada', approved: 'Aprovada' };
const publication = { unpublished: 'Não publicada', pending: 'Pendente', published: 'Publicada', failed: 'Falha', ended: 'Encerrada' };
export default async function CampaignsPage() {
  await requireAdmin();
  const list = await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  return <><div className="page-heading"><div><h1>Campanhas</h1></div><Link className="button accent" href="/admin/campanhas/nova">Criar campanha <span aria-hidden>↗</span></Link></div>
    <div className="stats"><div className="panel"><p className="eyebrow">Campanhas</p><strong className="stat">{list.length}</strong></div><div className="panel"><p className="eyebrow">Em preparação</p><strong className="stat">{list.filter(c => c.preparationStatus !== 'approved').length}</strong></div><div className="panel"><p className="eyebrow">Publicadas</p><strong className="stat">{list.filter(c => c.publicationStatus === 'published').length}</strong></div></div>
    <div className="notice" style={{ marginBottom: 24 }}>Publicação indisponível. Aprovação e pagamento não publicam a campanha.</div>
    <section className="panel" aria-labelledby="lista"><h2 id="lista">Campanhas</h2>{list.length ? <div className="table-scroll"><table><thead><tr><th>Evento</th><th>Preparação</th><th>Publicação</th><th>Valor</th><th>Encerramento</th></tr></thead><tbody>{list.map(c => <tr key={c.id}><td><Link href={`/admin/campanhas/${c.id}`}><strong>{c.name}</strong></Link><br /><small>/{c.slug}</small></td><td><span className="badge">{preparation[c.preparationStatus]}</span></td><td>{publication[c.publicationStatus]}</td><td>{c.priceCents === null ? 'A definir' : (c.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td>{c.endsAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td></tr>)}</tbody></table></div> : <div className="empty"><h2>Nenhuma campanha</h2><Link href="/admin/campanhas/nova" className="button secondary">Criar campanha</Link></div>}</section>
  </>;
}
