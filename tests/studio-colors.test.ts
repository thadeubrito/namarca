import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('cores usa ajustes em linhas, amostras circulares e HEX acessível sem alterar save', async () => {
  const source = await readFile('src/components/admin-workspace/studio-colors.tsx', 'utf8');
  const css = await readFile('src/components/admin-workspace/studio.css', 'utf8');
  assert.match(source, /aria-describedby=\{hintId\}/);
  assert.match(source, /aria-invalid=\{invalid\}/);
  assert.match(source, /window.confirm/);
  assert.match(source, /version: 1, \.\.\.themeDefaults/);
  assert.match(source, /onBlur=\{\(\) => setDraft\(null\)\}/);
  assert.match(css, /\.ws-color-control \{ display:grid;grid-template-columns:48px minmax\(0,1fr\) 104px/);
  assert.match(css, /\.ws-color-picker \{[^\n]*border-radius:50%/);
  assert.match(css, /\.ws-color-value \{ grid-column:2;width:104px/);
});
