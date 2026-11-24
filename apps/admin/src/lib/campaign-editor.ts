import { PNG } from "pngjs";
import { z } from "zod";
import { themeDefaults, parseCampaign, type CampaignConfig } from "@namarca/editor/campaigns";

export class CampaignEditorError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
export type CampaignIdentity = { name: string; slug: string; endsAt: Date };
export type EditorAsset = { id: string; width: number; height: number; kind: "artwork" | "sticker" };
export function requireUuid(value: string) {
  if (!UUID.test(value)) throw new CampaignEditorError(404, "Não encontrado");
  return value.toLowerCase();
}
export function assertEditable(campaign: { preparationStatus: string; publicationStatus: string }) {
  if (campaign.preparationStatus !== "draft" || !["unpublished", "published"].includes(campaign.publicationStatus)) {
    throw new CampaignEditorError(409, "Esta campanha não está disponível para edição");
  }
}
export function assertMutationOrigin(origin: string | null, baseUrl: string | undefined, development = false) {
  let supplied: URL;
  try { supplied = new URL(origin ?? ""); } catch { throw new CampaignEditorError(403, "Origem não permitida"); }
  let configured = "";
  try { configured = new URL(baseUrl ?? "").origin; } catch { /* fail closed */ }
  if (origin !== supplied.origin || (supplied.origin !== configured && !(development && ["http://localhost:3000", "http://127.0.0.1:3000"].includes(supplied.origin)))) {
    throw new CampaignEditorError(403, "Origem não permitida");
  }
}
export async function readLimitedBody(request: Request, limit: number): Promise<Buffer> {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > limit)) throw new CampaignEditorError(413, "Corpo muito grande");
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new CampaignEditorError(413, "Corpo muito grande"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}
export function decodeAssetName(header: string | null) {
  let name: string;
  try { name = decodeURIComponent(header ?? "").trim(); } catch { throw new CampaignEditorError(422, "Nome de arquivo inválido"); }
  if (!name || name.length > 200 || /[\x00-\x1f\x7f/\\]/.test(name)) throw new CampaignEditorError(422, "Nome de arquivo inválido");
  return name;
}
export function validatePng(bytes: Buffer): { width: number; height: number } {
  if (bytes.length > MAX_UPLOAD_BYTES) throw new CampaignEditorError(413, "PNG excede o limite de 25 MiB");
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(signature) || bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR") throw new CampaignEditorError(422, "PNG inválido");
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (!width || !height) throw new CampaignEditorError(422, "Dimensões inválidas");
  if (width * height > MAX_IMAGE_PIXELS) throw new CampaignEditorError(413, "Imagem excede 40 milhões de pixels");
  let png: PNG;
  try { png = PNG.sync.read(bytes, { checkCRC: true }); } catch { throw new CampaignEditorError(422, "PNG inválido"); }
  let transparent = false, opaque = false;
  for (let i = 3; i < png.data.length; i += 4) {
    transparent ||= png.data[i] === 0;
    opaque ||= png.data[i] === 255;
    if (transparent && opaque) break;
  }
  if (!transparent || !opaque) throw new CampaignEditorError(422, "PNG deve conter pixels transparentes e opacos");
  return { width, height };
}
export function deriveCampaignConfig(event: CampaignConfig, campaign: CampaignIdentity): CampaignConfig {
  return { ...event, name: campaign.name, slug: campaign.slug, endsAt: campaign.endsAt.toISOString().replace(/\.\d{3}Z$/, "Z") };
}
export function defaultCampaignConfig(campaign: CampaignIdentity): CampaignConfig {
  return deriveCampaignConfig({ name: "", slug: "", endsAt: "", color: themeDefaults.accent, demo: false, theme: { version: 1, ...themeDefaults }, artworks: [], stickers: [] }, campaign);
}
const material = z.object({ id: z.string().regex(UUID), name: z.string().trim().min(1).max(200), file: z.string().regex(/^[0-9a-f-]{36}\.png$/i) });
const rectangle = z.object({ x: z.number().finite().nonnegative(), y: z.number().finite().nonnegative(), width: z.number().finite().positive(), height: z.number().finite().positive() }).strict();
const eventInput = z.object({
  name: z.string(), slug: z.string(), endsAt: z.string(), color: z.string(), demo: z.boolean(),
  theme: z.object({ version: z.literal(1), background: z.string(), surface: z.string(), accent: z.string(), text: z.string() }).strict().optional(),
  artworks: z.array(material.extend({ width: z.number().int().positive(), height: z.number().int().positive(), reference: rectangle }).strict()),
  stickers: z.array(material.extend({ width: z.number().int().positive().optional(), height: z.number().int().positive().optional() }).strict()),
}).strict();
export const editorSaveInput = z.object({ event: z.unknown(), revision: z.number().int().min(0).max(2147483646), scope: z.enum(["artworks", "stickers", "theme"]).optional() }).strict();

