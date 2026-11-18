import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaignPackages } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { requireUuid, CampaignEditorError, editorErrorResponse } from '@/lib/campaign-editor';

export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ id: string; packageId: string }> }) {
  try {
    await requireAdmin(request.headers);
    const values = await params;
    const id = requireUuid(values.id);
    const packageId = requireUuid(values.packageId);
    const [snapshot] = await db.select({ config: campaignPackages.config }).from(campaignPackages).where(and(eq(campaignPackages.id, packageId), eq(campaignPackages.campaignId, id)));
    if (!snapshot) throw new CampaignEditorError(404, 'Pacote não encontrado');
    return Response.json({ event: snapshot.config }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return editorErrorResponse(error); }
}
