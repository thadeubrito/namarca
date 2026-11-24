import assert from "node:assert/strict";
import test from "node:test";
import { assertIdenticalUpload, uploadAssetId } from "../src/lib/asset-upload";
import { CampaignEditorError, UUID } from "../src/lib/campaign-editor";

test("upload uses stable client UUID and generates UUID only without header", () => {
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  assert.equal(uploadAssetId(id), id);
  assert.equal(uploadAssetId(id.toUpperCase()), id);
  assert.match(uploadAssetId(null), UUID);
  for (const bad of ["", "../key", "not-a-uuid"]) assert.throws(() => uploadAssetId(bad), (error) => error instanceof CampaignEditorError && error.status === 422);
});
test("idempotency requires identical bytes, not just identical dimensions or length", () => {
  assert.doesNotThrow(() => assertIdenticalUpload(new Uint8Array([1, 2]), Buffer.from([1, 2])));
  for (const existing of [undefined, new Uint8Array([2, 1]), new Uint8Array([1])]) {
    assert.throws(() => assertIdenticalUpload(existing, new Uint8Array([1, 2])), (error) => error instanceof CampaignEditorError && error.status === 409);
  }
});
