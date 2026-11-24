import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { cleanupCampaignAssets } from "@/lib/asset-cleanup";
import { CLEANUP_BATCH_LIMIT } from "@/lib/asset-cleanup-policy";
import { assertMutationOrigin, CampaignEditorError, editorErrorResponse, readLimitedBody, requireUuid, UUID } from "@/lib/campaign-editor";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const json = (data: unknown) => Response.json(data, { headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin(request.headers);
    return json(await cleanupCampaignAssets(requireUuid((await context.params).id)));
  } catch (error) { return editorErrorResponse(error); }
}
const confirmation = z.object({ ids: z.array(z.string().regex(UUID).transform((id) => id.toLowerCase())).min(1).max(CLEANUP_BATCH_LIMIT).refine((ids) => new Set(ids).size === ids.length) }).strict();
export async function POST(request: Request, context: Context) {
  try {
    await requireAdmin(request.headers);
    assertMutationOrigin(request.headers.get("origin"), process.env.BETTER_AUTH_URL, process.env.NODE_ENV === "development");
    const id = requireUuid((await context.params).id);
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new CampaignEditorError(422, "JSON obrigatório");
    let body: unknown;
    try { body = JSON.parse((await readLimitedBody(request, 16 * 1024)).toString("utf8")); }
    catch (error) { if (error instanceof CampaignEditorError) throw error; throw new CampaignEditorError(422, "JSON inválido"); }
    const parsed = confirmation.safeParse(body);
    if (!parsed.success) throw new CampaignEditorError(422, "Informe de 1 a 100 IDs UUID únicos");
    try { return json(await cleanupCampaignAssets(id, { ids: parsed.data.ids })); }
    catch (error) {
      if (error instanceof CampaignEditorError) throw error;
      return json({ deleted: [], failed: parsed.data.ids, warning: "Não foi possível confirmar a limpeza; analise novamente antes de tentar" });
    }
  } catch (error) { return editorErrorResponse(error); }
}
