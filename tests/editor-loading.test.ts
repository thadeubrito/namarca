import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { build } from 'esbuild';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

async function renderEntry(entry: string, name: string, props: object) {
  // CSS is handled by Next in production; no browser globals or canvas in SSR.
  const bundle = await build({ entryPoints: [entry], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', loader: { '.css': 'empty' } });
  const bundledModule = { exports: {} as Record<string, ComponentType<object>> };
  runInNewContext(bundle.outputFiles[0].text, { module: bundledModule, exports: bundledModule.exports, require: createRequire(import.meta.url), process, console });
  return renderToStaticMarkup(createElement(bundledModule.exports[name], props));
}

test('SSR público é determinístico, silencioso e não exige window nem canvas', async () => {
  const html = await renderEntry('src/editor/PublicCampaignEditor.tsx', 'PublicCampaignEditor', { slug: 'teste' });
  assert.match(html, /class="campaign-editor-scope"/);
  assert.match(html, /role="status">Preparando editor…/);
  assert.doesNotMatch(html, /event-status-page|na<span>|canvas|iframe/);
  const source = readFileSync('src/editor/PublicCampaignEditor.tsx', 'utf8');
  assert.match(source, /state.status === 'error'/);
  assert.match(source, /state.status === 'suspended'/);
  assert.match(source, /<CampaignSession key=\{slug\} slug=\{slug\}/);
});

test('campanha não encontrada usa somente conteúdo básico sem marca nem tema do editor', () => {
  const source = readFileSync('src/editor/PublicCampaignEditor.tsx', 'utf8');
  assert.match(source, /if \(state.status === 'missing'\) return <main className="campaign-not-found"><h1>Campanha não encontrada<\/h1><p>Confira o link enviado pela organização\.<\/p><\/main>/);
  const css = readFileSync('src/editor/isolated.css', 'utf8');
  assert.match(css, /campaign-not-found/);
  assert.doesNotMatch(css, /html:has|\bbody\s*\{/);
});

test('SSR da prévia aguarda configuração no shell local, sem handshake ou iframe', async () => {
  const html = await renderEntry('src/editor/CampaignPreview.tsx', 'CampaignPreview', { campaignId: '12345678-1234-1234-1234-123456789abc', event: {} });
  assert.match(html, /class="campaign-editor-scope editor-preview"/);
  assert.match(html, /role="status">Aguardando configuração da prévia…/);
  assert.doesNotMatch(html, /iframe|canvas/);
  const source = readFileSync('src/editor/CampaignPreview.tsx', 'utf8');
  assert.doesNotMatch(source, /postMessage|preview-ready|addEventListener\(['"]message/);
});
