import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultCampaignEvent } from '../src/lib/campaign-editor';
import { publicationArtifacts } from '../src/lib/publication-artifacts';
import { hasUnpublishedChanges } from '../src/lib/publication-state';
import { readFile } from 'node:fs/promises';

const base = { ...defaultCampaignEvent({ name: 'Evento', slug: 'evento', endsAt: new Date('2099-01-01') }), artworks: [{ id: '10000000-0000-4000-8000-000000000001', name: 'Arte', file: '10000000-0000-4000-8000-000000000001.png', width: 2, height: 2, reference: { x: 0, y: 0, width: 2, height: 2 } }] };
test('publicação compara conteúdo público, não caminhos de release nem ordem de JSONB', () => {
  const published = publicationArtifacts(base, 12).event;
  const legacy = { ...published, artworks: published.artworks.map(item => ({ ...item, file: `releases/${'a'.repeat(64)}/${item.id}.png` })) };
  assert.equal(hasUnpublishedChanges(base, legacy), false);
  assert.equal(hasUnpublishedChanges(base, publicationArtifacts(base, 1).event), false);
  assert.equal(hasUnpublishedChanges(base, published), false);
  assert.equal(hasUnpublishedChanges(Object.fromEntries(Object.entries(base).reverse()) as typeof base, published), false);
  for (const draft of [{ ...base, name: 'Novo nome' }, { ...base, endsAt: '2099-02-01T00:00:00Z' }, { ...base, artworks: [] }, { ...base, theme: { ...base.theme!, background: '#000000' } }]) assert.equal(hasUnpublishedChanges(draft, published), true);
  assert.equal(hasUnpublishedChanges({ ...base, notes: 'somente interno' } as typeof base, published), false);
});
test('checkbox é exclusivo da primeira publicação e servidor verifica registro existente', async () => {
  const ui = await readFile('src/components/admin-workspace/publication.tsx', 'utf8');
  const action = await readFile('src/app/(workspace)/campanhas/[id]/publication-actions.ts', 'utf8');
  assert.match(ui, /!published && <label/);
  assert.match(action, /!existing && form\.get\('confirm'\)/);
  assert.match(ui, /Alterações não publicadas/);
  assert.match(ui, /Publicação atualizada/);
});
