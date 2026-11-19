import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { contrastText, themeDefaults, eventThemeStyle, parseEvent, resolveSlug, type EventConfig } from '../packages/editor/src/events/events';

const event: EventConfig = { slug: 'evento-teste', name: 'Evento teste', color: '#123456', demo: false, endsAt: '2099-12-31T23:59:59Z', artworks: [{ id: 'arte', name: 'Arte', file: 'arte.png', width: 400, height: 600, reference: { x: 20, y: 20, width: 360, height: 560 } }], stickers: [] };

test('contrato compartilhado preserva dimensões, referência e tema sem mutar configuração', () => {
  const original = structuredClone(event);
  const parsed = parseEvent(event, event.slug);
  assert.deepEqual(parsed.artworks, event.artworks);
  assert.deepEqual(eventThemeStyle({ ...parsed, theme: { version: 1, ...themeDefaults, accent: '#abcdef' } })['--theme-primary'], '#abcdef');
  assert.deepEqual(event, original);
  assert.equal(resolveSlug('/evento-teste'), event.slug);
  assert.equal(resolveSlug('/admin/campanhas/id'), null);
});

test('tema v1 exige quatro cores completas e rejeita versões e campos antigos', () => {
  const theme = { version: 1 as const, ...themeDefaults };
  assert.deepEqual(parseEvent({ ...event, theme }, event.slug).theme, theme);
  for (const invalid of [{ ...theme, version: 2 }, { ...theme, version: undefined }, { ...theme, primary: '#ffffff' }, { ...theme, text: undefined }, { ...theme, accent: 'red' }, { ...theme, mutedText: '#ffffff' }]) {
    assert.throws(() => parseEvent({ ...event, theme: invalid }, event.slug));
  }
});

test('cores derivadas são consistentes com e sem tema e calculam contraste sRGB', () => {
  assert.deepEqual(eventThemeStyle(event), eventThemeStyle({ ...event, theme: { version: 1, ...themeDefaults } }));
  assert.equal(contrastText('#000000'), '#ffffff');
  assert.equal(contrastText('#ffffff'), '#000000');
  assert.equal(contrastText('#173f35'), '#ffffff');
  assert.equal(contrastText('#e7a15b'), '#000000');
  const style = eventThemeStyle({ ...event, theme: { version: 1, ...themeDefaults, accent: '#eeeeee', text: '#123456' } });
  assert.equal(style['--theme-primary'], style['--theme-accent']);
  assert.equal(style['--theme-muted-text'], '#123456');
  assert.equal(style['--theme-on-primary'], '#000000');
  assert.match(style['--theme-border'], /color-mix/);
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
  const previewSource = await readFile('apps/event/src/preview.tsx', 'utf8');
  assert.doesNotMatch(previewSource, /fetch\(|\/api\/campaigns\/.*\/packages\//);
  assert.match(previewSource, /!query\.has\('packageId'\)/);
  const publicSource = await readFile('apps/event/src/main.tsx', 'utf8');
  assert.doesNotMatch(publicSource, /postMessage|addEventListener\(['"]message/);
});
