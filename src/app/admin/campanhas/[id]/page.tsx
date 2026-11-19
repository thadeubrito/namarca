import { notFound } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { ArrowLeft, ArrowUpRight, Check, Clock3 } from 'lucide-react';
import { db } from '@/db';
import { campaigns, payments, clients, checkoutLinks, checkoutAttempts, campaignPackages, campaignEditor } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { updateCampaign } from './actions';
import { packageIdentity, packageMatches } from '@/lib/campaign-package';
import { deriveCampaignEvent } from '@/lib/campaign-editor';
import { CampaignStudio } from '@/components/admin-workspace/studio';
import { CampaignDataForm } from '@/components/admin-workspace/campaign-form';
import { ApprovalForm } from '@/components/admin-workspace/approval';
import { PaymentAction, CheckoutShare } from '@/components/admin-workspace/billing';
import { Workspace, WorkspaceTabs, ActionLink, Surface, Notice, Pill, EmptyState } from '@/components/admin-workspace/primitives';

export default async function CampaignDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
  if (!campaign) notFound();
  const history = await db.select().from(payments).where(eq(payments.campaignId, id)).orderBy(desc(payments.createdAt));
  const packages = await db.select().from(campaignPackages).where(eq(campaignPackages.campaignId, id)).orderBy(desc(campaignPackages.version));
  const [editor] = await db.select().from(campaignEditor).where(eq(campaignEditor.campaignId, id));
  const currentApproved = !!editor && !!packages[0] && packageMatches(packages[0].config, deriveCampaignEvent(editor.config, campaign));
  const links = await db.select().from(checkoutLinks).where(eq(checkoutLinks.campaignId, id));
  const attempts = links.length ? await db.select().from(checkoutAttempts).where(eq(checkoutAttempts.checkoutId, links[0].id)) : [];
  const options = await db.select({ id: clients.id, name: clients.name, contact: clients.contact }).from(clients).orderBy(asc(clients.name));
  const editable = campaign.preparationStatus === 'draft' && campaign.publicationStatus === 'unpublished';
  const saved = (await searchParams).salvo === '1';
  const labels = { pending: 'Pendente', paid: 'Pago', expired: 'Expirado', cancelled: 'Cancelado', refunded: 'Reembolsado' };
  const money = (amount: number) => (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return <Workspace className="ws-campaign-detail">
    <header className="ws-campaign-heading"><div className="ws-campaign-identity"><ActionLink href="/admin" variant="ghost" aria-label="Voltar às campanhas"><ArrowLeft aria-hidden /></ActionLink><h1>{campaign.name}</h1></div>{editable && <CampaignStudio campaignId={id} campaignName={campaign.name} />}</header>
    {saved && <Notice tone="success">Dados da campanha salvos.</Notice>}
    <WorkspaceTabs label="Seções da campanha" initialId="dados" items={[
      { id: 'dados', label: 'Dados da campanha', content: editable ? <CampaignDataForm clients={options} defaults={{ clientId: campaign.clientId, notes: campaign.notes, name: campaign.name, slug: campaign.slug, endsAt: campaign.endsAt.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }), price: campaign.priceCents === null ? '' : (campaign.priceCents / 100).toFixed(2).replace('.', ',') }} save={updateCampaign.bind(null, id)} /> : <Notice>Somente rascunhos não publicados podem ser editados.</Notice> },
      { id: 'aprovacao', label: 'Aprovação visual', content: <section className="space-y-6" aria-label="Aprovação visual"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">{currentApproved ? <Check className="size-5" /> : <Clock3 className="size-5" />}</span><div><h2>{currentApproved ? 'Aprovação registrada' : 'Revisão dos materiais'}</h2><p className="mt-2 text-sm text-muted-foreground">{currentApproved ? 'A versão salva tem uma aprovação registrada. Uma nova edição não altera esse pacote.' : packages.length ? 'O rascunho mudou. Revise a prévia e registre uma nova aprovação.' : 'Salve o estúdio e revise a prévia antes de registrar a aprovação externa.'}</p></div></div>{editable && editor && !currentApproved && <ApprovalForm key={`${editor.revision}-${packageIdentity(campaign)}`} campaignId={id} revision={editor.revision} identity={packageIdentity(campaign)} />}{packages.length > 0 && <div><h3 className="mb-4">Versões preservadas</h3><ol className="space-y-3 list-none p-0">{packages.map(pkg => <li key={pkg.id}><Surface className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><span className="flex size-10 items-center justify-center rounded-full border text-sm font-semibold">v{pkg.version}</span><div><p className="font-medium">{pkg.approvedBy}</p><p className="mt-1 text-xs text-muted-foreground">{{ whatsapp: 'WhatsApp', email: 'E-mail', presencial: 'Presencial', outro: 'Outro' }[pkg.channel] ?? pkg.channel} · {pkg.approvedAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · revisão {pkg.editorRevision}</p></div></div><ActionLink href={`/admin/campanhas/${id}/pacotes/${pkg.id}`} target="_blank" rel="noreferrer" variant="ghost">Revisar pacote v{pkg.version}<ArrowUpRight aria-hidden /></ActionLink></Surface></li>)}</ol></div>}</section> },
      { id: 'cobranca', label: 'Cobrança', content: <section className="space-y-6" aria-label="Cobrança"><div className="ws-section-heading"><div><h2>Link e pagamentos</h2><p className="mt-2 text-sm text-muted-foreground">Emita a cobrança e acompanhe as tentativas de pagamento.</p></div><ActionLink href={`/admin/campanhas/${id}/financeiro`}>Resumo financeiro<ArrowUpRight aria-hidden /></ActionLink></div><Surface><div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-muted-foreground">{links.length ? 'Valor congelado no link' : 'Valor atual da campanha'}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{links.length ? money(links[0].amountCents) : campaign.priceCents === null ? 'A definir' : money(campaign.priceCents)}</p></div><Pill>{links.length ? 'Link emitido' : 'Ainda não emitido'}</Pill></div>{links.length ? <CheckoutShare path={`/checkout/${links[0].token}`} /> : <PaymentAction id={id} operation="issue">Emitir link de cobrança</PaymentAction>}<p className="mt-5 max-w-2xl text-xs leading-relaxed text-muted-foreground">O link mantém nome e valor da emissão, mesmo após editar a campanha. O nome será público: não inclua dados pessoais. Não é possível revogar ou reemitir com outro valor.</p></Surface>{attempts.filter(a => a.state !== 'registered').map(a => <Notice key={a.id}><p className="mb-3">Criação em verificação. Não gere outra cobrança.</p><PaymentAction id={a.id} operation="recover">Consultar criação na PixGo</PaymentAction></Notice>)}{history.length ? <Surface><h3 className="mb-4">Tentativas de pagamento</h3><div className="ws-scroll"><table className="ws-ledger"><thead><tr><th>Situação</th><th>Valor</th><th>Data</th><th>Referência</th><th><span className="sr-only">Consulta</span></th></tr></thead><tbody>{history.map(payment => <tr key={payment.id}><td><Pill tone={payment.status === 'paid' ? 'success' : 'neutral'}>{labels[payment.status]}</Pill></td><td className="whitespace-nowrap tabular-nums">{money(payment.amountCents)}</td><td className="whitespace-nowrap">{payment.createdAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td><td className="text-xs text-muted-foreground">{payment.externalId}</td><td><PaymentAction id={payment.id} operation="reconcile">Consultar na PixGo</PaymentAction></td></tr>)}</tbody></table></div></Surface> : <EmptyState title="Nenhum Pix gerado" description="As tentativas aparecem aqui quando o link de cobrança for utilizado." />}</section> },
    ]} />
    <p className="text-xs text-muted-foreground">Prévia privada. Publicação indisponível, mesmo após aprovação e pagamento.</p>
  </Workspace>;
}
