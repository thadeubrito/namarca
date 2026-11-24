import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { contrastText, themeDefaults, campaignThemeStyle, parseCampaign, resolveSlug, type CampaignConfig } from '../src/lib/campaigns/campaigns';

const event: CampaignConfig = { slug: 'evento-teste', name: 'Evento teste', color: '#123456', demo: false, endsAt: '2099-12-31T23:59:59Z', artworks: [{ id: 'arte', name: 'Arte', file: 'arte.png', width: 400, height: 600, reference: { x: 20, y: 20, width: 360, height: 560 } }], stickers: [] };

test('contrato compartilhado preserva dimensões, referência e tema sem mutar configuração', () => {
  const original = structuredClone(event);
  const parsed = parseCampaign(event, event.slug);
  assert.deepEqual(parsed.artworks, event.artworks);
  assert.deepEqual(campaignThemeStyle({ ...parsed, theme: { version: 1, ...themeDefaults, accent: '#abcdef' } })['--theme-primary'], '#abcdef');
  assert.deepEqual(event, original);
  assert.equal(resolveSlug('/evento-teste'), event.slug);
  assert.equal(resolveSlug('/admin/campanhas/id'), null);
});

test('padrão do editor usa identidade Namarca e preserva paletas explícitas', () => {
  assert.deepEqual(themeDefaults, { background: '#ffffff', surface: '#dedede', accent: '#494fdf', text: '#191c1f' });
  assert.equal(contrastText(themeDefaults.accent), '#ffffff');
  const custom = { version: 1 as const, background: '#202522', surface: '#fafbf8', accent: '#173f35', text: '#263b2e' };
  assert.deepEqual(parseCampaign({ ...event, theme: custom }, event.slug).theme, custom);
  assert.equal(campaignThemeStyle({ ...event, theme: custom })['--theme-accent'], custom.accent);
});

test('tema v1 exige quatro cores completas e rejeita versões e campos antigos', () => {
  const theme = { version: 1 as const, ...themeDefaults };
  assert.deepEqual(parseCampaign({ ...event, theme }, event.slug).theme, theme);
  for (const invalid of [{ ...theme, version: 2 }, { ...theme, version: undefined }, { ...theme, primary: '#ffffff' }, { ...theme, text: undefined }, { ...theme, accent: 'red' }, { ...theme, mutedText: '#ffffff' }]) {
    assert.throws(() => parseCampaign({ ...event, theme: invalid }, event.slug));
  }
});

test('cores derivadas são consistentes com e sem tema e calculam contraste sRGB', () => {
  assert.deepEqual(campaignThemeStyle(event), campaignThemeStyle({ ...event, theme: { version: 1, ...themeDefaults } }));
  assert.equal(contrastText('#000000'), '#ffffff');
  assert.equal(contrastText('#ffffff'), '#000000');
  assert.equal(contrastText('#173f35'), '#ffffff');
  assert.equal(contrastText('#e7a15b'), '#000000');
  const style = campaignThemeStyle({ ...event, theme: { version: 1, ...themeDefaults, accent: '#eeeeee', text: '#123456' } });
  assert.equal(style['--theme-primary'], style['--theme-accent']);
  assert.equal(style['--theme-muted-text'], '#123456');
  assert.equal(style['--theme-on-primary'], '#000000');
  assert.match(style['--theme-border'], /color-mix/);
});

test('público rejeita manifesto vazio; rascunho da prévia pode ficar sem materiais', () => {
  const empty = { ...event, artworks: [] };
  assert.throws(() => parseCampaign(empty, event.slug));
  assert.equal(parseCampaign(empty, event.slug, { allowEmptyArtworks: true }).artworks.length, 0);
  assert.throws(() => parseCampaign(event, 'outro-evento'));
});

test('entradas Next compartilham editor client-only, CSS isolado e rota slug nativa', async () => {
  for (const entry of ['PublicCampaignEditor', 'CampaignPreview']) {
    const source = await readFile(`src/editor/${entry}.tsx`, 'utf8');
    assert.match(source, /['"]use client['"]/);
    assert.match(source, /\.\/isolated\.css/);
    assert.match(source, /campaign-editor-scope/);
    assert.doesNotMatch(source, /postMessage|addEventListener\(['"]message|createRoot|<iframe/);
  }
  const client = await readFile('src/editor/CampaignEditorClient.tsx', 'utf8');
  const preview = await readFile('src/editor/CampaignPreview.tsx', 'utf8');
  for (const source of [client, preview]) {
    assert.match(source, /dynamic\(/);
    assert.match(source, /import\(['"]\.\/PhotoEditor['"]\)/);
    assert.match(source, /ssr:\s*false/);
  }
  assert.doesNotMatch(preview, /fetch\(|\/packages\//);
  const page = await readFile('src/app/[slug]/page.tsx', 'utf8');
  assert.match(page, /PublicCampaignEditor/);
  assert.match(page, /slug=\{slug\}/);
  assert.doesNotMatch(page, /iframe|campaign-runtime|readFile/);
});


test('prévia sem arte mantém shell real e quadriculado apenas na composição', async () => {
  const preview = await readFile('src/editor/CampaignPreview.tsx', 'utf8');
  const css = await readFile('src/editor/isolated.css', 'utf8');
  const editor = await readFile('src/editor/PhotoEditor.tsx', 'utf8');
  const workspace = await readFile('src/editor/EditorWorkspace.tsx', 'utf8');
  assert.match(preview, /<PhotoEditor event=/);
  assert.doesNotMatch(preview, /artworks.length \?|Adicione uma arte PNG para experimentar/);
  assert.match(editor, /if \(!event.artworks.length\)/);
  assert.match(editor, /!hasArtwork && <div className="preview-empty-artwork" role="img"/);
  assert.match(editor, /compositionReady=\{!!c\}/);
  assert.match(workspace, /!compositionReady && \(name === 'Foto' \|\| name === 'Salvar'\)/);
  assert.match(css, /repeating-conic-gradient/);
  assert.match(css, /data-admin-theme=dark/);
  assert.match(css, /\.campaign-editor-scope/);
  assert.match(css, /@container/);
  assert.doesNotMatch(css, /(?:^|\})\s*(?:html|body|:root)\s*\{/);
  assert.doesNotMatch(css, /\.editor-page\[data-admin-theme[^}]*background: transparent/);
});
