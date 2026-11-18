import { test } from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { assertEditable, assertMutationOrigin, CampaignEditorError, decodeAssetName, defaultCampaignEvent, deriveCampaignEvent, editorSaveInput, MAX_UPLOAD_BYTES, readLimitedBody, validateCampaignEvent, validatePng } from "../src/lib/campaign-editor";

const campaign = { name: "Campanha real", slug: "campanha-real", endsAt: new Date("2030-01-01T12:00:00Z") };
const id = "01234567-89ab-4cde-8fab-0123456789ab";
const asset = { id, width: 20, height: 10, kind: "artwork" as const };
function event() {
  return { ...defaultCampaignEvent(campaign), artworks: [{ id, name: "Arte", file: `${id}.png`, width: 20, height: 10, reference: { x: 0, y: 0, width: 20, height: 10 } }] };
}
const status = (code: number) => (error: unknown) => error instanceof CampaignEditorError && error.status === code;

test("draft vazio é permitido; identidade sempre vem da campanha", () => {
  const empty = defaultCampaignEvent(campaign);
  assert.deepEqual(empty.artworks, []);
  const saved = validateCampaignEvent({ ...empty, name: "ignorado", slug: "ignorado", endsAt: "ignorado" }, campaign, []);
  assert.equal(saved.name, campaign.name);
  assert.equal(saved.slug, campaign.slug);
  assert.equal(saved.endsAt, "2030-01-01T12:00:00Z");
  assert.deepEqual(saved.artworks, []);
  assert.equal(deriveCampaignEvent(saved, { ...campaign, name: "Novo" }).name, "Novo");
});
test("valida referência estrita, dimensões, tipo, propriedade e duplicatas globais", () => {
  assert.equal(validateCampaignEvent(event(), campaign, [asset]).artworks.length, 1);
  assert.throws(() => validateCampaignEvent(event(), campaign, []), status(422));
  assert.throws(() => validateCampaignEvent(event(), campaign, [{ ...asset, kind: "sticker" }]), status(422));
  assert.throws(() => validateCampaignEvent(event(), campaign, [{ ...asset, width: 21 }]), status(422));
  const outOfBounds = event(); outOfBounds.artworks[0].reference.x = 0.01;
  assert.throws(() => validateCampaignEvent(outOfBounds, campaign, [asset]), status(422));
  assert.throws(() => validateCampaignEvent({ ...event(), stickers: [{ id, name: "Duplicado", file: `${id}.png` }] }, campaign, [asset]), status(422));
  const traversal = event(); traversal.artworks[0].file = `../${id}.png`;
  assert.throws(() => validateCampaignEvent(traversal, campaign, [asset]), status(422));
  const unknownField = { ...event(), paymentId: "private" };
  assert.throws(() => validateCampaignEvent(unknownField, campaign, [asset]), status(422));
  assert.throws(() => validateCampaignEvent({ ...event(), theme: { primary: "url(evil)" } }, campaign, [asset]), status(422));
});
test("revisão obrigatória e estados não editáveis", () => {
  assert.equal(editorSaveInput.safeParse({ event: {}, revision: 0 }).success, true);
  for (const revision of [-1, 0.5, 2147483647, "0", undefined]) assert.equal(editorSaveInput.safeParse({ event: {}, revision }).success, false);
  assertEditable({ preparationStatus: "draft", publicationStatus: "unpublished" });
  assert.throws(() => assertEditable({ preparationStatus: "approved", publicationStatus: "unpublished" }), status(409));
  assert.throws(() => assertEditable({ preparationStatus: "draft", publicationStatus: "published" }), status(409));
});
test("CSRF falha fechado e localhost só é permitido em desenvolvimento", () => {
  assertMutationOrigin("https://admin.example", "https://admin.example/path");
  assertMutationOrigin("http://127.0.0.1:3000", undefined, true);
  assertMutationOrigin("http://localhost:3000", undefined, true);
  for (const origin of [null, "null", "https://evil.example", "https://admin.example/path", "http://localhost:3000"]) assert.throws(() => assertMutationOrigin(origin, "https://admin.example"), status(403));
  assert.throws(() => assertMutationOrigin("http://localhost.evil:3000", undefined, true), status(403));
});
function png(alpha: number[]) {
  const image = new PNG({ width: alpha.length, height: 1 });
  image.data.fill(255);
  alpha.forEach((value, i) => { image.data[i * 4 + 3] = value; });
  return PNG.sync.write(image);
}
test("PNG exige transparência e conteúdo opaco reais e limita pixels antes de decodificar", () => {
  assert.deepEqual(validatePng(png([0, 128, 255])), { width: 3, height: 1 });
  for (const alpha of [[0], [255], [128], [0, 128]]) assert.throws(() => validatePng(png(alpha)), status(422));
  assert.throws(() => validatePng(Buffer.from("not a png")), status(422));
  const bomb = png([0, 255]); bomb.writeUInt32BE(40_000_001, 16);
  assert.throws(() => validatePng(bomb), status(413));
  assert.throws(() => validatePng(Buffer.alloc(MAX_UPLOAD_BYTES + 1)), status(413));
  const corrupt = png([0, 255]); corrupt[29] ^= 255;
  assert.throws(() => validatePng(corrupt), status(422));
});
test("limite de corpo é aplicado no stream, não só no Content-Length", async () => {
  const request = new Request("http://localhost", { method: "POST", body: "12345" });
  await assert.rejects(readLimitedBody(request, 4), status(413));
  assert.equal((await readLimitedBody(new Request("http://localhost", { method: "POST", body: "1234" }), 4)).toString(), "1234");
});
test("nome é decodificado e não aceita caminhos ou controles", () => {
  assert.equal(decodeAssetName(encodeURIComponent("Arte São Paulo.png")), "Arte São Paulo.png");
  for (const name of [null, "%", "..%2Fsecret.png", "%00bad.png", ""]) assert.throws(() => decodeAssetName(name), status(422));
});
