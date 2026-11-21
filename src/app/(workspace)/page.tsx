import { desc, eq, sql } from 'drizzle-orm';
import { Plus } from 'lucide-react';
import { db } from '@/db';
import { campaigns, clients, campaignPublications, campaignPublicationHistory } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { Workspace, PageIntro, ActionLink } from '@/components/admin-workspace/primitives';
import { CampaignDirectory } from '@/components/admin-workspace/campaign-directory';

export default async function CampaignsPage() {
  await requireAdmin();
  const rows = await db.select({ campaign: campaigns, clientName: clients.name, publicEndsAt: sql<string | null>`coalesce(case when ${campaignPublications.deliveredAt} is not null then ${campaignPublications.config}->>'endsAt' end, (select h.config->>'endsAt' from ${campaignPublicationHistory} h where h.campaign_id = ${campaigns.id} order by h.version desc limit 1))` }).from(campaigns).leftJoin(clients, eq(campaigns.clientId, clients.id)).leftJoin(campaignPublications, eq(campaignPublications.campaignId, campaigns.id)).orderBy(desc(campaigns.createdAt));
  return <Workspace>
    <PageIntro eyebrow="Área de trabalho" title="Campanhas" description="Encontre o evento e continue de onde parou." action={<ActionLink href="/campanhas/nova" variant="primary"><Plus aria-hidden />Criar campanha</ActionLink>} />
    <CampaignDirectory campaigns={rows.map(({ campaign, clientName, publicEndsAt }) => ({ suspended: !!campaign.suspendedAt, publicEndsAt, id: campaign.id, name: campaign.name, slug: campaign.slug, preparationStatus: campaign.preparationStatus, publicationStatus: campaign.publicationStatus, priceCents: campaign.priceCents, endDate: campaign.endsAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), clientName }))} />
  </Workspace>;
}
