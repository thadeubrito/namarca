import { notFound } from 'next/navigation';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { db } from '@/db';
import { campaigns, payments, clients, checkoutLinks, checkoutAttempts } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { updateCampaign } from './actions';
import { CampaignSections } from '@/components/admin-workspace/campaign-sections';
import { CampaignDataForm } from '@/components/admin-workspace/campaign-form';
import { PaymentAction, CheckoutShare, BillingIssueForm } from '@/components/admin-workspace/billing';
import { Workspace, ActionLink, Surface, Notice, Pill } from '@/components/admin-workspace/primitives';

export default async function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (!campaign) notFound();
  const history = await db.select().from(payments).where(eq(payments.campaignId, id)).orderBy(desc(payments.createdAt));
  const links = await db.select().from(checkoutLinks).where(eq(checkoutLinks.campaignId, id)).orderBy(desc(checkoutLinks.createdAt), desc(checkoutLinks.id));
  const attempts = links.length ? await db.select().from(checkoutAttempts).where(inArray(checkoutAttempts.checkoutId, links.map(link => link.id))) : [];
  const options = await db.select({ id: clients.id, name: clients.name, contact: clients.contact }).from(clients).orderBy(asc(clients.name));
  const editable = campaign.preparationStatus === 'draft' && campaign.publicationStatus === 'unpublished';
  const labels = { pending: 'Pendente', paid: 'Pago', expired: 'Expirado', cancelled: 'Cancelado', refunded: 'Reembolsado' };
  const money = (amount: number) => (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return <Workspace className="ws-campaign-detail">
    <header className="ws-campaign-heading"><div className="ws-campaign-identity"><ActionLink href="/admin" variant="ghost" aria-label="Voltar às campanhas"><ArrowLeft aria-hidden /></ActionLink><h1>{campaign.name}</h1></div></header>
    <CampaignSections campaignId={id} editable={editable} billingDraft={true} details={editable ? <CampaignDataForm draftKey={`namarca:details:${session.user.id}:${id}`} clients={options} defaults={{ clientId: campaign.clientId, notes: campaign.notes, name: campaign.name, slug: campaign.slug, endsAt: campaign.endsAt.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) }} save={updateCampaign.bind(null, id)} /> : <Notice>Somente rascunhos não publicados podem ser editados.</Notice>} billing={<section className="ws-billing" aria-label="Cobrança"><Surface className="ws-billing-main"><h3 className="mb-4">Nova cobrança</h3><BillingIssueForm id={id} draftKey={`namarca:billing:${session.user.id}:${id}`} defaultAmount="" /><p className="ws-billing-policy">R$ 10–6.000 por cobrança. Nome e descrição públicos; valor fixo após emitir.</p></Surface>{links.length > 0 && <Surface><div className="ws-billing-history-heading"><h3>Cobranças</h3><span className="ws-billing-caption">{links.length} {links.length === 1 ? 'registro' : 'registros'}</span></div><div className="ws-scroll"><table className="ws-ledger ws-billing-ledger"><thead><tr><th>Descrição</th><th>Valor</th><th>Situação</th><th>Emitida em</th><th>Compartilhar</th></tr></thead><tbody>{links.map(link => { const related = history.filter(payment => payment.checkoutId === link.id); const paid = related.some(payment => payment.status === 'paid'); const refunded = related.some(payment => payment.status === 'refunded'); const pending = related.some(payment => payment.status === 'pending'); const uncertain = attempts.some(attempt => attempt.checkoutId === link.id && attempt.state === 'creating' && Date.now() - attempt.createdAt.getTime() < 15000); return <tr key={link.id}><td className="ws-billing-description">{link.description}</td><td className="whitespace-nowrap tabular-nums">{money(link.amountCents)}</td><td><Pill tone={paid ? 'success' : pending || uncertain ? 'warning' : 'neutral'}>{paid ? 'Pago' : refunded ? 'Reembolsado' : uncertain ? 'Em verificação' : pending ? 'Pendente' : related.length ? 'Sem Pix ativo' : 'Aguardando pagamento'}</Pill></td><td className="whitespace-nowrap">{link.createdAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td><td><CheckoutShare compact path={`/checkout/${link.token}`} /></td></tr>; })}</tbody></table></div></Surface>}<Surface className="ws-billing-history"><div className="ws-billing-history-heading"><h3>Tentativas de pagamento</h3><span className="ws-billing-caption">{history.length} {history.length === 1 ? 'registro' : 'registros'}</span></div>{history.length ? <><div className="ws-scroll"><table className="ws-ledger"><thead><tr><th>Situação</th><th>Valor</th><th>Cobrança</th><th>Gerado em</th><th>Referência</th><th><span className="sr-only">Consulta</span></th></tr></thead><tbody>{history.map(payment => <tr key={payment.id}><td><Pill tone={payment.status === 'paid' ? 'success' : payment.status === 'pending' ? 'warning' : 'neutral'}>{labels[payment.status]}</Pill></td><td className="whitespace-nowrap tabular-nums">{money(payment.amountCents)}</td><td>{links.find(link => link.id === payment.checkoutId)?.description ?? 'Registro anterior'}</td><td className="whitespace-nowrap">{payment.createdAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td><td className="text-xs text-muted-foreground">{payment.externalId}</td><td><PaymentAction id={payment.id} operation="reconcile">Consultar na PixGo</PaymentAction></td></tr>)}</tbody></table></div></> : <div className="ws-billing-empty"><p>Nenhum Pix gerado</p><span className="ws-billing-caption">{links.length ? 'Quando o cliente gerar um Pix no checkout, a tentativa aparecerá aqui.' : 'Emita e compartilhe o link para começar a receber pagamentos.'}</span></div>}</Surface></section>} />
  </Workspace>;
}
