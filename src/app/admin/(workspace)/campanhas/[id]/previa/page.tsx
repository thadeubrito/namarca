import { requireAdmin } from '@/lib/admin';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaigns, campaignEditor } from '@/db/schema';
import { UUID, defaultCampaignConfig, deriveCampaignConfig } from '@/lib/campaign-editor';
import { CampaignPreview } from '@/editor/CampaignPreview';

export const dynamic = 'force-dynamic';
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [row] = await db.select({ campaign: campaigns, editor: campaignEditor }).from(campaigns)
    .leftJoin(campaignEditor, eq(campaignEditor.campaignId, campaigns.id)).where(eq(campaigns.id, id));
  if (!row) notFound();
  const event = row.editor ? deriveCampaignConfig(row.editor.config, row.campaign) : defaultCampaignConfig(row.campaign);
  return <div style={{ height: 'min(800px, 85dvh)', position: 'relative' }}><CampaignPreview campaignId={id} event={event} /></div>;
}
