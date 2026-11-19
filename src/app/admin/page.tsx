import { desc, eq } from 'drizzle-orm';
import { Plus } from 'lucide-react';
import { db } from '@/db';
import { campaigns, clients } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { Workspace, PageIntro, Notice, ActionLink } from '@/components/admin-workspace/primitives';
import { CampaignDirectory } from '@/components/admin-workspace/campaign-directory';

export default async function CampaignsPage() {
  await requireAdmin();
  const rows = await db.select({ campaign: campaigns, clientName: clients.name }).from(campaigns).leftJoin(clients, eq(campaigns.clientId, clients.id)).orderBy(desc(campaigns.createdAt));
  return <Workspace>
    <PageIntro eyebrow="Área de trabalho" title="Campanhas" description="Encontre o evento e continue de onde parou." action={<ActionLink href="/admin/campanhas/nova" variant="primary"><Plus aria-hidden />Criar campanha</ActionLink>} />
    <CampaignDirectory campaigns={rows.map(({ campaign, clientName }) => ({ id: campaign.id, name: campaign.name, slug: campaign.slug, preparationStatus: campaign.preparationStatus, publicationStatus: campaign.publicationStatus, priceCents: campaign.priceCents, endDate: campaign.endsAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), clientName }))} />
    <Notice role="note">Publicação indisponível. Aprovação e pagamento não publicam a campanha.</Notice>
  </Workspace>;
}
