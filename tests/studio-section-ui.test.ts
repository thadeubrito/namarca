import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('UI salva escopo explícito e mantém pendências das outras seções', async () => {
  const source = await readFile('src/components/admin-workspace/studio-workspace.tsx', 'utf8');
  assert.match(source, /JSON.stringify\(\{ event, revision: snapshot.revision, scope \}\)/);
  assert.match(source, /const merged = \{ \.\.\.event, \[scope\]: value.event\[scope\] \}/);
  assert.match(source, /revision: value.revision, materials: remaining/);
  assert.match(source, /scope === 'theme' \? \[\] : event\[scope\].map/);
  assert.match(source, /pending: sectionDirty\('artworks'\)/);
  assert.match(source, /pending: sectionDirty\('stickers'\)/);
  assert.match(source, /pending: sectionDirty\('theme'\)/);
  assert.doesNotMatch(source, /Salvar configuração/);
  const tabs = await readFile('src/components/admin-workspace/primitives.tsx', 'utf8');
  const css = await readFile('src/components/admin-workspace/studio.css', 'utf8');
  assert.match(tabs, /ws-tab-pending[^>]*>Não salvo/);
  assert.match(css, /ws-studio-section-footer \{ margin-top:auto/);
  assert.doesNotMatch(source, /phase: 'ready'/);
  assert.doesNotMatch(source, /Material adicionado neste navegador/);
});
