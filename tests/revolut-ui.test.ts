import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('referência Revolut mantém tokens sem alterar o tema do runtime', async () => {
  const ui = await readFile('src/app/ui.css', 'utf8');
  const workspace = await readFile('src/components/admin-workspace/workspace.css', 'utf8');
  const studio = await readFile('src/components/admin-workspace/studio.css', 'utf8');
  const checkout = await readFile('src/app/checkout/[token]/checkout.css', 'utf8');
  assert.ok(ui.includes('--brand:#494fdf'));
  assert.ok(ui.includes('--radius-control:12px; --radius-button:9999px; --radius-panel:20px'));
  assert.ok(ui.includes('--paper:#000; --background:#000; --surface:#16181a'));
  assert.match(ui, /\.admin-header \{[^}]*background:#000; color:#fff;/);
  assert.match(ui, /\[data-slot=button\] \{[^}]*border-radius:var\(--radius-button\)/);
  assert.match(workspace, /\.ws-action \{[^}]*min-height:48px[^}]*border-radius:var\(--radius-button\)/);
  assert.match(workspace, /\.ws-input,[^{]+\{[^}]*border-radius:var\(--radius-control\)/);
  assert.match(workspace, /\.ws-tabrail \{[^}]*border-radius:9999px/);
  assert.match(workspace, /button\[aria-selected=true\] \{ color:#fff; background:var\(--brand\)/);
  assert.match(workspace, /\.ws-tab-indicator \{[^}]*inset:0;[^}]*background:var\(--brand\)/);
  assert.match(workspace, /\.ws-financial-featured \{ background:var\(--brand\)/);
  const primitives = await readFile('src/components/admin-workspace/primitives.tsx', 'utf8');
  assert.match(primitives, /const sectionIcons/);
  assert.match(primitives, /Icon && <Icon aria-hidden className="ws-tab-icon"/);
  assert.match(studio, /\.ws-studio-upload \{[^}]*border-radius:var\(--radius-button\)/);
  assert.match(checkout, /\.checkout-shell \{ --paper:#000; --surface:#fff;/);
  assert.match(checkout, /\.checkout-card button,[^{]+\{[^}]*border-radius:9999px/);
  // These are source-contract checks, not a replacement for browser validation.
  for (const css of [ui, workspace, studio, checkout]) {
    assert.doesNotMatch(css, /box-shadow:0 [1-9]/);
    assert.ok(css.includes('prefers-reduced-motion:reduce'));
  }
});
