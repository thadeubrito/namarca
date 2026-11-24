import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePublicationCampaigns } from '../apps/admin/src/lib/publication-diff';
import { hasUnpublishedChanges } from '../apps/admin/src/lib/publication-state';
import { themeDefaults, type CampaignConfig } from '@namarca/editor/campaigns';

const art = (id: string) => ({ id, name: `Arte ${id}`, file: `${id}.png`, width: 100, height: 100, reference: { x: 0, y: 0, width: 50, height: 50 } });
const base: CampaignConfig = { slug: 'evento', name: 'Evento', color: '#494fdf', demo: false, endsAt: '2099-01-01T00:00:00Z', artworks: [art('a'), art('b')], stickers: [{ id: 's', name: 'Figurinha', file: 's.png' }, { id: 't', name: 'Outra', file: 't.png' }] };
const clone = () => structuredClone(base);

test('ignora ordem JSONB, caminhos, campos privados e normaliza defaults/HEX do tema', () => {
  const next = clone();
  next.artworks = next.artworks.map(item => ({ ...item, file: `releases/hash/${item.id}.png`, reference: { height: 50, width: 50, y: 0, x: 0 } }));
  next.stickers[0].file = 'outro/caminho.png';
  next.theme = { version: 1, ...themeDefaults, accent: themeDefaults.accent.toUpperCase() };
  next.color = next.color.toUpperCase();
  const reordered = Object.fromEntries(Object.entries({ ...next, notes: 'Privado', client: 'Privado' }).reverse()) as unknown as CampaignConfig;
  assert.equal(comparePublicationCampaigns(base, reordered).hasChanges, false);
  assert.equal(hasUnpublishedChanges(reordered, base), false);
  assert.deepEqual(base.artworks[0], art('a'));
});
test('compara todos os campos públicos escalares e as quatro cores', () => {
  const next: CampaignConfig = { ...clone(), slug: 'novo', name: 'Novo nome', endsAt: '2099-02-01T00:00:00Z', demo: true, color: '#123456', theme: { version: 1, background: '#111111', surface: '#222222', accent: '#333333', text: '#444444' } };
  const diff = comparePublicationCampaigns(base, next);
  assert.equal(diff.hasChanges, true);
  assert.deepEqual(diff.fields.map(item => item.field), ['slug', 'name', 'endsAt', 'demo', 'color', 'theme.background', 'theme.surface', 'theme.accent', 'theme.text']);
  assert.deepEqual(diff.fields[1], { field: 'name', before: 'Evento', after: 'Novo nome' });
  assert.equal(diff.artworks.modified.length, 0);
});
test('materiais por ID: inclusão, remoção, renomeação, dimensões e referência', () => {
  const next = clone();
  next.artworks = [{ ...art('a'), name: 'Renomeada', width: 120, height: 110, reference: { x: 1, y: 2, width: 40, height: 45 } }, art('c')];
  next.stickers = [{ ...next.stickers[0], name: 'Figurinha nova' }, { id: 'u', name: 'Nova', file: 'u.png' }];
  const diff = comparePublicationCampaigns(base, next);
  assert.deepEqual(diff.artworks.added.map(item => item.id), ['c']);
  assert.deepEqual(diff.artworks.removed.map(item => item.id), ['b']);
  assert.deepEqual(diff.artworks.modified[0].changes.map(item => item.field), ['name', 'width', 'height', 'reference']);
  assert.deepEqual(diff.artworks.modified[0].changes[3], { field: 'reference', before: base.artworks[0].reference, after: next.artworks[0].reference });
  assert.equal(diff.stickers.modified[0].changes[0].field, 'name');
  assert.equal(diff.stickers.added[0].id, 'u');
  assert.equal(diff.stickers.removed[0].id, 't');
  assert.deepEqual(diff.artworks.reordered, []);
});
test('detecta ordem das duas bibliotecas sem confundir inserção/remoção com reordenação', () => {
  const next = clone();
  next.artworks.reverse();
  next.stickers.reverse();
  const diff = comparePublicationCampaigns(base, next);
  assert.deepEqual(diff.artworks.reordered.map(({ id, before, after }) => ({ id, before, after })), [{ id: 'b', before: 2, after: 1 }, { id: 'a', before: 1, after: 2 }]);
  assert.equal(diff.stickers.reordered.length, 2);
  assert.equal(diff.artworks.modified.length, 0);
  const inserted = clone();
  inserted.artworks.unshift(art('c'));
  assert.deepEqual(comparePublicationCampaigns(base, inserted).artworks.reordered, []);
  assert.deepEqual(comparePublicationCampaigns(base, { ...clone(), artworks: [art('b')] }).artworks.reordered, []);
});
test('rascunho vazio e comparação inversa preservam semântica de inclusão/remoção', () => {
  const empty = { ...clone(), artworks: [], stickers: [] };
  assert.equal(comparePublicationCampaigns(base, empty).artworks.removed.length, 2);
  assert.equal(comparePublicationCampaigns(empty, base).artworks.added.length, 2);
  assert.equal(comparePublicationCampaigns(empty, empty).hasChanges, false);
});
test('usa validação pública para rejeitar configurações inválidas', () => {
  assert.throws(() => comparePublicationCampaigns(base, { ...clone(), theme: { version: 2 } } as unknown as CampaignConfig), /Configuração inválida/);
});
