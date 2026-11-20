import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('campos administrativos usam superfície de controle consistente', async () => {
  const css = await readFile('src/components/admin-workspace/workspace.css', 'utf8');
  for (const selector of ['.ui-scope .ws-input,.ui-scope .workspace select', '.ui-scope .ws-shadcn-control', '.ui-scope .ws-input-prefix-group']) {
    const line = css.split('\n').find(line => line.startsWith(`${selector} {`));
    assert.ok(line, selector);
    assert.match(line, /background:var\(--control-surface\)/);
    assert.doesNotMatch(line, /background:var\(--control-secondary\)/);
  }
  const studio = await readFile('src/components/admin-workspace/studio.css', 'utf8');
  assert.match(studio, /\.ui-scope \.ws-studio-asset \.ws-input \{ background:transparent/);
});
