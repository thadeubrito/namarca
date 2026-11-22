import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('comparador usa pares responsivos, cards tonais e seletores compartilhados sem tabela larga', async () => {
  const source = await readFile('apps/admin/src/components/admin-workspace/publication-diff.tsx', 'utf8');
  const css = await readFile('apps/admin/src/components/admin-workspace/workspace.css', 'utf8');
  assert.doesNotMatch(source, /<table|<input[^>]*checkbox/);
  assert.match(source, /ws-diff-pair/);
  assert.match(source, /SelectField/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /ws-diff-material-list/);
  assert.match(css, /\.ws-diff-versions \{[^}]*minmax\(0,1fr\)/);
  assert.match(css, /\.ws-publication-diff summary:focus-visible/);
  assert.match(css, /\.ws-diff-row \{ grid-template-columns:1fr/);
  assert.match(source, /const ids = \[\.\.\.new Set/);
  assert.match(source, /modified\?\.after \?\? \(reordered \? \{ id: reordered\.id/);
  assert.doesNotMatch(source, /className="ws-diff-label"/);
});
