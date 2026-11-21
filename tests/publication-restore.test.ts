import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolvePublishedRestore } from '../src/lib/publication-restore';
import { defaultCampaignEvent } from '../src/lib/campaign-editor';

const id = '11111111-1111-4111-8111-111111111111';
const campaign = { name: 'Private edit', slug: 'fixed', endsAt: new Date('2099-01-01'), updatedAt: new Date('2026-01-01'), preparationStatus: 'draft', publicationStatus: 'published' };
const config = { ...defaultCampaignEvent({ ...campaign, name: 'Published', endsAt: new Date('2000-01-01') }), artworks: [{ id, name: 'Original', file: `artworks/${id}.png`, width: 2, height: 2, reference: { x: 0, y: 0, width: 2, height: 2 } }], stickers: [{ id: '22222222-2222-4222-8222-222222222222', name: 'Sticker', file: 'releases/old/sticker.png' }] };
const publication = { config, version: 3, deliveredAt: new Date('1999-01-01') };
const assets = [{ id, kind: 'artwork' as const, width: 2, height: 2 }, { id: config.stickers[0].id, kind: 'sticker' as const, width: 2, height: 2 }];
const run = (p = publication, revision = 8, timestamp = campaign.updatedAt.toISOString(), version = 3) => resolvePublishedRestore(campaign, { revision: 8 }, p, assets, revision, timestamp, version);

test('restore uses delivered snapshot, permits expired deadline and normalizes public/legacy files without mutation', () => {
  const before = structuredClone(publication);
  const restored = run();
  assert.equal(restored.name, 'Published');
  assert.equal(restored.slug, 'fixed');
  assert.equal(restored.endsAt.toISOString(), '2000-01-01T00:00:00.000Z');
  assert.equal(restored.revision, 9);
  assert.deepEqual(restored.config.theme, config.theme);
  assert.deepEqual(restored.config.artworks[0].reference, config.artworks[0].reference);
  assert.equal(restored.config.artworks[0].file, `${id}.png`);
  assert.equal(restored.config.stickers[0].file, `${config.stickers[0].id}.png`);
  assert.deepEqual(publication, before);
});

test('restore rejects pending, missing publication/editor, stale revision/details/version and overflow', () => {
  assert.throws(() => run({ ...publication, deliveredAt: null! }), /Conclua/);
  assert.throws(() => run(publication, 7), /mudou/);
  assert.throws(() => run(publication, 8, '2025-01-01T00:00:00.000Z'), /mudou/);
  for (const version of [2, 4, NaN, 3.5]) assert.throws(() => run(publication, 8, campaign.updatedAt.toISOString(), version), /mudou/);
  assert.throws(() => resolvePublishedRestore(campaign, undefined, publication, assets, 8, campaign.updatedAt.toISOString(), 3), /mudou/);
  assert.throws(() => resolvePublishedRestore(campaign, { revision: 8 }, undefined, assets, 8, campaign.updatedAt.toISOString(), 3), /Conclua/);
  assert.throws(() => resolvePublishedRestore(campaign, { revision: 2147483647 }, publication, assets, 2147483647, campaign.updatedAt.toISOString(), 3), /limite/);
});

test('restore revalidates ownership, dimensions, reference, slug and editability', () => {
  assert.throws(() => resolvePublishedRestore(campaign, { revision: 8 }, publication, [], 8, campaign.updatedAt.toISOString(), 3), /Material/);
  assert.throws(() => run({ ...publication, config: { ...config, slug: 'other' } }), /endereço/);
  assert.throws(() => run({ ...publication, config: { ...config, artworks: [{ ...config.artworks[0], width: 99 }] } }), /Dimensões/);
  assert.throws(() => run({ ...publication, config: { ...config, artworks: [{ ...config.artworks[0], reference: { x: -1, y: 0, width: 1, height: 1 } }] } }), /Configuração/);
  assert.throws(() => resolvePublishedRestore({ ...campaign, preparationStatus: 'approved' }, { revision: 8 }, publication, assets, 8, campaign.updatedAt.toISOString(), 3), /edição/);
});

test('discard action requires admin, exact single form values, safe canonical integers and both revalidations', () => {
  const source = readFileSync(new URL('../src/app/(workspace)/campanhas/[id]/publication-actions.ts', import.meta.url), 'utf8');
  const action = source.slice(source.indexOf('export async function discardUnpublishedChanges'), source.indexOf('export type AccessState'));
  assert.match(action, /await requireAdmin\(\)/);
  assert.match(action, /form.getAll/);
  assert.match(action, /values.length === 1/);
  assert.match(action, /Number.isSafeInteger/);
  assert.match(action, /toISOString\(\) !== updatedAt/);
  assert.match(action, /restorePublishedDraft\(id, Number\(revision\), updatedAt, Number\(version\)\)/);
  assert.match(action, /revalidatePath\('\/'\)/);
  assert.match(action, /revalidatePath\(`\/campanhas\/\$\{id\}`\)/);
});
