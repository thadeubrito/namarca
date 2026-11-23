import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const origin = process.env.SITE_LAB_URL || 'http://host.docker.internal:3002';
const out = process.env.SITE_LAB_SHOTS || '/tmp/site-lab';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const width of [1440, 768, 390, 320]) for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin);
    await page.waitForSelector('canvas[data-renderer]');
    await page.waitForSelector('canvas[data-images="ready"]');
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(async () => {
      const sources = ['/images/orbita-26.webp','/images/clube-sol.webp','/images/livia-e-tomas.webp','/images/luma-2026.webp'];
      return (await Promise.all(sources.map(src => new Promise(resolve => { const im = new Image(); im.onload = () => resolve(im.naturalWidth === 480 && im.naturalHeight === 853); im.onerror = () => resolve(false); im.src = src; })))).every(Boolean);
    }), true);
    const region = page.getByRole('region', { name: /Experimento Warp/ });
    const next = page.getByRole('button', { name: 'Próximo', exact: true });
    const pause = page.getByRole('button', { name: 'Pausar', exact: true });
    if (reducedMotion !== 'reduce') await pause.click();
    const initial = await page.getByRole('status').textContent();
    const seen = new Set();
    for (let i = 0; i < 4; i++) {
      seen.add(await page.getByRole('status').textContent());
      await next.click();
    }
    assert.equal(seen.size, 4, 'manual navigation visits all four artworks');
    assert.equal(await page.getByRole('status').textContent(), initial, 'wraps to initial artwork');
    await next.click();
    assert.notEqual(await page.getByRole('status').textContent(), initial);
    await region.focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.getByRole('status').textContent(), initial);
    assert.notEqual(await region.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    const box = await region.boundingBox();
    await page.mouse.move(box.x + box.width * .65, box.y + box.height * .5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .25, box.y + box.height * .5, { steps: 16 });
    await page.mouse.up();
    await page.waitForTimeout(reducedMotion === 'reduce' ? 100 : 1600);
    assert.notEqual(await page.getByRole('status').textContent(), initial, 'drag changes card');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    const renderer = await page.locator('canvas').getAttribute('data-renderer');
    assert.equal(renderer, 'webgl2');
    await page.screenshot({ path: `${out}/${width}-${reducedMotion}.png`, fullPage: true });
    if (width === 390) {
      const stable = await page.getByRole('status').textContent();
      await page.waitForTimeout(4500);
      assert.equal(await page.getByRole('status').textContent(), stable, 'pause/reduced stops autoplay');
      if (reducedMotion !== 'reduce') {
        await page.getByRole('button', { name: 'Reproduzir', exact: true }).click();
        await page.waitForTimeout(4300);
        assert.notEqual(await page.getByRole('status').textContent(), stable, 'autoplay resumes');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForTimeout(100);
        const stopped = await page.getByRole('status').textContent();
        await page.waitForTimeout(4500);
        assert.equal(await page.getByRole('status').textContent(), stopped, 'dynamic reduced motion stops autoplay');
      }
    }
    console.log(`PASS ${width} ${reducedMotion} ${renderer}`);
    await context.close();
  }
  const fallback = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 900 } });
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type === 'webgl2' ? null : original.call(this, type, ...args); };
  });
  const page = await fallback.newPage(); await page.goto(origin);
  await page.waitForSelector('canvas[data-renderer="canvas2d"][data-images="ready"]');
  const unique = await page.locator('canvas').evaluate(el => {
    const c = el.getContext('2d');
    const { data } = c.getImageData(0, 0, el.width, el.height);
    const colors = new Set(); for (let i = 0; i < data.length; i += 400) colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
    return colors.size;
  });
  assert.ok(unique > 10, 'fallback paints cards, not a blank rectangle');
  await page.screenshot({ path: `${out}/fallback.png`, fullPage: true });
  await fallback.close();
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const plain = await noJS.newPage(); await plain.goto(origin);
  assert.equal(await plain.locator('.examples li').count(), 4);
  assert.equal(await plain.locator('h1').isVisible(), true);
  await plain.locator('.gallery summary').click();
  assert.equal(await plain.locator('.examples img:visible').count(), 4);
  await noJS.close();
  console.log('PASS Canvas 2D fallback, HTML without JS');
} finally { await browser.close(); }
