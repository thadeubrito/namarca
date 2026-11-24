import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaigns, campaignAssetUploads, campaignAssets } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { assertEditable, assertMutationOrigin, CampaignEditorError, editorErrorResponse, readLimitedBody, requireUuid } from '@/lib/campaign-editor';
import { assertUploadBinding, parseUploadAuthorization, temporaryUploadKey } from '@/lib/direct-upload';
import { signTemporaryUpload } from '@/lib/direct-upload-storage';

export const runtime = 'nodejs';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request.headers);
    assertMutationOrigin(request.headers.get('origin'), process.env.BETTER_AUTH_URL, process.env.NODE_ENV === 'development');
    const campaignId = requireUuid((await context.params).id);
    let body: unknown;
    try { body = JSON.parse((await readLimitedBody(request, 4096)).toString('utf8')); }
    catch (error) { if (error instanceof CampaignEditorError) throw error; throw new CampaignEditorError(422, 'Dados de upload inválidos'); }
    const input = parseUploadAuthorization(body);
    const expected = { ...input, campaignId, authorizedBy: admin.user.id };
    // PUT must start within 5 minutes; allow slow uploads time to finish.
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const completed = await db.transaction(async tx => {
      const [campaign] = await tx.select().from(campaigns).where(eq(campaigns.id, campaignId)).for('update');
      if (!campaign) throw new CampaignEditorError(404, 'Campanha não encontrada');
      assertEditable(campaign);
      // Conflict-safe insert also serializes collisions across different campaigns.
      await tx.insert(campaignAssetUploads).values({ ...expected, expiresAt }).onConflictDoNothing();
      const [upload] = await tx.select().from(campaignAssetUploads).where(eq(campaignAssetUploads.id, input.id)).for('update');
      assertUploadBinding(upload, expected);
      const [asset] = await tx.select().from(campaignAssets).where(eq(campaignAssets.id, input.id));
      if (asset && (asset.campaignId !== campaignId || asset.kind !== input.kind)) throw new CampaignEditorError(409, 'ID de upload já utilizado com outro material');
      if (asset && upload.completedAt) return true;
      // Cleanup may have removed a previously completed asset: reauthorize its exact bytes.
      await tx.update(campaignAssetUploads).set({ expiresAt, completedAt: null }).where(eq(campaignAssetUploads.id, input.id));
      return false;
    });
    const url = completed ? undefined : await signTemporaryUpload(temporaryUploadKey(campaignId, input.id), input.byteLength);
    return Response.json({ id: input.id, completed, url, expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), finalizeBefore: expiresAt.toISOString() }, { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) { return editorErrorResponse(error); }
}
