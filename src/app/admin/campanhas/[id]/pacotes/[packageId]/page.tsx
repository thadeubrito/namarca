import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaignPackages } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { UUID } from '@/lib/campaign-editor';
import { Workspace, PageIntro, Notice, Surface, ActionLink } from '@/components/admin-workspace/primitives';
export const dynamic = 'force-dynamic';
export default async function PackagePreviewPage({ params }: { params: Promise<{ id: string; packageId: string }> }) {
  await requireAdmin();
  const { id, packageId } = await params;
  if (!UUID.test(id) || !UUID.test(packageId)) notFound();
  const [snapshot] = await db.select().from(campaignPackages).where(and(eq(campaignPackages.id, packageId), eq(campaignPackages.campaignId, id)));
  if (!snapshot) notFound();
  return <Workspace><PageIntro eyebrow="Campanhas / Versão preservada" title={`Pacote aprovado v${snapshot.version}`} description={`Aprovação registrada por ${snapshot.approvedBy}`} action={<ActionLink href={`/admin/campanhas/${id}`}>Voltar à campanha</ActionLink>} /><Notice role="note">Prévia privada · pacote aprovado v{snapshot.version}. Esta versão não é uma publicação pública.</Notice><Surface className="mx-auto w-full max-w-xl"><iframe src={`/event-runtime/preview.html?campaignId=${encodeURIComponent(id)}&packageId=${encodeURIComponent(packageId)}`} title="Prévia do pacote aprovado" allow="web-share" className="block h-[844px] max-h-[90dvh] w-full border-0" /></Surface></Workspace>;
}
