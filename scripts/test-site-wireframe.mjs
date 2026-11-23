import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const origin = process.env.SITE_TEST_URL || 'http://host.docker.internal:3001/';
const output = process.env.SITE_TEST_OUTPUT || '/tmp/site-wireframe';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  for (const [width, height] of [[1440, 900], [390, 844], [320, 568]]) for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: width < 800, reducedMotion });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const response = await page.goto(origin);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-security-policy'], /script-src 'self'/);
    await page.evaluate(() => document.fonts.ready);
    const scene = page.locator('[data-perspective]');
    assert.equal(await page.locator('button, [role="button"]').count(), 0, 'landing has no buttons, including hidden controls');
    assert.equal(await page.locator('.controls, .counter, [data-step]').count(), 0);
    await page.waitForFunction(() => document.querySelector('.scene').dataset.entrance === 'ready');
    const geometry = await scene.evaluate(el => {
      const b = el.getBoundingClientRect(), f = el.querySelector('[data-slot="0"]');
      const css = getComputedStyle(f);
      return { top: b.top, bottom: b.bottom, ratio: parseFloat(css.width) / parseFloat(css.height), scroll: document.documentElement.scrollWidth };
    });
    assert.ok(Math.abs(geometry.ratio - 9 / 16) < .0001);
    assert.ok(geometry.scroll <= width);
    assert.ok(geometry.top < height, 'composition begins in first screen without hiding content');
    assert.equal(await page.locator('h1').innerText(), 'Sua campanha. As pessoas ajudam a divulgar.');
    const eyebrow = page.locator('.eyebrow');
    assert.equal(await eyebrow.innerText(), 'Boca a boca digital');
    assert.ok(await eyebrow.isVisible());
    const eyebrowBox = await eyebrow.boundingBox();
    const titleBox = await page.locator('h1').boundingBox();
    assert.ok(eyebrowBox.y + eyebrowBox.height <= titleBox.y, 'category appears above H1');
    assert.ok(geometry.top - titleBox.y - titleBox.height <= 24, 'carousel stays close to title');
    assert.equal(await page.locator('.description').innerText(), 'Com a própria foto, molduras e figurinhas, cada pessoa faz parte da sua campanha e leva essa participação às redes sociais.');
    assert.match(await page.locator('#contact-title').innerText(), /Vamos conversar/);
    assert.equal(await page.locator('footer p').first().innerText(), 'Boca a boca digital para campanhas de marketing.');
    assert.deepEqual(await page.locator('.brand').allTextContents(), ['namarca', 'namarca']);
    assert.equal(await page.locator('.photo img').evaluate(e => e.complete && e.naturalWidth > 0), true);
    assert.equal(await page.locator('#duvidas details').count(), 5);
    assert.equal(await page.locator('a[href="#contato"]').count(), 3);
    assert.equal(await page.locator('a[href*="wa.me"], a[href*="whatsapp"], #contato a, #contato button').count(), 0);
    for (const id of ['boca-a-boca', 'como-funciona', 'duvidas', 'contato']) assert.equal(await page.locator(`#${id}`).count(), 1);
    if (width < 800) {
      await page.locator('.mobile-nav summary').click();
      await page.locator('.mobile-nav a[href="#duvidas"]').click();
      assert.equal(new URL(page.url()).hash, '#duvidas');
      await page.locator('.mobile-nav').evaluate(el => el.open = false);
    }
    await page.locator('#duvidas summary').first().click();
    assert.equal(await page.locator('#duvidas details').first().getAttribute('open'), '');
    await page.locator('#duvidas summary').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#duvidas details').first().getAttribute('open'), null);
    await page.locator('.hero a.cta.primary').click();
    assert.equal(new URL(page.url()).hash, '#contato');
    await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${output}/${width}-${reducedMotion}-hero.png` });
    if (reducedMotion === 'no-preference') {
      const initial = await scene.getAttribute('data-active');
      await page.waitForFunction(a => document.querySelector('.scene').dataset.active !== a, initial, { timeout: 15000 });
    }
    await scene.focus();
    await page.keyboard.press('Shift');
    const active = await scene.getAttribute('data-active');
    await page.waitForTimeout(5500);
    assert.equal(await scene.getAttribute('data-active'), active, 'keyboard focus/reduced motion suspends autoplay');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(a => document.querySelector('.scene').dataset.active !== a && document.querySelector('.scene').dataset.settled === 'true', active);
    await page.waitForTimeout(300);
    const changed = await scene.getAttribute('data-active');
    assert.equal(await page.locator('.photo').getAttribute('data-shape'), changed);
    assert.ok(await page.locator(`.sticker[data-set="${changed}"]`).count() >= 2);
    const box = await scene.boundingBox();
    await page.mouse.move(width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(width / 2 - Math.min(width * .4, 175), box.y + box.height / 2, { steps: 12 });
    await page.mouse.up();
    await page.waitForFunction(a => document.querySelector('.scene').dataset.active !== a && document.querySelector('.scene').dataset.settled === 'true', changed);
    await page.waitForTimeout(320);
    await scene.evaluate(el => el.blur());
    await page.screenshot({ path: `${output}/${width}-${reducedMotion}.png`, fullPage: true });
    // Vertical touch is delegated to browser scrolling, never prevented by carousel.
    assert.equal(await scene.evaluate(el => getComputedStyle(el).touchAction), 'pan-y pinch-zoom');
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width / 2, y: box.y + box.height * .7 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: width / 2, y: box.y + box.height * .7 - 90 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await page.waitForTimeout(300);
    assert.equal(await scene.getAttribute('data-dragging'), null, 'cancel releases gesture');
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(200);
    assert.ok(await page.evaluate(() => scrollY > 0), 'vertical scroll remains usable');
    await scene.evaluate(el => el.blur());
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    // End the canceled touch sequence with an ordinary pointer interaction,
    // clearing keyboard mode and starting the interaction cooldown explicitly.
    await page.mouse.click(1, 1);
    await page.mouse.move(0, 0);
    // A regular swipe above is the only interaction; no replacement pause/resume control.
    const resumed = await scene.getAttribute('data-active');
    await page.waitForTimeout(5200);
    assert.equal(await scene.getAttribute('data-active'), resumed, 'interaction postpones autoplay to 8 seconds');
    if (reducedMotion === 'reduce') {
      await page.waitForTimeout(5000);
      assert.equal(await scene.getAttribute('data-active'), resumed, 'reduced motion remains without autoplay after gestures');
    } else {
      await page.waitForFunction(a => document.querySelector('.scene').dataset.active !== a, resumed, { timeout: 6000 });
    }
    await context.close();
    console.log(`PASS landing ${width} ${reducedMotion}: HTTP/CSP, no controls, autoplay/reduced-motion, keyboard/swipe, morph/stickers, 9:16, overflow`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
