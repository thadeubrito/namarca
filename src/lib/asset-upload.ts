import { randomUUID } from "node:crypto";
import { CampaignEditorError, requireUuid, UUID } from "./campaign-editor";

export function uploadAssetId(header: string | null): string {
  if (header === null) return randomUUID();
  if (!UUID.test(header)) throw new CampaignEditorError(422, "X-Upload-Id inválido");
  return requireUuid(header);
}
export function assertIdenticalUpload(stored: Uint8Array | undefined, uploaded: Uint8Array): void {
  if (!stored || !Buffer.from(stored).equals(uploaded)) throw new CampaignEditorError(409, "Conteúdo divergente para o ID de upload");
}
