import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('UI salva escopo explícito e mantém pendências das outras seções', async () => {
  const source = await readFile('src/components/admin-workspace/studio-workspace.tsx', 'utf8');
  assert.match(source, /JSON.stringify\(\{ event, revision: snapshot.revision, scope \}\)/);
  assert.match(source, /const merged = \{ \.\.\.event, \[scope\]: value.event\[scope\] \}/);
  assert.match(source, /revision: value.revision, materials: remaining/);
  assert.match(source, /scope === 'theme' \? \[\] : event\[scope\].map/);
  const sections = await readFile('src/components/admin-workspace/campaign-sections.tsx', 'utf8');
  assert.match(sections, /export function CampaignSections/);
  assert.match(sections, /label="Seções da campanha" initialId=\{active\} layout="workbench" activeId=\{active\}/);
  assert.match(sections, /<CampaignStudio[^>]*activeSection=\{active\}[^>]*onPendingChange=\{report\}/);
  for (const [id, label, scope, dirty] of [
    ['artes', 'Artes', 'artworks', 'artworksDirty'],
    ['stickers', 'Figurinhas', 'stickers', 'stickersDirty'],
    ['cores', 'Cores', 'theme', 'themeDirty'],
  ]) {
    assert.match(sections, new RegExp(`id: '${id}', label: '${label}', panelKey: 'visual', lazy: ${id === 'artes' ? 'false' : 'true'}, pending: pending\\.${id}`));
    assert.ok(source.includes(`onPendingChange?.('${id}', ${dirty})`));
    assert.ok(source.includes(`const ${dirty} = sectionDirty('${scope}')`));
    assert.ok(source.includes(`hidden={activeSection !== '${id}'}`));
  }
  assert.match(sections, /id: 'dados', label: 'Detalhes'/);
  assert.match(sections, /id: 'cobranca', label: 'Cobrança'/);
  assert.doesNotMatch(sections, /label: 'Estúdio'|Configuração do estúdio/);
  assert.doesNotMatch(source, /Salvar configuração/);
  const tabs = await readFile('src/components/admin-workspace/primitives.tsx', 'utf8');
  const css = await readFile('src/components/admin-workspace/studio.css', 'utf8');
  assert.match(tabs, /ws-tab-pending[^>]*title="Alterações não salvas"/);
  assert.doesNotMatch(tabs, />Não salvo<\/span>/);
  assert.ok(tabs.includes('aria-describedby={item.pending'));
  assert.ok(source.includes('<SaveStatus dirty={sectionDirty(scope)}'));
  const status = await readFile('src/components/admin-workspace/save-status.tsx', 'utf8');
  assert.ok(status.includes('3500'));
  assert.ok(status.includes('role="status"'));
  assert.ok(status.includes('shownToken.current === successToken'));
  assert.match(css, /ws-studio-section-footer \{ margin-top:auto/);
  assert.doesNotMatch(source, /phase: 'ready'/);
  assert.doesNotMatch(source, /Material adicionado neste navegador/);
});
