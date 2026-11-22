import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('referência Revolut mantém tokens sem alterar o tema do runtime', async () => {
  const ui = await readFile('src/app/ui.css', 'utf8');
  const workspace = await readFile('src/components/admin-workspace/workspace.css', 'utf8');
  const studio = await readFile('src/components/admin-workspace/studio.css', 'utf8');
  const checkout = await readFile('src/app/checkout/[token]/checkout.css', 'utf8');
  assert.match(workspace, /\.ws-client-dialog-overlay \{[^}]*background:rgba\(0,0,0,\.72\);backdrop-filter:blur\(4px\)/);
  assert.doesNotMatch(workspace, /\.ws-client-dialog-overlay \{[^}]*background:var\(--scrim\)/);
  assert.ok(ui.includes('--brand:#494fdf'));
  assert.ok(ui.includes('--brand-text:#a4a8ff'));
  const globals = await readFile('src/app/globals.css', 'utf8');
  assert.match(globals, /\.skip:focus\{[^}]*outline:2px solid #494fdf/);
  assert.match(workspace, /ws-financial-featured \.ws-billing-caption \{ color:var\(--on-brand\)/);
  const directory = await readFile('src/components/admin-workspace/campaign-directory.css', 'utf8');
  assert.ok(directory.includes('color: var(--brand-text)'));
  assert.ok(directory.includes('outline: 2px solid var(--ring)'));
  assert.doesNotMatch(studio, /#e17827|#bf5b11|#172f26|--destructive/);
  assert.match(studio, /local-reference-box \{[^}]*outline:2px solid var\(--brand\)/);
  assert.match(checkout, /\.checkout-card \.error \{ color:var\(--error\)/);
  assert.ok(ui.includes('--radius-control:12px; --radius-button:9999px; --radius-panel:20px'));
  assert.ok(ui.includes('--paper:#000; --background:#000; --surface:#16181a'));
  assert.match(ui, /\.admin-header \{[^}]*background:var\(--background\); color:var\(--foreground\);/);
  assert.match(ui, /html:has\(\.admin-shell\), body:has\(\.admin-shell\) \{ background:#fff;/);
  assert.match(ui, /html\[data-admin-theme=dark\]:has\(\.admin-shell\)[^}]*background:#000;/);
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
