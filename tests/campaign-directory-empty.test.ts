import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('campanhas vazias seguem composição centralizada das bibliotecas sem caixa genérica', async () => {
  const directory = await readFile('apps/admin/src/components/admin-workspace/campaign-directory.tsx', 'utf8');
  const css = await readFile('apps/admin/src/components/admin-workspace/campaign-directory.css', 'utf8');
  assert.doesNotMatch(directory, /EmptyState/);
  assert.match(directory, /ws-campaign-directory-empty/);
  assert.match(directory, /Nenhuma campanha nesta seleção/);
  assert.match(directory, /Sua primeira campanha começa aqui/);
  assert.match(directory, /campaigns.length > 0 && <Action variant="secondary" onClick=\{\(\) => \{ setSearch\(''\); setFilter\('all'\); \}\}>Limpar filtros/);
  const emptyRule = css.match(/\.ui-scope \.ws-campaign-directory-empty \{([^}]+)\}/)?.[1] ?? '';
  assert.match(emptyRule, /align-items: center/);
  assert.match(emptyRule, /width: min\(100%, 420px\)/);
  assert.match(emptyRule, /margin: 0 auto/);
  assert.match(emptyRule, /padding: 40px 16px/);
  assert.match(emptyRule, /text-align: center/);
  assert.doesNotMatch(emptyRule, /border|min-height|background/);
});
