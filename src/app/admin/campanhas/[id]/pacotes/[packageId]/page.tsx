import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaignPackages } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { UUID } from '@/lib/campaign-editor';
import { CampaignPreview } from '@/components/campaign-preview';
export const dynamic = 'force-dynamic';
export default async function PackagePreviewPage({ params }: { params: Promise<{ id: string; packageId: string }> }) {
  await requireAdmin();
  const { id, packageId } = await params;
  if (!UUID.test(id) || !UUID.test(packageId)) notFound();
  const [snapshot] = await db.select().from(campaignPackages).where(and(eq(campaignPackages.id, packageId), eq(campaignPackages.campaignId, id)));
  if (!snapshot) notFound();
  return <><div className="notice">Prévia privada · pacote aprovado v{snapshot.version}. Esta versão não é uma publicação pública.</div><CampaignPreview campaignId={id} initialEvent={snapshot.config} /></>;
}
