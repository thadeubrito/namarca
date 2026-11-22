import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { adminThemeScript } from '../src/lib/admin-theme';

test('theme bootstrap resolves saved preference before React, with safe light fallback', () => {
  for (const [stored, expected] of [['dark', 'dark'], ['light', 'light'], [null, 'light'], ['invalid', 'light']]) {
    const document = { documentElement: { dataset: {} as Record<string, string> } };
    runInNewContext(adminThemeScript, { document, localStorage: { getItem: () => stored } });
    assert.equal(document.documentElement.dataset.adminTheme, expected);
  }
  const document = { documentElement: { dataset: {} as Record<string, string> } };
  runInNewContext(adminThemeScript, { document, localStorage: { getItem: () => { throw Error('disabled'); } } });
  assert.equal(document.documentElement.dataset.adminTheme, 'light');
});

test('bootstrap is in the head and dark tokens apply before hydration', async () => {
  const layout = await readFile('src/app/layout.tsx', 'utf8');
  const css = await readFile('src/app/ui.css', 'utf8');
  assert.match(layout, /<head><script dangerouslySetInnerHTML=\{\{ __html: adminThemeScript \}\} \/><\/head><body>/);
  assert.match(css, /html\[data-admin-theme=dark\] \.ui-scope/);
});
