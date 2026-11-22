import test from "node:test";
import assert from "node:assert/strict";
import { nextPaymentStatus } from "../apps/admin/src/lib/pixgo";
import { publicManifestSchema } from "../apps/admin/src/lib/storage";

test("paid only advances to refunded, which is terminal and separate from publication", () => {
  for (const status of ["pending", "paid", "expired", "cancelled"] as const) assert.equal(nextPaymentStatus("paid", status), "paid");
  assert.equal(nextPaymentStatus("pending", "paid"), "paid");
  assert.equal(nextPaymentStatus("expired", "pending"), "expired");
  assert.equal(nextPaymentStatus("cancelled", "paid"), "paid");
  assert.equal(nextPaymentStatus("paid", "refunded"), "refunded");
  assert.equal(nextPaymentStatus("refunded", "paid"), "refunded");
});
test("public manifests reject commercial or personal information", () => {
  const manifest = { version: 1, slug: "minha-campanha", name: "Campanha", endsAt: "2030-01-01T00:00:00Z", assets: [{ key: "public/creative.png", contentType: "image/png" }] };
  assert.equal(publicManifestSchema.safeParse(manifest).success, true);
  for (const key of ["priceCents", "paymentId", "cpf", "payer", "preparationStatus"]) assert.equal(publicManifestSchema.safeParse({ ...manifest, [key]: "private" }).success, false);
  assert.equal(publicManifestSchema.safeParse({ ...manifest, assets: [{ key: "private/contract.pdf", contentType: "image/png" }] }).success, false);
  assert.equal(publicManifestSchema.safeParse({ ...manifest, assets: [{ key: "public/../secret", contentType: "image/png" }] }).success, false);
});
