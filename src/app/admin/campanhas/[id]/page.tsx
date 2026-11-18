import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { campaigns, payments, clients } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { CampaignForm } from '../nova/form';
import { updateCampaign } from './actions';
import { CampaignEditor } from '@/components/campaign-editor';

export default async function CampaignDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (!campaign) notFound();
  const history = await db.select().from(payments).where(eq(payments.campaignId, id)).orderBy(desc(payments.createdAt));
  const clientOptions = await db.select({ id: clients.id, name: clients.name, contact: clients.contact }).from(clients).orderBy(asc(clients.name));
  const editable = campaign.preparationStatus === 'draft' && campaign.publicationStatus === 'unpublished';
  const saved = (await searchParams).salvo === '1';
  const labels = { pending: 'Pendente', paid: 'Pago', expired: 'Expirado', cancelled: 'Cancelado', refunded: 'Reembolsado' };
  return <><div className="page-heading"><div><p className="eyebrow"><Link href="/admin">Campanhas</Link> / Detalhes</p><h1>{campaign.name}</h1><p>/{campaign.slug} · {editable ? 'Rascunho não publicado' : 'Campanha em preparação ou publicada'}</p></div><Link className="button secondary" href="/admin">Voltar às campanhas</Link></div>
    <div className="stack">
      {saved && <div className="notice" role="status">Dados da campanha salvos.</div>}
      <div className="notice">Prepare as artes, stickers, área da foto e aparência abaixo. A prévia é privada e não publica a campanha. Geração de cobrança, aprovação das artes e publicação ainda não estão disponíveis.</div>
      {editable && <CampaignEditor campaignId={id} />}
      <section aria-labelledby="dados"><h2 id="dados">Dados da campanha</h2>{editable ? <CampaignForm clients={clientOptions} defaults={{ clientId: campaign.clientId, notes: campaign.notes, name: campaign.name, slug: campaign.slug, endsAt: campaign.endsAt.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }), price: campaign.priceCents === null ? '' : (campaign.priceCents / 100).toFixed(2).replace('.', ',') }} save={updateCampaign.bind(null, id)} /> : <div className="panel">A edição está restrita a rascunhos não publicados nesta versão.</div>}</section>
      <section className="panel" aria-labelledby="cobrancas"><h2 id="cobrancas">Cobranças registradas</h2>{history.length ? <div className="table-scroll"><table><thead><tr><th>Referência</th><th>Situação</th><th>Valor</th><th>Criada em</th></tr></thead><tbody>{history.map(payment => <tr key={payment.id}><td>{payment.externalId}</td><td>{labels[payment.status]}</td><td>{(payment.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td>{payment.createdAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td></tr>)}</tbody></table></div> : <p className="muted">Nenhuma cobrança registrada. A criação de cobranças pelo painel ainda será implementada.</p>}</section>
    </div>
  </>;
}
