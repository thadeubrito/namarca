import assert from 'node:assert/strict';
import test from 'node:test';
import type { EventConfig } from '@namarca/editor/events';
import { discardStudioScope } from '../src/lib/studio-discard';
import type { LocalMaterial } from '../src/lib/studio-draft';

const saved: EventConfig = { name: 'Salvo', slug: 'evento', endsAt: '2030-01-01T00:00:00Z', demo: false, color: '#123456', artworks: [{ id: 'a', name: 'Arte', file: 'a.png', width: 10, height: 10, reference: { x: 0, y: 0, width: 10, height: 10 } }], stickers: [{ id: 's', name: 'Figurinha', file: 's.png' }] };
const local: LocalMaterial[] = [
  { id: 'a', kind: 'artwork', file: new Blob(['saved']), uploaded: true },
  { id: 'new-a', kind: 'artwork', file: new Blob(['art']), uploaded: true },
  { id: 'new-s', kind: 'sticker', file: new Blob(['sticker']), uploaded: false },
];
const edited: EventConfig = { ...saved, name: 'Identidade atual', color: '#ffffff', artworks: [{ ...saved.artworks[0], name: 'Editado' }, { ...saved.artworks[0], id: 'new-a' }], stickers: [...saved.stickers, { id: 'new-s', name: 'Nova', file: 'new-s.png' }], theme: { version: 1, background: '#ffffff', surface: '#ffffff', text: '#000000', accent: '#ffffff' } };

test('descartar artes restaura lista/referência/ordem sem tocar identidade, outras abas ou blobs salvos', () => {
  const before = structuredClone(edited);
  const next = discardStudioScope(edited, saved, local, 'artworks');
  assert.equal(next.event.artworks, saved.artworks);
  assert.equal(next.event.stickers, edited.stickers);
  assert.equal(next.event.theme, edited.theme);
  assert.equal(next.event.name, edited.name);
  assert.equal(next.event.color, edited.color);
  assert.deepEqual(next.materials, [local[0], local[2]]);
  assert.equal(next.materials[1].file, local[2].file);
  assert.equal(next.dirty, true);
  assert.deepEqual(edited, before);
  assert.equal(local.length, 3);
});

test('descartar figurinhas preserva artes e seus envios parciais', () => {
  const next = discardStudioScope(edited, saved, local, 'stickers');
  assert.equal(next.event.stickers, saved.stickers);
  assert.equal(next.event.artworks, edited.artworks);
  assert.deepEqual(next.materials, [local[0], local[1]]);
  assert.equal(next.dirty, true);
});

test('descartar tema ausente restaura legado salvo e não remove materiais', () => {
  const next = discardStudioScope(edited, saved, local, 'theme');
  assert.equal(next.event.theme, undefined);
  assert.equal(next.event.color, saved.color);
  assert.deepEqual(next.materials, local);
  assert.equal(next.dirty, true);
});

test('descarte final fica totalmente limpo; tema explícito e legado não são derivados um do outro', () => {
  const baseline = { ...saved, theme: edited.theme };
  const next = discardStudioScope({ ...baseline, theme: undefined, color: '#abcdef' }, baseline, [], 'theme');
  assert.equal(next.event.theme, baseline.theme);
  assert.equal(next.event.color, saved.color);
  assert.equal(next.dirty, false);
});
