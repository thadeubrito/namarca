import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { eventThemeStyle, parseEvent, resolveSlug, type EventConfig } from '../packages/editor/src/events/events';

const event: EventConfig = { slug: 'evento-teste', name: 'Evento teste', color: '#123456', demo: false, endsAt: '2099-12-31T23:59:59Z', artworks: [{ id: 'arte', name: 'Arte', file: 'arte.png', width: 400, height: 600, reference: { x: 20, y: 20, width: 360, height: 560 } }], stickers: [] };

test('contrato compartilhado preserva dimensões, referência e tema sem mutar configuração', () => {
  const original = structuredClone(event);
  const parsed = parseEvent(event, event.slug);
  assert.deepEqual(parsed.artworks, event.artworks);
  assert.deepEqual(eventThemeStyle({ ...parsed, theme: { primary: '#abcdef' } })['--theme-primary'], '#abcdef');
  assert.deepEqual(event, original);
  assert.equal(resolveSlug('/evento-teste'), event.slug);
  assert.equal(resolveSlug('/admin/campanhas/id'), null);
});

test('público rejeita manifesto vazio; rascunho da prévia pode ficar sem materiais', () => {
  const empty = { ...event, artworks: [] };
  assert.throws(() => parseEvent(empty, event.slug));
  assert.equal(parseEvent(empty, event.slug, { allowEmptyArtworks: true }).artworks.length, 0);
  assert.throws(() => parseEvent(event, 'outro-evento'));
});

test('duas entradas importam uma única implementação e CSS, sem depender de Next no runtime', async () => {
  for (const entry of ['main', 'preview']) {
    const source = await readFile(`apps/event/src/${entry}.tsx`, 'utf8');
    assert.match(source, /packages\/editor\/src\/editor\/PhotoEditor/);
    assert.match(source, /packages\/editor\/src\/styles\.css/);
    assert.doesNotMatch(source, /from ['"]next\//);
  }
  const publicSource = await readFile('apps/event/src/main.tsx', 'utf8');
  assert.doesNotMatch(publicSource, /postMessage|addEventListener\(['"]message/);
});
