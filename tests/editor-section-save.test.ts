import { test } from "node:test";
import assert from "node:assert/strict";
import { CampaignEditorError, defaultCampaignEvent, editorSaveInput, resolveEditorSave } from "../src/lib/campaign-editor";
import { removedAssetIds } from "../src/lib/asset-cleanup-policy";

const campaign = { name: "Campanha", slug: "campanha", endsAt: new Date("2030-01-01T12:00:00Z") };
const artworkId = "01234567-89ab-4cde-8fab-0123456789ab";
const stickerId = "11234567-89ab-4cde-8fab-0123456789ab";
const assets = [
  { id: artworkId, width: 20, height: 10, kind: "artwork" as const },
  { id: stickerId, width: 20, height: 10, kind: "sticker" as const },
];
function snapshot() {
  return { revision: 7, config: {
    ...defaultCampaignEvent(campaign), color: "#123456",
    artworks: [{ id: artworkId, name: "Arte", file: `${artworkId}.png`, width: 20, height: 10, reference: { x: 0, y: 0, width: 20, height: 10 } }],
    stickers: [{ id: stickerId, name: "Figurinha", file: `${stickerId}.png` }],
  } };
}
const status = (code: number) => (error: unknown) => error instanceof CampaignEditorError && error.status === code;

test("scope aceita somente artworks/stickers/theme e mantém contrato legado", () => {
  for (const scope of [undefined, "artworks", "stickers", "theme"]) {
    assert.equal(editorSaveInput.safeParse({ event: {}, revision: 0, scope }).success, true);
  }
  for (const scope of ["colors", "color", "", null, [], 1]) {
    assert.equal(editorSaveInput.safeParse({ event: {}, revision: 0, scope }).success, false);
  }
  const current = snapshot();
  const event = { ...current.config, artworks: [], stickers: [], color: "#abcdef" };
  const saved = resolveEditorSave(editorSaveInput.parse({ event, revision: 7 }), current, campaign, assets);
  assert.deepEqual(saved.event.artworks, []);
  assert.deepEqual(saved.event.stickers, []);
  assert.equal(saved.event.color, "#abcdef");
  assert.equal(saved.revision, 8);
});

test("artworks ignora figurinhas/tema inválidos e não agenda remoção de outra aba", () => {
  const current = snapshot();
  const input = editorSaveInput.parse({ scope: "artworks", revision: 7, event: { artworks: [], stickers: [{ id: "não pertence", file: "evil.png" }], theme: { version: 999 }, color: "invalid", demo: true, unknown: true } });
  const saved = resolveEditorSave(input, current, campaign, assets);
  assert.deepEqual(saved.event, { ...current.config, artworks: [] });
  assert.deepEqual(removedAssetIds(current.config, saved.event), [artworkId]);
  assert.equal(current.config.artworks.length, 1);
});

test("stickers ignora arte inválida e persiste somente a seção selecionada", () => {
  const current = snapshot();
  const saved = resolveEditorSave({ scope: "stickers", revision: 7, event: { stickers: [], artworks: "invalid", theme: null, color: "#ffffff" } }, current, campaign, assets);
  assert.deepEqual(saved.event, { ...current.config, stickers: [] });
  assert.deepEqual(removedAssetIds(current.config, saved.event), [stickerId]);
});

test("theme preserva color legado, materiais e identidade; cleanup vazio", () => {
  const current = snapshot();
  const theme = { ...current.config.theme!, accent: "#abcdef" };
  const saved = resolveEditorSave({ scope: "theme", revision: 7, event: { theme, color: "#ffffff", artworks: [], stickers: [], name: "Outro", demo: true } }, current, campaign, assets);
  assert.deepEqual(saved.event, { ...current.config, theme });
  assert.deepEqual(removedAssetIds(current.config, saved.event), []);
});

test("primeiro salvamento scoped usa defaults, sem incorporar payload de outras abas", () => {
  const base = defaultCampaignEvent(campaign);
  for (const scope of ["artworks", "stickers", "theme"] as const) {
    const saved = resolveEditorSave({ scope, revision: 0, event: { [scope]: base[scope], color: "invalid", demo: true, name: null } }, undefined, campaign, []);
    assert.deepEqual(saved, { event: base, revision: 1 });
  }
});

test("config mesclada inteira continua validada: alvo, ownership e seções retidas", () => {
  const current = snapshot();
  assert.throws(() => resolveEditorSave({ scope: "theme", revision: 7, event: { theme: { version: 999 } } }, current, campaign, assets), status(422));
  assert.throws(() => resolveEditorSave({ scope: "artworks", revision: 7, event: { artworks: current.config.artworks } }, current, campaign, [assets[1]]), status(422));
  // Retained artwork ownership must still be checked even when saving only stickers.
  assert.throws(() => resolveEditorSave({ scope: "stickers", revision: 7, event: { stickers: [] } }, current, campaign, []), status(422));
  for (const event of [null, [], {}, { stickers: [] }]) {
    assert.throws(() => resolveEditorSave({ scope: "artworks", revision: 7, event }, current, campaign, assets), status(422));
  }
});

test("revisão global rejeita aba obsoleta inclusive após salvar outra seção", () => {
  const current = snapshot();
  const saved = resolveEditorSave({ scope: "artworks", revision: 7, event: { artworks: [] } }, current, campaign, assets);
  const next = { config: saved.event, revision: saved.revision };
  for (const scope of [undefined, "artworks", "stickers", "theme"] as const) {
    assert.throws(() => resolveEditorSave({ scope, revision: 7, event: null }, next, campaign, assets), status(409));
  }
  assert.throws(() => resolveEditorSave({ scope: "theme", revision: 1, event: {} }, undefined, campaign, []), status(409));
  assert.deepEqual(next.config.stickers, current.config.stickers);
  assert.equal(next.revision, 8);
});
