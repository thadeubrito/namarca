import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

// Isolated runtime session: real App/loadEvent, local composition stand-in (no photo/upload).
test('sessão preserva composição ativa, limita checks, suspende e só reativa por retry explícito', { skip: process.env.EVENT_BROWSER_TEST !== '1' }, async () => {
  const bundle = await build({ entryPoints: ['apps/campaign/src/main.tsx'], bundle: true, write: false, loader: { '.css': 'empty' }, plugins: [{ name: 'local-editor', setup(builder) {
    builder.onLoad({ filter: /\/editor\/PhotoEditor\.tsx$/ }, () => ({ contents: `import React from 'react'; export function PhotoEditor(){return <input aria-label="Composição local" defaultValue=""/>}`, loader: 'tsx' }));
  } }] });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.clock.install();
    let pointer: unknown = { version: 1 };
    let offline = false;
    let checks = 0;
    let versions = 0;
    const event = { slug: 'teste', name: 'Teste', color: '#123456', demo: false, endsAt: '2099-12-31T23:59:59Z', artworks: [{ id: 'a', name: 'A', file: 'a.png', width: 10, height: 10, reference: { x: 0, y: 0, width: 10, height: 10 } }], stickers: [] };
    await page.route('http://runtime.test/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('event.json')) {
        checks++;
        assert.equal(route.request().method(), 'GET');
        if (offline) return route.abort();
        return route.fulfill({ json: pointer });
      }
      if (path.includes('/versions/')) { versions++; return route.fulfill({ json: event }); }
      return route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' });
    });
    await page.goto('http://runtime.test/teste');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const composition = page.getByRole('textbox', { name: 'Composição local' });
    await composition.fill('rascunho privado');
    await composition.evaluate(node => { node.setAttribute('data-original', 'true'); });
    await page.clock.runFor(15_000);
    await page.waitForFunction(() => document.querySelector('input')?.getAttribute('data-original') === 'true');
    assert.equal(checks, 2);
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(checks, 2);
    assert.equal(await composition.inputValue(), 'rascunho privado');
    assert.equal(versions, 1);
    offline = true;
    await page.clock.runFor(15_000);
    assert.equal(await composition.inputValue(), 'rascunho privado');
    offline = false;
    pointer = { version: 1, suspended: true };
    await page.clock.runFor(15_000);
    await page.getByRole('heading', { name: 'Ativação temporariamente indisponível' }).waitFor();
    assert.equal(await composition.count(), 0);
    assert.equal(versions, 1);
    const suspendedChecks = checks;
    pointer = { version: 1 };
    await page.clock.runFor(30_000);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    assert.equal(checks, suspendedChecks);
    offline = true;
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await page.getByRole('heading', { name: 'Não foi possível abrir a campanha' }).waitFor();
    assert.equal(await composition.count(), 0);
    offline = false;
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await composition.waitFor();
    assert.equal(await composition.inputValue(), '');
    assert.equal(versions, 2);
  } finally { await browser.close(); }
});
