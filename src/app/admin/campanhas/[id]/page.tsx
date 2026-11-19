import { notFound } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { db } from '@/db';
import { campaigns, payments, clients, checkoutLinks, checkoutAttempts } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { updateCampaign } from './actions';
import { CampaignStudio } from '@/components/admin-workspace/studio';
import { CampaignDataForm } from '@/components/admin-workspace/campaign-form';
import { PaymentAction, CheckoutShare, BillingIssueForm } from '@/components/admin-workspace/billing';
import { Workspace, WorkspaceTabs, ActionLink, Surface, Notice, Pill, EmptyState } from '@/components/admin-workspace/primitives';

export default async function CampaignDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (!campaign) notFound();
  const history = await db.select().from(payments).where(eq(payments.campaignId, id)).orderBy(desc(payments.createdAt));
  const links = await db.select().from(checkoutLinks).where(eq(checkoutLinks.campaignId, id));
  const attempts = links.length ? await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, links[0].id)) : [];
  const options = await db.select({ id: clients.id, name: clients.name, contact: clients.contact }).from(clients).orderBy(asc(clients.name));
  const editable = campaign.preparationStatus === 'draft' && campaign.publicationStatus === 'unpublished';
  const saved = (await searchParams).salvo === '1';
  const labels = { pending: 'Pendente', paid: 'Pago', expired: 'Expirado', cancelled: 'Cancelado', refunded: 'Reembolsado' };
  const money = (amount: number) => (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return <Workspace className="ws-campaign-detail">
    <header className="ws-campaign-heading"><div className="ws-campaign-identity"><ActionLink href="/admin" variant="ghost" aria-label="Voltar às campanhas"><ArrowLeft aria-hidden /></ActionLink><h1>{campaign.name}</h1></div></header>
    {saved && <Notice tone="success">Dados da campanha salvos.</Notice>}
    <WorkspaceTabs label="Seções da campanha" initialId="dados" items={[
      ...(editable ? [{ id: 'estudio', label: 'Estúdio', lazy: true, content: <CampaignStudio campaignId={id} /> }] : []),
      { id: 'dados', label: 'Dados da campanha', content: editable ? <CampaignDataForm clients={options} defaults={{ clientId: campaign.clientId, notes: campaign.notes, name: campaign.name, slug: campaign.slug, endsAt: campaign.endsAt.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) }} save={updateCampaign.bind(null, id)} /> : <Notice>Somente rascunhos não publicados podem ser editados.</Notice> },
      { id: 'cobranca', label: 'Cobrança', content: <section className="space-y-6" aria-label="Cobrança"><div className="ws-section-heading"><div><h2>Link e pagamentos</h2><p className="mt-2 text-sm text-muted-foreground">Emita a cobrança e acompanhe as tentativas de pagamento.</p></div><ActionLink href={`/admin/campanhas/${id}/financeiro`}>Resumo financeiro<ArrowUpRight aria-hidden /></ActionLink></div><Surface><div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-muted-foreground">{links.length ? 'Valor congelado no link' : 'Valor da cobrança'}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{links.length ? money(links[0].amountCents) : campaign.priceCents === null ? 'A definir' : money(campaign.priceCents)}</p></div><Pill>{links.length ? 'Link emitido' : 'Ainda não emitido'}</Pill></div>{links.length ? <CheckoutShare path={`/checkout/${links[0].token}`} /> : <BillingIssueForm id={id} defaultAmount={campaign.priceCents === null ? '' : (campaign.priceCents / 100).toFixed(2).replace('.', ',')} />}<p className="mt-5 max-w-2xl text-xs leading-relaxed text-muted-foreground">O link mantém nome e valor da emissão, mesmo após editar a campanha. O nome será público: não inclua dados pessoais. Não é possível revogar ou reemitir com outro valor.</p></Surface>{attempts.filter(a => a.state !== 'registered').map(a => <Notice key={a.id}><p className="mb-3">Criação em verificação. Não gere outra cobrança.</p><PaymentAction id={a.id} operation="recover">Consultar criação na PixGo</PaymentAction></Notice>)}{history.length ? <Surface><h3 className="mb-4">Tentativas de pagamento</h3><div className="ws-scroll"><table className="ws-ledger"><thead><tr><th>Situação</th><th>Valor</th><th>Data</th><th>Referência</th><th><span className="sr-only">Consulta</span></th></tr></thead><tbody>{history.map(payment => <tr key={payment.id}><td><Pill tone={payment.status === 'paid' ? 'success' : 'neutral'}>{labels[payment.status]}</Pill></td><td className="whitespace-nowrap tabular-nums">{money(payment.amountCents)}</td><td className="whitespace-nowrap">{payment.createdAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td><td className="text-xs text-muted-foreground">{payment.externalId}</td><td><PaymentAction id={payment.id} operation="reconcile">Consultar na PixGo</PaymentAction></td></tr>)}</tbody></table></div></Surface> : <EmptyState title="Nenhum Pix gerado" description="As tentativas aparecem aqui quando o link de cobrança for utilizado." />}</section> },
    ]} />
    <p className="text-xs text-muted-foreground">Prévia privada. Publicação indisponível, mesmo após pagamento.</p>
  </Workspace>;
}
