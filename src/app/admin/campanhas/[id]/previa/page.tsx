import { requireAdmin } from '@/lib/admin';
import { CampaignPreview } from '@/components/campaign-preview';

export const dynamic = 'force-dynamic';
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  return <CampaignPreview campaignId={id} />;
}
