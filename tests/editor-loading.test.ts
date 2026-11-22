import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('carregamento público não exibe a página de marca antes do editor', () => {
  const source = readFileSync('apps/campaign/src/main.tsx', 'utf8');
  const loading = source.indexOf("if (state.status === 'loading') return");
  assert.ok(loading > 0 && loading < source.indexOf('return <div className="event-status-page">'));
  assert.match(source, /if \(state.status === 'loading'\) return <span className="sr-only" role="status">Preparando editor…<\/span>/);
  assert.match(source, /state.status === 'error'/);
  assert.match(source, /state.status === 'suspended'/);
});

test('prévia aguarda configuração silenciosamente sobre a superfície do host', () => {
  const source = readFileSync('apps/campaign/src/preview.tsx', 'utf8');
  assert.match(source, /!config \? <span className="sr-only" role="status">Aguardando configuração da prévia…<\/span>/);
  assert.match(source, /namarca:preview-ready/);
  const css = readFileSync('apps/campaign/src/preview.css', 'utf8');
  assert.match(css, /html, body, html:has\(\.editor-page\) \{ background: transparent; \}/);
});
