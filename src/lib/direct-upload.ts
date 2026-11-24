import { createHash } from 'node:crypto';
import { z } from 'zod';
import { CampaignEditorError, MAX_UPLOAD_BYTES, UUID, decodeAssetName } from './campaign-editor';

const inputSchema = z.object({
  id: z.string().regex(UUID).transform(value => value.toLowerCase()),
  name: z.string().min(1).max(200),
  kind: z.enum(['artwork', 'sticker']),
  byteLength: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export function parseUploadAuthorization(value: unknown) {
  const result = inputSchema.safeParse(value);
  if (!result.success) throw new CampaignEditorError(422, 'Dados de upload inválidos');
  return { ...result.data, name: decodeAssetName(encodeURIComponent(result.data.name)) };
}
export function temporaryUploadKey(campaignId: string, id: string) {
  if (!UUID.test(campaignId) || !UUID.test(id)) throw new CampaignEditorError(422, 'Upload inválido');
  return `private/uploads/${campaignId.toLowerCase()}/${id.toLowerCase()}.png`;
}
export function assertUploadBytes(bytes: Uint8Array, expected: { byteLength: number; sha256: string }) {
  if (bytes.byteLength !== expected.byteLength || createHash('sha256').update(bytes).digest('hex') !== expected.sha256) {
    throw new CampaignEditorError(409, 'O arquivo difere do upload autorizado. Selecione o mesmo PNG e tente novamente');
  }
}
export function assertUploadBinding(existing: { campaignId: string; authorizedBy: string; kind: string; byteLength: number; sha256: string }, expected: { campaignId: string; authorizedBy: string; kind: string; byteLength: number; sha256: string }) {
  if (existing.campaignId !== expected.campaignId || existing.authorizedBy !== expected.authorizedBy || existing.kind !== expected.kind || existing.byteLength !== expected.byteLength || existing.sha256 !== expected.sha256) {
    throw new CampaignEditorError(409, 'ID de upload já utilizado com outro material');
  }
}