// Call only with the current snapshot read under the campaign/editor write locks.
// The global revision also protects writes to different sections from stale tabs.
export function resolveEditorSave(input: z.infer<typeof editorSaveInput>, current: { config: CampaignConfig; revision: number } | undefined, campaign: CampaignIdentity, assets: readonly EditorAsset[]) {
  if ((current?.revision ?? 0) !== input.revision) throw new CampaignEditorError(409, "O rascunho mudou. Recarregue antes de salvar");
  let candidate = input.event;
  if (input.scope !== undefined) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate) || !Object.hasOwn(candidate, input.scope)) throw new CampaignEditorError(422, "Configuração inválida");
    const base = current?.config ?? defaultCampaignConfig(campaign);
    // Never spread the incoming event: other sections (and legacy color) are ignored.
    candidate = { ...base, [input.scope]: (candidate as Record<string, unknown>)[input.scope] };
  }
  return { event: validateCampaignConfig(candidate, campaign, assets), revision: input.revision + 1 };
}
export function validateCampaignConfig(input: unknown, campaign: CampaignIdentity, assets: readonly EditorAsset[]): CampaignConfig {
  const result = eventInput.safeParse(input);
  if (!result.success) throw new CampaignEditorError(422, "Configuração inválida");
  const supplied = result.data;
  const owned = new Map(assets.map((asset) => [asset.id.toLowerCase(), asset]));
  const seen = new Set<string>();
  for (const [kind, items] of [["artwork", supplied.artworks], ["sticker", supplied.stickers]] as const) {
    for (const item of items) {
      const id = item.id.toLowerCase();
      const asset = owned.get(id);
      if (seen.has(id) || !asset || asset.kind !== kind || item.file !== `${asset.id}.png`) throw new CampaignEditorError(422, "Material inválido ou não pertence à campanha");
      seen.add(id);
      if ((item.width !== undefined && item.width !== asset.width) || (item.height !== undefined && item.height !== asset.height)) throw new CampaignEditorError(422, "Dimensões divergentes do arquivo");
    }
  }
  const derived = deriveCampaignConfig(supplied, campaign);
  // The published parser requires an artwork; drafts intentionally permit an empty gallery.
  const empty = derived.artworks.length === 0;
  const placeholder = { id: "draft-placeholder", name: "Rascunho", file: "placeholder.png", width: 1, height: 1, reference: { x: 0, y: 0, width: 1, height: 1 } };
  try {
    const parsed = parseCampaign({ ...derived, artworks: empty ? [placeholder] : derived.artworks }, campaign.slug);
    return { ...parsed, artworks: empty ? [] : parsed.artworks };
  } catch { throw new CampaignEditorError(422, "Configuração inválida"); }
}
export function editorErrorResponse(error: unknown) {
  if (error instanceof CampaignEditorError) return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  if (error instanceof Error && "status" in error && error.status === 403) return Response.json({ error: "Autenticação administrativa necessária" }, { status: 403 });
  return Response.json({ error: "Não foi possível concluir a operação" }, { status: 503 });
}
