import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const origin = process.env.SITE_TEST_URL || 'http://host.docker.internal:3001';
const output = process.env.SITE_TEST_OUTPUT || '/tmp/site-studies';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  for (const width of [1440, 390, 320]) for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 900 }, hasTouch: true, isMobile: width < 800, reducedMotion });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const response = await page.goto(origin + '/estudos/');
    assert.equal(response.status(), 200);
    await page.waitForTimeout(850);
    assert.equal(await page.locator('.stack .card').count(), 3);
    assert.equal(await page.locator('.gallery .card').count(), 9);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${output}/${width}-${reducedMotion}-initial.png`, fullPage: true });
    const cdp = await context.newCDPSession(page);
    async function swipe(selector, dx, dy) {
      const el = page.locator(selector); await el.scrollIntoViewIfNeeded();
      const b = await el.boundingBox();
      const x = b.x + b.width * .55, y = b.y + b.height * .5;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= 10; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 10, y: y + dy * i / 10 }] });
        await page.waitForTimeout(18);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await swipe('.stack', -105, 2);
    await page.waitForFunction(() => document.querySelector('.stack').dataset.active === '1');
    assert.equal(await page.locator('.gallery').getAttribute('data-active'), '0');
    await page.waitForTimeout(1500);
    await swipe('.gallery', -150, 2);
    await page.waitForFunction(() => document.querySelector('.gallery').dataset.settled === 'true');
    assert.notEqual(await page.locator('.gallery').getAttribute('data-active'), '0');
    assert.equal(await page.locator('.stack').getAttribute('data-active'), '1');
    const active = await page.locator('.gallery').getAttribute('data-active');
    await page.locator('.gallery').focus(); await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.gallery').dataset.settled === 'true');
    assert.equal(await page.locator('.gallery').getAttribute('data-active'), String((Number(active) + 1) % 3));
    if (width < 800) {
      for (const selector of ['.stack', '.gallery']) {
        await page.locator(selector).scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollBy(0, -100));
        const before = await page.evaluate(() => scrollY);
        const current = await page.locator(selector).getAttribute('data-active');
        await swipe(selector, 2, -90);
        await page.waitForTimeout(350);
        assert.ok(await page.evaluate(() => scrollY) > before + 20, `${selector} native vertical scroll`);
        assert.equal(await page.locator(selector).getAttribute('data-active'), current);
      }
    }
    // Mouse/button alternative, repeated wrapping and independent deck settling.
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Próximo cartão do Stack', exact: true }).click();
      await page.waitForTimeout(1600);
    }
    assert.equal(await page.locator('.stack').getAttribute('data-active'), '1');
    await page.getByRole('button', { name: 'Cartão anterior da Circular Gallery', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.gallery').dataset.settled === 'true');
    await page.waitForTimeout(1500);
    const before = await page.locator('.gallery .card').evaluateAll(els => els.map(e => e.style.transform));
    await page.waitForTimeout(300);
    assert.deepEqual(await page.locator('.gallery .card').evaluateAll(els => els.map(e => e.style.transform)), before, 'No constant autoplay');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${output}/${width}-${reducedMotion}-final.png`, fullPage: true });
    console.log(`PASS ${width} ${reducedMotion}: touch, direction lock/scroll, independence, keyboard, settled/no autoplay, CSP, overflow`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
