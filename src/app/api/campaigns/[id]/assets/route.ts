import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, campaignAssets } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { putPrivateObject } from "@/lib/storage";
import { assertEditable, assertMutationOrigin, CampaignEditorError, decodeAssetName, editorErrorResponse, MAX_UPLOAD_BYTES, readLimitedBody, requireUuid, validatePng } from "@/lib/campaign-editor";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request.headers);
    assertMutationOrigin(request.headers.get("origin"), process.env.BETTER_AUTH_URL, process.env.NODE_ENV === "development");
    const campaignId = requireUuid((await context.params).id);
    const kind = new URL(request.url).searchParams.get("kind");
    if (kind !== "artwork" && kind !== "sticker") throw new CampaignEditorError(422, "Tipo de material inválido");
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "image/png") throw new CampaignEditorError(422, "Envie PNG como corpo da requisição");
    const name = decodeAssetName(request.headers.get("x-asset-name"));
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId));
    if (!campaign) throw new CampaignEditorError(404, "Campanha não encontrada");
    assertEditable(campaign);
    const bytes = await readLimitedBody(request, MAX_UPLOAD_BYTES);
    const { width, height } = validatePng(bytes);
    const id = randomUUID();
    const key = `private/campaigns/${campaignId}/assets/${id}.png`;
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(campaigns).where(eq(campaigns.id, campaignId)).for("update");
      if (!locked) throw new CampaignEditorError(404, "Campanha não encontrada");
      assertEditable(locked);
      // A failed DB commit may leave an unreferenced private object, never a public one.
      await putPrivateObject(key, bytes, "image/png");
      await tx.insert(campaignAssets).values({ id, campaignId, key, width, height, kind });
    });
    const material = { id, name, file: `${id}.png`, width, height, ...(kind === "artwork" ? { reference: { x: 0, y: 0, width, height } } : {}) };
    return Response.json({ material, url: `/api/campaigns/${campaignId}/assets/${id}` }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return editorErrorResponse(error); }
}
