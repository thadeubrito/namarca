import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { validatePreview, type PreviewInput } from '../src/editor/preview-config';
import { parseCampaign } from '../src/lib/campaigns/campaigns';

const preview = readFileSync('src/editor/CampaignPreview.tsx', 'utf8');
const editor = readFileSync('src/editor/PhotoEditor.tsx', 'utf8');
const file = '12345678-1234-1234-1234-123456789abc.png';
const sticker = '22345678-1234-1234-1234-123456789abc.png';
const origin = 'http://localhost:3000';
const input: PreviewInput = {
  campaignId: '12345678-1234-1234-1234-123456789abc',
  event: { slug: 'teste', name: 'Teste', color: '#123456', demo: false, endsAt: '2099-12-31T23:59:59Z', artworks: [{ id: 'art', name: 'Arte', file, width: 400, height: 600, reference: { x: 0, y: 0, width: 400, height: 600 } }], stickers: [{ id: 'sticker', name: 'Figurinha', file: sticker }] },
};
const validateAssets = (localAssets: unknown) => validatePreview({ ...input, localAssets } as PreviewInput, origin).assetUrls;

test('prévia aceita somente materiais da campanha e blobs same-origin sem mutar props', () => {
  const assets = { [file]: `blob:${origin}/art`, [sticker]: `blob:${origin}/sticker` };
  const props = structuredClone({ ...input, localAssets: assets, selectedArtworkId: 'art', adminTheme: 'dark' as const });
  const before = structuredClone(props);
  assert.deepEqual(validatePreview(props, origin), { event: parseCampaign(props.event, props.event.slug), assetUrls: assets, selectedArtworkId: 'art', adminTheme: 'dark' });
  assert.deepEqual(props, before);
  assert.deepEqual(validateAssets(undefined), {});
  assert.deepEqual(validateAssets({}), {});
  for (const invalid of [null, [], 'url', 1, Object.create({ [file]: `blob:${origin}/art` }), { photo: `blob:${origin}/photo` }, { ['32345678-1234-1234-1234-123456789abc.png']: `blob:${origin}/other` }]) {
    assert.throws(() => validateAssets(invalid));
  }
});

test('prévia rejeita schemes, hosts, portas e valores inválidos sem normalizar prefixo', () => {
  for (const url of [null, 1, {}, '', origin + '/art.png', 'data:image/png;base64,AAAA', 'javascript:alert(1)', 'blob:https://elsewhere.test/id', 'blob:http://localhost:3001/id', 'blob:http://localhost:3000.evil.test/id', 'blob:http://localhost:3000@evil.test/id', `blob:${origin}/`, ` blob:${origin}/id`, `blob:${origin}/id\n`, 'BLOB:http://localhost:3000/id', 'blob:null/id']) {
    assert.throws(() => validateAssets({ [file]: url }), String(url));
  }
});

test('fronteira da prévia valida campanha, manifesto, materiais privados e seleção inclusive sem artes', () => {
  for (const campaignId of ['', 'not-a-uuid', '../other', `${input.campaignId}/assets`]) assert.throws(() => validatePreview({ ...input, campaignId }, origin));
  for (const selectedArtworkId of ['', 'missing', 'sticker']) assert.throws(() => validatePreview({ ...input, selectedArtworkId }, origin));
  for (const invalid of ['art.png', '../' + file, '/private/' + file, 'https://elsewhere.test/' + file]) {
    for (const kind of ['artworks', 'stickers'] as const) {
      const event = { ...input.event, [kind]: input.event[kind].map(material => ({ ...material, file: invalid })) };
      assert.throws(() => validatePreview({ ...input, event }, origin));
    }
  }
  assert.throws(() => validatePreview({ ...input, event: { ...input.event, name: '' } }, origin));
  const empty = { ...input, event: { ...input.event, artworks: [], stickers: [] } };
  assert.deepEqual(validatePreview(empty, origin).event.artworks, []);
  assert.throws(() => validatePreview({ ...empty, selectedArtworkId: 'art' }, origin));
  assert.equal(validatePreview(input, origin).adminTheme, 'light');
});

test('configuração é atômica, retém último válido e não remonta editor nem recebe foto', () => {
  assert.match(preview, /setConfig\(\{ \.\.\.validatePreview\(/);
  assert.match(preview, /<PreviewSession key=\{input.campaignId\}/);
  assert.match(preview, /config.campaignId/);
  assert.match(preview, /catch\s*\{\s*setWarning\(true\)/);
  assert.match(preview, /role="alert"/);
  assert.match(preview, /última configuração válida permanece visível/);
  assert.match(preview, /<PhotoEditor event=\{config.event\} assetUrls=\{config.assetUrls\}/);
  assert.doesNotMatch(preview, /postMessage|window\.parent|<iframe|<PhotoEditor[^>]*\bkey=|input\.photo|revokeObjectURL|createObjectURL/);
  assert.match(editor, /assetUrls\?: Record<string, string>/);
  const expression = editor.match(/const asset = useCallback\(\(file: string\) => (.*), \[assetUrls, assetBase, event.slug\]\)/)?.[1];
  assert.ok(expression);
  const resolve = (assetUrls: unknown, assetBase?: string) => runInNewContext(`(${expression})`, { file, assetUrls, assetBase, event: { slug: 'public-event' }, Object, encodeURIComponent });
  assert.equal(resolve({ [file]: `blob:${origin}/art` }, '/private'), `blob:${origin}/art`);
  assert.equal(resolve({}, '/private'), '/private/' + file.replace(/\.png$/, ''));
  assert.equal(resolve(undefined), '/campaigns/public-event/' + file);
  assert.equal(resolve(Object.create({ [file]: 'https://evil.test' }), '/private'), '/private/' + file.replace(/\.png$/, ''));
  const publicEntry = readFileSync('src/editor/PublicCampaignEditor.tsx', 'utf8');
  assert.doesNotMatch(publicEntry, /assetUrls|localAssets|postMessage/);
  assert.match(editor, /if \(existing && activeArtwork\)/);
  assert.match(editor, /syncHistoryArtwork\(existing, activeArtwork\)/);
});
