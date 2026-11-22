import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('upload compacto usa contagem real e detalhes acessíveis sem caixa de sucesso', async () => {
  const component = await readFile('apps/admin/src/components/admin-workspace/studio-save-progress.tsx', 'utf8');
  const workspace = await readFile('apps/admin/src/components/admin-workspace/studio-workspace.tsx', 'utf8');
  const css = await readFile('apps/admin/src/components/admin-workspace/studio.css', 'utf8');
  assert.match(component, /phase === 'uploading' && <div[^\n]*role="progressbar"/);
  assert.match(component, /aria-valuenow=\{completed\}/);
  assert.match(component, /\{completed\} de \{total\}/);
  assert.match(component, /arquivos processados, não bytes enviados/);
  assert.doesNotMatch(component, /<details|<summary|Ver arquivos/);
  assert.match(component, /files.filter\(file => file.status === 'uploading' \|\| file.status === 'failed'\)/);
  assert.match(component, /visibleFiles.map/);
  assert.match(workspace, /\}, 1\).catch/);
  assert.match(component, /role="status" aria-live="polite"/);
  assert.doesNotMatch(component, /ShinyText|Etapa|Fechar resumo|ws-save-progress-steps|FileImage|percent/);
  assert.match(workspace, /completed\+\+; reportUpload\(item.id, succeeded \? 'done' : 'failed'\)/);
  assert.match(workspace, /setProgress\(current => current && \(\{ \.\.\.current, phase: 'failed'/);
  assert.doesNotMatch(workspace, /phase: 'success'|phase: 'ready'/);
  assert.match(workspace, /<StudioSaveProgress progress=\{\{ \.\.\.progress, sectionLabel: scopeLabels\[scope\] \}\}/);
  assert.match(workspace, /progress\?\.phase === 'failed' && !conflict \? 'Tentar novamente'/);
  assert.match(component, /Os envios concluídos foram preservados/);
  assert.match(component, /Os arquivos foram enviados, mas as alterações não foram salvas/);
  assert.match(css, /\.ws-save-progress \{[^\n]*border:0;background:transparent/);
  assert.match(css, /prefers-reduced-motion:reduce[\s\S]*animation:none!important/);
});
