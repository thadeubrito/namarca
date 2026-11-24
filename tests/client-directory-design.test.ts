import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('diretório de clientes usa linhas Revolut e mantém busca GET e vínculos', async () => {
  const source = await readFile('src/components/admin-workspace/client-directory.tsx', 'utf8');
  const css = await readFile('src/components/admin-workspace/client-directory.css', 'utf8');
  assert.doesNotMatch(source, /Surface|divide-y|ws-panel-header/);
  assert.match(source, /method="get" role="search"/);
  assert.match(source, /name="q" defaultValue=\{query\} maxLength=\{254\}/);
  assert.match(source, /aria-labelledby="client-directory-heading"/);
  assert.match(source, /href=\{`\/clientes\/\$\{client.id\}`\} aria-label=\{client.name\}/);
  assert.match(source, /client.campaignCount === 1 \? 'campanha' : 'campanhas'/);
  assert.match(css, /grid-template-columns:48px minmax\(0,1fr\) auto 44px/);
  assert.match(css, /border-radius:var\(--radius-panel\)/);
  assert.match(css, /:focus-visible \{ outline:2px solid var\(--ring\)/);
  assert.match(css, /overflow-wrap:anywhere/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});
