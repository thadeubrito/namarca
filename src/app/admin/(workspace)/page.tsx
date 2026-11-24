import { desc, eq, sql } from 'drizzle-orm';
import { CampaignCreateDialog } from '@/components/admin-workspace/campaign-create-dialog';
import { db } from '@/db';
import { campaigns, clients, campaignEditor, campaignPublications, campaignPublicationHistory } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import type { CampaignConfig } from '@/lib/campaigns/campaigns';
import { defaultCampaignConfig, deriveCampaignConfig } from '@/lib/campaign-editor';
import { hasUnpublishedChanges } from '@/lib/publication-state';
import { Workspace, PageIntro } from '@/components/admin-workspace/primitives';
import { CampaignDirectory } from '@/components/admin-workspace/campaign-directory';

export default async function CampaignsPage() {
  await requireAdmin();
  const rows = await db.select({ campaign: campaigns, clientName: clients.name, editorConfig: campaignEditor.config, deliveryPending: sql<boolean>`${campaignPublications.campaignId} is not null and ${campaignPublications.deliveredAt} is null`, publicConfig: sql<CampaignConfig | null>`coalesce(case when ${campaignPublications.deliveredAt} is not null then ${campaignPublications.config} end, (select h.config from ${campaignPublicationHistory} h where h.campaign_id = ${campaigns.id} order by h.delivered_at desc, h.version desc limit 1))`, publicEndsAt: sql<string | null>`coalesce(case when ${campaignPublications.deliveredAt} is not null then ${campaignPublications.config}->>'endsAt' end, (select h.config->>'endsAt' from ${campaignPublicationHistory} h where h.campaign_id = ${campaigns.id} order by h.delivered_at desc, h.version desc limit 1))` }).from(campaigns).leftJoin(clients, eq(campaigns.clientId, clients.id)).leftJoin(campaignPublications, eq(campaignPublications.campaignId, campaigns.id)).leftJoin(campaignEditor, eq(campaignEditor.campaignId, campaigns.id)).orderBy(desc(campaigns.createdAt));
  return <Workspace>
    <PageIntro title="Campanhas" description="Encontre o evento e continue de onde parou." action={<CampaignCreateDialog />} />
    <CampaignDirectory campaigns={rows.map(({ campaign, clientName, publicEndsAt, publicConfig, editorConfig, deliveryPending }) => ({ deliveryPending, unpublishedChanges: !!publicConfig && hasUnpublishedChanges(editorConfig ? deriveCampaignConfig(editorConfig, campaign) : defaultCampaignConfig(campaign), publicConfig), suspended: !!campaign.suspendedAt, publicEndsAt, id: campaign.id, name: campaign.name, slug: campaign.slug, publicationStatus: campaign.publicationStatus, priceCents: campaign.priceCents, endDate: campaign.endsAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), clientName }))} />
  </Workspace>;
}
