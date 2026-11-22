import assert from "node:assert/strict";
import test from "node:test";
import { assetIdFromKey, campaignAssetKey, CLEANUP_BATCH_LIMIT, CLEANUP_MIN_AGE_MS, oldEnough, referencedAssetIds, removedAssetIds } from "../apps/admin/src/lib/asset-cleanup-policy";

const campaign = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const asset = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const second = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const config = (ids: string[]) => ({ artworks: ids.map((id) => ({ id, file: `${id}.png` })), stickers: [] });

test("cleanup accepts only exact campaign prefix and UUID.png filenames", () => {
  assert.equal(assetIdFromKey(campaign, campaignAssetKey(campaign, asset)), asset);
  for (const key of [campaignAssetKey(other, asset), `private/campaigns/${campaign}/assets/nested/${asset}.png`, `${campaignAssetKey(campaign, asset)}.bak`, `private/campaigns/${campaign}/assets/../${asset}.png`]) assert.equal(assetIdFromKey(campaign, key), undefined);
  assert.throws(() => campaignAssetKey(campaign, "../../anything"));
});
test("manual cleanup requires complete 24 hours and known dates", () => {
  const now = new Date("2026-11-19T00:00:00Z");
  assert.equal(oldEnough(new Date(now.getTime() - CLEANUP_MIN_AGE_MS), now), true);
  assert.equal(oldEnough(new Date(now.getTime() - CLEANUP_MIN_AGE_MS + 1), now), false);
  assert.equal(oldEnough(undefined, now), false);
  assert.equal(oldEnough(new Date(NaN), now), false);
  assert.equal(CLEANUP_BATCH_LIMIT, 100);
});
test("save cleanup scopes deletion to removed previous IDs, not unused uploads", () => {
  assert.deepEqual(removedAssetIds(config([asset, second]), config([second])), [asset]);
  assert.deepEqual(removedAssetIds(config([asset]), config([asset, second])), []);
});
test("retention recognizes historical IDs and filenames even without DB rows", () => {
  const ids = referencedAssetIds({ artworks: [{ id: asset.toUpperCase(), file: `${second}.png` }], stickers: [] });
  assert.deepEqual([...ids], [asset, second]);
  assert.throws(() => referencedAssetIds({ artworks: null, stickers: [] }));
});
