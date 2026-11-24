import { eq } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, campaignEditor, campaignAssets } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { assertEditable, assertMutationOrigin, CampaignEditorError, defaultCampaignConfig, deriveCampaignConfig, editorErrorResponse, editorSaveInput, readLimitedBody, requireUuid, resolveEditorSave } from "@/lib/campaign-editor";

import { cleanupCampaignAssets } from "@/lib/asset-cleanup";
import { CLEANUP_BATCH_LIMIT, removedAssetIds } from "@/lib/asset-cleanup-policy";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const json = (data: unknown) => Response.json(data, { headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request, context: Context) {
  try {
    const session = await requireAdmin(request.headers);
    const id = requireUuid((await context.params).id);
    const [row] = await db.select({ campaign: campaigns, editor: campaignEditor }).from(campaigns).leftJoin(campaignEditor, eq(campaignEditor.campaignId, campaigns.id)).where(eq(campaigns.id, id));
    if (!row) throw new CampaignEditorError(404, "Campanha não encontrada");
    return json({ event: row.editor ? deriveCampaignConfig(row.editor.config, row.campaign) : defaultCampaignConfig(row.campaign), revision: row.editor?.revision ?? 0, draftOwner: session.user.id });
  } catch (error) { return editorErrorResponse(error); }
}

export async function PUT(request: Request, context: Context) {
  try {
    const session = await requireAdmin(request.headers);
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
      const assets = await tx.select().from(campaignAssets).where(eq(campaignAssets.campaignId, id));
      const { event, revision } = resolveEditorSave(input.data, current, campaign, assets);
      if (current) await tx.update(campaignEditor).set({ config: event, revision, updatedAt: new Date() }).where(eq(campaignEditor.campaignId, id));
      else await tx.insert(campaignEditor).values({ campaignId: id, config: event, revision });
      return { event, revision, removedIds: current ? removedAssetIds(current.config, event) : [] };
    });
    const { removedIds, ...snapshot } = saved;
    const cleanup = { deleted: [] as string[], failed: [] as string[] };
    // The save is already committed. A cleanup failure must never turn it into a failed save.
    for (let start = 0; start < removedIds.length; start += CLEANUP_BATCH_LIMIT) {
      const ids = removedIds.slice(start, start + CLEANUP_BATCH_LIMIT);
      try {
        const result = await cleanupCampaignAssets(id, { ids, afterSave: true });
        if ("deleted" in result) { cleanup.deleted.push(...result.deleted); cleanup.failed.push(...result.failed); }
      } catch { cleanup.failed.push(...ids); }
    }
    return json({ ...snapshot, draftOwner: session.user.id, cleanup, ...(cleanup.failed.length ? { cleanupWarning: "Configuração salva; alguns materiais não puderam ser limpos" } : {}) });
  } catch (error) { return editorErrorResponse(error); }
}
