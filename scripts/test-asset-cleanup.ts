// Container-only focal integration. Refuses the main database and deletes only its UUID fixtures.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { campaigns, campaignAssets, campaignEditor, campaignPackages } from "../src/db/schema";
import { cleanupCampaignAssets } from "../src/lib/asset-cleanup";
import { campaignAssetKey } from "../src/lib/asset-cleanup-policy";
import { defaultCampaignEvent } from "../src/lib/campaign-editor";
import { deletePrivateObject, getPrivateObject, putPrivateObject } from "../src/lib/storage";

async function main() {
assert.match(new URL(process.env.DATABASE_URL!).pathname, /_editor_test$/, "Disposable database required");
const campaignId = randomUUID();
const ids = Array.from({ length: 5 }, () => randomUUID());
const [removed, retained, dbOnly, recent, orphan] = ids;
const identity = { name: "Cleanup focal fixture", slug: `cleanup-${campaignId}`, endsAt: new Date("2099-01-01") };
const empty = defaultCampaignEvent(identity);
const historic = { ...empty, artworks: [{ id: retained, name: "Retained", file: `${retained}.png`, width: 2, height: 2, reference: { x: 0, y: 0, width: 2, height: 2 } }] };
try {
  await db.insert(campaigns).values({ id: campaignId, ...identity });
  await db.insert(campaignEditor).values({ campaignId, config: empty });
  // Historical reference intentionally has NO campaign_assets row.
  await db.insert(campaignPackages).values({ campaignId, version: 1, editorRevision: 1, config: historic, approvedBy: "Fixture", channel: "email", approvedAt: new Date(), recordedBy: "fixture" });
  await db.insert(campaignAssets).values([removed, dbOnly, recent].map((id) => ({ id, campaignId, key: campaignAssetKey(campaignId, id), width: 2, height: 2, kind: "artwork" as const, createdAt: new Date(Date.now() - (id === recent ? 0 : 48 * 3600_000)) })));
  for (const id of [removed, retained, orphan]) await putPrivateObject(campaignAssetKey(campaignId, id), Buffer.from("fixture"), "image/png");
  const analysis = await cleanupCampaignAssets(campaignId);
  assert.ok("candidates" in analysis);
  assert.deepEqual(analysis.candidates.map((c) => c.id), [dbOnly]);
  const manual = await cleanupCampaignAssets(campaignId, { ids: [dbOnly, recent, retained, orphan] });
  assert.ok("deleted" in manual);
  assert.deepEqual(manual.deleted, [dbOnly]);
  assert.deepEqual(manual.failed, []);
  assert.deepEqual(manual.skipped, [recent, retained, orphan]);
  const saved = await cleanupCampaignAssets(campaignId, { ids: [removed, retained], afterSave: true });
  assert.ok("deleted" in saved);
  assert.deepEqual(saved.deleted, [removed]);
  assert.deepEqual(saved.failed, []);
  assert.deepEqual(saved.skipped, [retained]);
  assert.equal((await getPrivateObject(campaignAssetKey(campaignId, retained))).body?.length, 7);
  assert.equal((await db.select().from(campaignAssets).where(eq(campaignAssets.id, removed))).length, 0);
  await assert.rejects(() => getPrivateObject(campaignAssetKey(campaignId, removed)));
  console.log("PASS cleanup focal: age, exact scope, historical retention without metadata, immediate save removal");
} finally {
  for (const id of ids) await deletePrivateObject(campaignAssetKey(campaignId, id));
  await db.delete(campaignPackages).where(eq(campaignPackages.campaignId, campaignId));
  await db.delete(campaigns).where(eq(campaigns.id, campaignId));
  await pool.end();
}
}
main().catch((error) => { console.error("FAIL cleanup focal integration", error instanceof assert.AssertionError ? error.message : error?.code ?? error?.name ?? "unknown"); process.exitCode = 1; });
