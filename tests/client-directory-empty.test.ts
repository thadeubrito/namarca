import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('clientes vazios seguem composição centralizada sem caixa genérica', async () => {
  const motion = await readFile('apps/admin/src/components/admin-workspace/client-motion.tsx', 'utf8');
  const directory = await readFile('apps/admin/src/components/admin-workspace/client-directory.tsx', 'utf8');
  const css = await readFile('apps/admin/src/components/admin-workspace/workspace.css', 'utf8');
  assert.doesNotMatch(motion, /EmptyState/);
  assert.match(motion, /className="ws-client-empty"/);
  assert.match(motion, /<h3>\{title\}<\/h3>/);
  assert.match(motion, /<p>\{description\}<\/p>/);
  assert.match(motion, /\{action\}/);
  assert.match(motion, /useReducedMotion/);
  assert.match(directory, /Nenhum cliente encontrado/);
  assert.match(directory, /Nenhum cliente cadastrado/);
  assert.match(directory, /href=\{query \? '\/clientes' : '\/clientes\/novo'\}/);
  assert.match(directory, /Limpar busca' : 'Cadastrar primeiro cliente'/);
  const rule = css.match(/\.ws-client-empty \{([^}]+)\}/)?.[1] ?? '';
  assert.match(rule, /align-items:center/);
  assert.match(rule, /width:min\(100%,420px\)/);
  assert.match(rule, /margin:0 auto/);
  assert.match(rule, /padding:40px 16px/);
  assert.match(rule, /text-align:center/);
  assert.doesNotMatch(rule, /border|min-height|background/);
});
