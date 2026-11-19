import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('progresso usa contagem real, distingue fases e respeita movimento reduzido', async () => {
  const component = await readFile('src/components/admin-workspace/studio-save-progress.tsx', 'utf8');
  const workspace = await readFile('src/components/admin-workspace/studio-workspace.tsx', 'utf8');
  const css = await readFile('src/components/admin-workspace/studio.css', 'utf8');
  assert.match(component, /role="progressbar"/);
  assert.match(component, /phase === 'success' \? \(total \|\| 1\) : phase === 'uploading' \? completed : undefined/);
  assert.match(component, /arquivos processados/);
  assert.match(workspace, /completed\+\+; reportUpload\(item.id, succeeded \? 'done' : 'failed'\)/);
  assert.match(component, /<ShinyText text=\{title\}/);
  assert.match(component, /reduced \|\| finished \? title : <ShinyText/);
  assert.doesNotMatch(workspace, /setTimeout\(\(\) => setProgress\(null\)/);
  assert.match(component, /finished && <button/);
  assert.match(component, /Fechar resumo da operação/);
  assert.doesNotMatch(component, /ws-save-progress-orbit/);
  assert.match(workspace, /<AnimatePresence/);
  assert.match(component, /Configuração salva/);
  assert.match(component, /useSyncExternalStore\(subscribeMotion/);
  assert.match(component, /media.addEventListener\('change', notify\)/);
  assert.match(component, /Arquivos em processamento/);
  assert.match(workspace, /<StudioSaveProgress progress=\{\{ \.\.\.progress, sectionLabel:/);
  assert.match(css, /@keyframes ws-save-spin/);
  assert.match(css, /prefers-reduced-motion:reduce[\s\S]*animation:none!important/);
});
