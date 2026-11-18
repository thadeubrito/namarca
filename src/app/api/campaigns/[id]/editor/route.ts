import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, campaignEditor, campaignAssets } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { assertEditable, assertMutationOrigin, CampaignEditorError, defaultCampaignEvent, deriveCampaignEvent, editorErrorResponse, editorSaveInput, readLimitedBody, requireUuid, validateCampaignEvent } from "@/lib/campaign-editor";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const json = (data: unknown) => Response.json(data, { headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin(request.headers);
    const id = requireUuid((await context.params).id);
    const [row] = await db.select({ campaign: campaigns, editor: campaignEditor }).from(campaigns).leftJoin(campaignEditor, eq(campaignEditor.campaignId, campaigns.id)).where(eq(campaigns.id, id));
    if (!row) throw new CampaignEditorError(404, "Campanha não encontrada");
    return json({ event: row.editor ? deriveCampaignEvent(row.editor.config, row.campaign) : defaultCampaignEvent(row.campaign), revision: row.editor?.revision ?? 0 });
  } catch (error) { return editorErrorResponse(error); }
}

export async function PUT(request: Request, context: Context) {
  try {
    await requireAdmin(request.headers);
    assertMutationOrigin(request.headers.get("origin"), process.env.BETTER_AUTH_URL, process.env.NODE_ENV === "development");
    const id = requireUuid((await context.params).id);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new CampaignEditorError(422, "JSON obrigatório");
    let body: unknown;
    try { body = JSON.parse((await readLimitedBody(request, 1024 * 1024)).toString("utf8")); }
    catch (error) { if (error instanceof CampaignEditorError) throw error; throw new CampaignEditorError(422, "JSON inválido"); }
    const input = editorSaveInput.safeParse(body);
    if (!input.success) throw new CampaignEditorError(422, "Configuração e revisão obrigatórias");
    const saved = await db.transaction(async (tx) => {
      // Also serializes first writes, where no campaign_editor row exists yet.
      const [campaign] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).for("update");
      if (!campaign) throw new CampaignEditorError(404, "Campanha não encontrada");
      assertEditable(campaign);
      const [current] = await tx.select().from(campaignEditor).where(eq(campaignEditor.campaignId, id)).for("update");
      if ((current?.revision ?? 0) !== input.data.revision) throw new CampaignEditorError(409, "O rascunho mudou. Recarregue antes de salvar");
      const assets = await tx.select().from(campaignAssets).where(eq(campaignAssets.campaignId, id));
      const event = validateCampaignEvent(input.data.event, campaign, assets);
      const revision = input.data.revision + 1;
      if (current) await tx.update(campaignEditor).set({ config: event, revision, updatedAt: new Date() }).where(eq(campaignEditor.campaignId, id));
      else await tx.insert(campaignEditor).values({ campaignId: id, config: event, revision });
      return { event, revision };
    });
    return json(saved);
  } catch (error) { return editorErrorResponse(error); }
}
