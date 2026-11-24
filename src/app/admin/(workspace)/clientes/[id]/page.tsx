import { desc, eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { campaigns, clients } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { UUID } from '@/lib/campaign-editor';
import { ActionLink, Notice, PageIntro, Workspace } from '@/components/admin-workspace/primitives';
import { ClientContactForm } from '@/components/admin-workspace/client-contact-form';
import { ClientCampaigns } from '@/components/admin-workspace/client-campaigns';
import { ClientEntrance } from '@/components/admin-workspace/client-motion';

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [client] = await db.select().from(clients).where(eq(clients.id, id));
  if (!client) notFound();
  const linked = await db.select({ id: campaigns.id, name: campaigns.name, endsAt: campaigns.endsAt }).from(campaigns).where(eq(campaigns.clientId, id)).orderBy(desc(campaigns.createdAt));
  const saved = (await searchParams).salvo === '1';
  return <Workspace>
    <PageIntro eyebrow="Clientes / Detalhes" title={client.name} description="Contato de referência e campanhas vinculadas." action={<ActionLink href="/clientes" variant="ghost"><ArrowLeft className="size-4" aria-hidden="true" />Voltar para clientes</ActionLink>} />
    {saved && <Notice role="status" tone="success">Cliente salvo.</Notice>}
    <ClientEntrance className="grid min-w-0 items-start gap-8 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.5fr)]">
      <ClientContactForm client={client} />
      <ClientCampaigns clientName={client.name} campaigns={linked.map(campaign => ({ ...campaign, endsAt: campaign.endsAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) }))} />
    </ClientEntrance>
  </Workspace>;
}
