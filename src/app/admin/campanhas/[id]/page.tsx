import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { campaigns, payments, clients, checkoutLinks, checkoutAttempts, campaignPackages, campaignEditor } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { CampaignForm } from '../nova/form';
import { updateCampaign } from './actions';
import { CampaignSections } from '@/components/campaign-sections';
import { CampaignEditor } from '@/components/campaign-editor';
import { BillingButton, CopyCheckout } from '@/components/billing';
import { PackageApprovalForm } from '@/components/campaign-package';
import { packageIdentity, packageMatches } from '@/lib/campaign-package';
import { deriveCampaignEvent } from '@/lib/campaign-editor';

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
  const clientOptions = await db.select({ id: clients.id, name: clients.name, contact: clients.contact }).from(clients).orderBy(asc(clients.name));
  const editable = campaign.preparationStatus === 'draft' && campaign.publicationStatus === 'unpublished';
  const saved = (await searchParams).salvo === '1';
  const labels = { pending: 'Pendente', paid: 'Pago', expired: 'Expirado', cancelled: 'Cancelado', refunded: 'Reembolsado' };
  return <><div className="page-heading"><div><p className="eyebrow"><Link href="/admin">Campanhas</Link> / Detalhes</p><h1>{campaign.name}</h1><p>/{campaign.slug} · {editable ? 'Rascunho não publicado' : 'Campanha em preparação ou publicada'}</p></div><Link className="button secondary" href="/admin">Campanhas</Link></div>
    <div className="stack">
      {saved && <div className="notice" role="status">Dados da campanha salvos.</div>}
      <CampaignSections label="Seções da campanha" initialId={saved ? 'dados' : undefined} items={[
        ...(editable ? [{ id: 'estudio', label: 'Estúdio', content: <CampaignEditor campaignId={id} /> }] : []),
        { id: 'dados', label: 'Dados da campanha', content: <section aria-labelledby="dados"><h2 id="dados">Dados</h2>{editable ? <CampaignForm clients={clientOptions} defaults={{ clientId: campaign.clientId, notes: campaign.notes, name: campaign.name, slug: campaign.slug, endsAt: campaign.endsAt.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }), price: campaign.priceCents === null ? '' : (campaign.priceCents / 100).toFixed(2).replace('.', ',') }} save={updateCampaign.bind(null, id)} /> : <div className="panel">Somente rascunhos não publicados podem ser editados.</div>}</section> },
        { id: 'aprovacao', label: 'Aprovação visual', content: <section className="panel stack" aria-labelledby="aprovacao-visual"><h2 id="aprovacao-visual">Aprovação visual</h2><p>{currentApproved ? 'Versão salva aprovada.' : packages.length ? 'Rascunho alterado. É necessária nova aprovação.' : 'Sem aprovação. Salve e revise a prévia antes de registrar.'}</p><p className="muted">A aprovação usa a versão salva. Após editar o estúdio, salve e recarregue esta página.</p>{editable && editor && !currentApproved && <PackageApprovalForm key={`${editor.revision}-${packageIdentity(campaign)}`} campaignId={id} revision={editor.revision} identity={packageIdentity(campaign)} />}{packages.length > 0 && <div className="table-scroll"><table><thead><tr><th>Versão</th><th>Aprovado por</th><th>Canal</th><th>Data</th><th>Pacote</th></tr></thead><tbody>{packages.map(pkg => <tr key={pkg.id}><td>v{pkg.version} · revisão {pkg.editorRevision}</td><td>{pkg.approvedBy}</td><td>{{ whatsapp: 'WhatsApp', email: 'E-mail', presencial: 'Presencial', outro: 'Outro' }[pkg.channel] ?? pkg.channel}</td><td>{pkg.approvedAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td><td><Link href={`/admin/campanhas/${id}/pacotes/${pkg.id}`} target="_blank" rel="noreferrer">Revisar pacote v{pkg.version}</Link></td></tr>)}</tbody></table></div>}</section> },
        { id: 'cobranca', label: 'Cobrança', content: <section className="panel" aria-labelledby="cobrancas"><h2 id="cobrancas">Cobrança</h2><p><Link href={`/admin/campanhas/${id}/financeiro`}>Resumo financeiro</Link></p><p>Nome e valor ficam fixos ao emitir o link, mesmo após editar a campanha.</p><p className="muted">O nome será público no link; não inclua dados pessoais. Não é possível revogar ou reemitir com outro valor.</p>{links.length ? <div className="stack"><p>Valor emitido: {(links[0].amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p><CopyCheckout path={`/checkout/${links[0].token}`} /></div> : <BillingButton id={id} operation="issue">Emitir link de cobrança</BillingButton>}{attempts.filter(a => a.state !== 'registered').map(a => <div className="notice" key={a.id}><p>Criação em verificação. Não gere outra cobrança.</p><BillingButton id={a.id} operation="recover">Consultar criação na PixGo</BillingButton></div>)}{history.length ? <div className="table-scroll"><table><thead><tr><th>Referência</th><th>Situação</th><th>Valor</th><th>Criada em</th><th>Consulta</th></tr></thead><tbody>{history.map(payment => <tr key={payment.id}><td>{payment.externalId}</td><td>{labels[payment.status]}</td><td>{(payment.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td>{payment.createdAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</td><td><BillingButton id={payment.id} operation="reconcile">Consultar na PixGo</BillingButton></td></tr>)}</tbody></table></div> : <p className="muted">Nenhum Pix gerado.</p>}</section> },
      ]} />
      <p className="muted">Prévia privada. Publicação indisponível, mesmo após aprovação e pagamento.</p>
    </div>
  </>;
}
