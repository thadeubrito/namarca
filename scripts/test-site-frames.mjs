import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const origin = process.env.SITE_TEST_URL || 'http://host.docker.internal:3001';
const output = process.env.SITE_TEST_OUTPUT || '/tmp/site-frames';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  for (const width of [1440, 390, 320]) for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : width === 390 ? 700 : 900 }, hasTouch: true, isMobile: width < 800, reducedMotion });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    assert.equal((await page.goto(origin + '/estudos/molduras/')).status(), 200);
    const scene = page.locator('.scene');
    const photo = page.locator('.photo');
    const cdp = await context.newCDPSession(page);
    const photoGeometry = () => photo.evaluate(el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, transform: getComputedStyle(el).transform }; });
    async function settled() { await page.waitForFunction(() => document.querySelector('.scene').dataset.settled === 'true'); }
    async function snap() {
      await settled();
      const geometry = await page.evaluate(() => {
        const p = document.querySelector('.photo').getBoundingClientRect();
        const frames = [...document.querySelectorAll('.frame')];
        const frame = frames.find(el => Math.abs(new DOMMatrix(getComputedStyle(el).transform).m41) < .01);
        const f = frame?.getBoundingClientRect();
        return { p: [p.x, p.y, p.width, p.height], f: f && [f.x, f.y, f.width, f.height], background: frame && getComputedStyle(frame).backgroundColor, count: frames.length };
      });
      assert.deepEqual(geometry.f, geometry.p, 'central frame exactly matches photo');
      assert.equal(geometry.background, 'rgba(0, 0, 0, 0)');
      assert.equal(geometry.count, 9);
    }
    async function swipe(dx, dy, checkPhoto = false, steps = 10, delay = 18) {
      const box = await scene.boundingBox();
      const x = box.x + box.width / 2, y = box.y + box.height * .45;
      const before = await photoGeometry();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= steps; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / steps, y: y + dy * i / steps }] });
        await page.waitForTimeout(delay);
        if (checkPhoto) assert.deepEqual(await photoGeometry(), before, 'photo fixed during swipe');
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    await snap();
    await page.screenshot({ path: `${output}/${width}-${reducedMotion}-initial.png`, fullPage: true });
    const initial = await photoGeometry();
    await swipe(-130, 1, true);
    await snap();
    assert.equal(await scene.getAttribute('data-active'), '1');
    assert.deepEqual(await photoGeometry(), initial);
    // Short partial drag must snap, not stop between frames.
    await swipe(-18, 1, true); await snap();
    assert.equal(await scene.getAttribute('data-active'), '1');
    await scene.focus(); await page.keyboard.press('ArrowRight'); await snap();
    assert.equal(await scene.getAttribute('data-active'), '2');
    await page.getByRole('button', { name: 'Próxima moldura' }).click(); await snap();
    assert.equal(await scene.getAttribute('data-active'), '0');
    await page.getByRole('button', { name: 'Moldura anterior' }).click(); await snap();
    assert.equal(await scene.getAttribute('data-active'), '2');
    for (let i = 0; i < 9; i++) { await scene.focus(); await page.keyboard.press('ArrowRight'); await snap(); }
    assert.equal(await scene.getAttribute('data-active'), '2');
    // Record the actual rendered trajectory, not just the final screenshot.
    await page.evaluate(() => {
      window.motionTrace = [];
      window.recordMotion = true;
      function sample(t) {
        const el = document.querySelector('.frame');
        const x = new DOMMatrix(el.style.transform).m41;
        const gap = document.querySelector('.photo').getBoundingClientRect().width * 1.18;
        window.motionTrace.push({ t, position: Number(el.dataset.slot) - x / gap, dragging: document.querySelector('.scene').hasAttribute('data-dragging') });
        if (window.recordMotion) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    await swipe(-100, 1, true, 24, 25); await snap(); // slow tracking
    await swipe(-145, 1, true, 5, 8); // quick release
    await swipe(-100, 1, true, 5, 8); // interrupt and continue
    await swipe(125, 1, true, 6, 10); await snap(); // reverse and wrap
    const trace = await page.evaluate(() => { window.recordMotion = false; return window.motionTrace; });
    await writeFile(`${output}/${width}-${reducedMotion}-trajectory.json`, JSON.stringify(trace));
    assert.ok(trace.length > 20);
    assert.ok(trace.every(s => Number.isFinite(s.position)));
    if (reducedMotion === 'no-preference') {
      // Modulo removes the invisible rest-only coordinate rebase at wrap.
      const deltas = trace.slice(1).map((s, i) => ({ dt: s.t - trace[i].t, dx: ((s.position - trace[i].position + 4.5) % 3) - 1.5, drag: s.dragging || trace[i].dragging }));
      assert.ok(deltas.filter(s => !s.drag && s.dt < 40).every(s => Math.abs(s.dx) < .3), 'no large release/snap jumps');
      assert.ok(deltas.some(s => !s.drag && Math.abs(s.dx) > .001), 'progressive release, not instant snap');
    }
    // A cancelled pointer must release capture and finish at an exact frame.
    const box = await scene.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 70);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 60, box.y + 70, { steps: 5 });
    await scene.dispatchEvent('pointercancel', { pointerId: 1 });
    await page.mouse.up(); await snap();
    assert.equal(await scene.getAttribute('data-dragging'), null);
    // Repeated arrow presses retarget the same curve without resetting velocity.
    const beforeArrows = Number(await scene.getAttribute('data-active'));
    await scene.focus();
    for (let i = 0; i < 4; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(35); }
    await snap();
    assert.equal(Number(await scene.getAttribute('data-active')), (beforeArrows + 4) % 3);
    // Hide mid-motion: no background animation, stale capture or resume jump.
    await page.keyboard.press('ArrowRight');
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await snap();
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const beforeVertical = await scene.getAttribute('data-active');
    if (width < 800) {
      await page.evaluate(() => scrollTo(0, 0));
      const beforeScroll = await page.evaluate(() => scrollY);
      await swipe(2, -95); await page.waitForTimeout(400);
      assert.ok(await page.evaluate(() => scrollY) > beforeScroll + 20, 'native vertical scrolling');
      assert.equal(await scene.getAttribute('data-active'), beforeVertical);
      await snap();
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const transforms = await page.locator('.frame').evaluateAll(els => els.map(e => e.style.transform));
    await page.waitForTimeout(200);
    assert.deepEqual(await page.locator('.frame').evaluateAll(els => els.map(e => e.style.transform)), transforms);
    await page.screenshot({ path: `${output}/${width}-${reducedMotion}-final.png`, fullPage: true });
    console.log(`PASS ${width} ${reducedMotion}: fixed photo throughout touch, transparent/snap geometry, slow/fast/repeated/reversed swipes + trajectory, cancellation, short drag, wrap, keyboard/buttons, vertical scroll, overflow`);
    await context.close();
  }
  assert.deepEqual(errors, [], 'no JS/CSP errors');
} finally { await browser.close(); }
