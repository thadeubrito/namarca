import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const preview = readFileSync('apps/campaign/src/preview.tsx', 'utf8');
const editor = readFileSync('packages/editor/src/editor/PhotoEditor.tsx', 'utf8');
const file = '12345678-1234-1234-1234-123456789abc.png';
const sticker = '22345678-1234-1234-1234-123456789abc.png';
const origin = 'http://localhost:3000';
// Execute the actual boundary function without mounting the iframe or Konva.
const boundary = preview.slice(preview.indexOf('function validateLocalAssets'), preview.indexOf('function Preview'));
const validate = runInNewContext(ts.transpile(boundary + '\nvalidateLocalAssets', { target: ts.ScriptTarget.ES2022 }), {
  window: { location: { origin } }, URL, Object, Set,
  privateFile: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i,
}) as (value: unknown, event: unknown) => Record<string, string>;
const event = { artworks: [{ file }], stickers: [{ file: sticker }] };

test('bridge aceita somente materiais presentes no evento e blobs same-origin', () => {
  const assets = { [file]: `blob:${origin}/art`, [sticker]: `blob:${origin}/sticker` };
  assert.equal(JSON.stringify(validate(assets, event)), JSON.stringify(assets));
  assert.equal(JSON.stringify(validate(undefined, event)), '{}');
  assert.equal(JSON.stringify(validate({}, event)), '{}');
  for (const invalid of [null, [], 'url', 1, { photo: `blob:${origin}/photo` }, { ['32345678-1234-1234-1234-123456789abc.png']: `blob:${origin}/other` }]) {
    assert.throws(() => validate(invalid, event));
  }
});

test('bridge rejeita schemes, hosts, portas e valores inválidos sem normalizar prefixo', () => {
  for (const url of [null, 1, {}, '', origin + '/art.png', 'data:image/png;base64,AAAA', 'javascript:alert(1)', 'blob:https://elsewhere.test/id', 'blob:http://localhost:3001/id', 'blob:http://localhost:3000.evil.test/id', 'blob:http://localhost:3000@evil.test/id', `blob:${origin}/`, ` blob:${origin}/id`, `blob:${origin}/id\n`, 'BLOB:http://localhost:3000/id', 'blob:null/id']) {
    assert.throws(() => validate({ [file]: url }, event), String(url));
  }
});

test('mapa é validado antes da atualização atômica e não remonta editor nem recebe foto', () => {
  assert.match(preview, /const assetUrls = validateLocalAssets\(data.localAssets, event\)\s+setConfig\(\{ event, selectedArtworkId: selectedArtworkId as string \| undefined, assetUrls, adminTheme: data.adminTheme === 'dark' \? 'dark' : 'light' \}\)/);
  assert.match(preview, /message.origin !== window.location.origin \|\| message.source !== window.parent/);
  assert.match(preview, /<PhotoEditor event=\{config.event\} assetUrls=\{config.assetUrls\}/);
  assert.doesNotMatch(preview, /<PhotoEditor[^>]*\bkey=|data\.photo|revokeObjectURL|createObjectURL/);
  assert.match(editor, /assetUrls\?: Record<string, string>/);
  const expression = editor.match(/const asset = useCallback\(\(file: string\) => (.*), \[assetUrls, assetBase, event.slug\]\)/)?.[1];
  assert.ok(expression);
  const resolve = (assetUrls: unknown, assetBase?: string) => runInNewContext(`(${expression})`, { file, assetUrls, assetBase, event: { slug: 'public-event' }, Object, encodeURIComponent });
  assert.equal(resolve({ [file]: `blob:${origin}/art` }, '/private'), `blob:${origin}/art`);
  assert.equal(resolve({}, '/private'), '/private/' + file.replace(/\.png$/, ''));
  assert.equal(resolve(undefined), '/events/public-event/' + file);
  assert.equal(resolve(Object.create({ [file]: 'https://evil.test' }), '/private'), '/private/' + file.replace(/\.png$/, ''));
  const publicEntry = readFileSync('apps/campaign/src/main.tsx', 'utf8');
  assert.doesNotMatch(publicEntry, /assetUrls|localAssets/);
  assert.match(editor, /if \(existing && activeArtwork\)/);
  assert.match(editor, /syncHistoryArtwork\(existing, activeArtwork\)/);
});
