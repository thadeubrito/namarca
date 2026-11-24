import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('descarte de Detalhes restaura baseline local sem confundir recuperação ou publicação', () => {
  const hook = readFileSync('src/components/admin-workspace/form-draft.tsx', 'utf8');
  const discard = hook.slice(hook.indexOf('const discardEdits ='), hook.indexOf('return { formRef, dirty, markSaved, discardEdits'));
  assert.match(discard, /baseline\.current/);
  assert.match(discard, /onRecover\?\.\(values\)/);
  assert.match(discard, /control\.value = values\[field\]/);
  assert.match(discard, /remove\(\); report\(section, false\)/);
  assert.doesNotMatch(discard, /fetch\(|markSaved\(|sessionStorage\.clear/);
  const ui = readFileSync('src/components/admin-workspace/campaign-form.tsx', 'utf8');
  assert.match(ui, /dirty && <Action ref=\{discardButton\}/);
  assert.match(ui, /Descartar edições de Detalhes/);
  assert.match(ui, /if \(!pending\) discardEdits\(\)/);
  assert.match(ui, /discardButton\.current \?\? saveButton\.current/);
  const publication = readFileSync('src/components/admin-workspace/publication.tsx', 'utf8');
  assert.match(publication, /Restaurar versão publicada/);
  assert.doesNotMatch(publication, /Descartar alterações/);
});
