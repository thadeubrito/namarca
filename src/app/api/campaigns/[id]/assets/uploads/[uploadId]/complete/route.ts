import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaigns, campaignAssetUploads, campaignAssets } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { assertEditable, assertMutationOrigin, CampaignEditorError, editorErrorResponse, MAX_UPLOAD_BYTES, requireUuid, validatePng } from '@/lib/campaign-editor';
import { assertUploadBytes, temporaryUploadKey } from '@/lib/direct-upload';
import { getTemporaryUpload } from '@/lib/direct-upload-storage';
import { assertIdenticalUpload } from '@/lib/asset-upload';
import { getPrivateObject, putPrivateObject } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request, context: { params: Promise<{ id: string; uploadId: string }> }) {
  try {
    const admin = await requireAdmin(request.headers);
    assertMutationOrigin(request.headers.get('origin'), process.env.BETTER_AUTH_URL, process.env.NODE_ENV === 'development');
    const params = await context.params;
    const campaignId = requireUuid(params.id), id = requireUuid(params.uploadId);
    // Reject unauthorized attempts before touching storage. Recheck under locks below.
    const [authorization] = await db.select().from(campaignAssetUploads).where(eq(campaignAssetUploads.id, id));
    if (!authorization || authorization.campaignId !== campaignId || authorization.authorizedBy !== admin.user.id) throw new CampaignEditorError(404, 'Upload não encontrado');
    const result = await db.transaction(async tx => {
      const [campaign] = await tx.select().from(campaigns).where(eq(campaigns.id, campaignId)).for('update');
      if (!campaign) throw new CampaignEditorError(404, 'Campanha não encontrada');
      assertEditable(campaign);
      const [upload] = await tx.select().from(campaignAssetUploads).where(eq(campaignAssetUploads.id, id)).for('update');
      if (!upload || upload.campaignId !== campaignId || upload.authorizedBy !== admin.user.id) throw new CampaignEditorError(404, 'Upload não encontrado');
      const key = `private/campaigns/${campaignId}/assets/${id}.png`;
      const [existing] = await tx.select().from(campaignAssets).where(eq(campaignAssets.id, id));
      if (existing && (existing.campaignId !== campaignId || existing.kind !== upload.kind || existing.key !== key)) throw new CampaignEditorError(409, 'ID de upload já utilizado com outro material');
      if (existing && upload.completedAt) return { upload, width: existing.width, height: existing.height };
      if (upload.expiresAt.getTime() <= Date.now()) throw new CampaignEditorError(409, 'Autorização expirada. Tente enviar o arquivo novamente');
      const downloaded = await getTemporaryUpload(temporaryUploadKey(campaignId, id), MAX_UPLOAD_BYTES);
      const bytes = Buffer.from(downloaded.buffer, downloaded.byteOffset, downloaded.byteLength);
      assertUploadBytes(bytes, upload);
      const { width, height } = validatePng(bytes);
      // Upload URLs target only staging. Persist exactly the validated bytes, never
      // CopyObject from a staging object that a still-valid URL could overwrite.
      let stored = false;
      try {
        const object = await getPrivateObject(key);
        assertIdenticalUpload(object.body, bytes);
        stored = true;
      } catch (error) {
        if (!(error instanceof Error) || !['NoSuchKey', 'NotFound'].includes(error.name)) throw error;
      }
      if (!stored) await putPrivateObject(key, bytes, 'image/png');
      if (!existing) await tx.insert(campaignAssets).values({ id, campaignId, key, width, height, kind: upload.kind });
      await tx.update(campaignAssetUploads).set({ completedAt: new Date() }).where(eq(campaignAssetUploads.id, id));
      return { upload, width, height };
    });
    // Temporary objects intentionally stay isolated until a separately approved
    // retention policy exists. Deleting here could race a reauthorization/PUT.
    const { upload, width, height } = result;
    const material = { id, name: upload.name, file: `${id}.png`, width, height, ...(upload.kind === 'artwork' ? { reference: { x: 0, y: 0, width, height } } : {}) };
    return Response.json({ material, url: `/api/campaigns/${campaignId}/assets/${id}` }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return editorErrorResponse(error); }
}
