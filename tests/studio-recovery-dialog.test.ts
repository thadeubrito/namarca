import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('recuperação usa dialog modal, resumo e confirmação não destrutiva por Escape', async () => {
  const source = await readFile('apps/admin/src/components/admin-workspace/studio-recovery-dialog.tsx', 'utf8');
  const workspace = await readFile('apps/admin/src/components/admin-workspace/studio-workspace.tsx', 'utf8');
  const css = await readFile('apps/admin/src/components/admin-workspace/studio.css', 'utf8');
  assert.match(source, /AlertDialog.Content/);
  assert.match(source, /AlertDialog.Title/);
  assert.match(source, /AlertDialog.Description/);
  assert.match(source, /onEscapeKeyDown=\{event => \{ event.preventDefault\(\)/);
  assert.match(source, /await onDiscard\(\)/);
  assert.match(source, /Recuperar não envia arquivos nem salva a campanha/);
  assert.match(source, /draft.event.artworks.length/);
  assert.match(source, /draft.event.stickers.length/);
  assert.match(workspace, /onDone=\{\(\) => studioRoot.current\?\.focus\(\)\}/);
  assert.match(css, /ui-scope.ws-recovery-dialog[^}]*min-height:0/);
});
