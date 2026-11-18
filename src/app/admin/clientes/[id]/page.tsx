import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { campaigns, clients } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { UUID } from '@/lib/campaign-editor';
import { ClientForm } from '@/components/client-form';

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [client] = await db.select().from(clients).where(eq(clients.id, id));
  if (!client) notFound();
  const linked = await db.select({ id: campaigns.id, name: campaigns.name, endsAt: campaigns.endsAt }).from(campaigns).where(eq(campaigns.clientId, id)).orderBy(desc(campaigns.createdAt));
  const saved = (await searchParams).salvo === '1';
  return <>
    <div className="page-heading"><div><p className="eyebrow">Clientes / Detalhes</p><h1 style={{ overflowWrap: 'anywhere' }}>{client.name}</h1></div></div>
    {saved && <p role="status" className="notice">Cliente salvo.</p>}
    <div style={{ maxWidth: 760 }}><ClientForm client={client} /></div>
    <section className="panel" aria-label="Campanhas do cliente"><h2>Campanhas · {linked.length}</h2>{linked.length ? <div className="table-scroll"><table><thead><tr><th>Campanha</th><th>Encerramento</th></tr></thead><tbody>{linked.map(campaign => <tr key={campaign.id}><td><Link href={`/admin/campanhas/${campaign.id}`}>{campaign.name}</Link></td><td>{campaign.endsAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td></tr>)}</tbody></table></div> : <p className="muted">Nenhuma campanha vinculada.</p>}</section>
  </>;
}
