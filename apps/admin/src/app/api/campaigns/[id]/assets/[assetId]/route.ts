import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { campaignAssets } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { getPrivateObject } from "@/lib/storage";
import { CampaignEditorError, editorErrorResponse, requireUuid } from "@/lib/campaign-editor";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string; assetId: string }> }) {
  try {
    await requireAdmin(request.headers);
    const params = await context.params;
    const campaignId = requireUuid(params.id), assetId = requireUuid(params.assetId);
    const [asset] = await db.select().from(campaignAssets).where(and(eq(campaignAssets.id, assetId), eq(campaignAssets.campaignId, campaignId)));
    if (!asset || asset.key !== `private/campaigns/${campaignId}/assets/${asset.id}.png`) throw new CampaignEditorError(404, "Material não encontrado");
    let object;
    try { object = await getPrivateObject(asset.key); }
    catch (error) {
      if (error instanceof Error && ["NoSuchKey", "NotFound"].includes(error.name)) throw new CampaignEditorError(404, "Material não encontrado");
      throw error;
    }
    if (!object.body) throw new CampaignEditorError(404, "Material não encontrado");
    return new Response(new Uint8Array(object.body), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Length": String(object.body.length) } });
  } catch (error) { return editorErrorResponse(error); }
}
