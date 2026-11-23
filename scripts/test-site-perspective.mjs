import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
const geometry = [[62, 120, 776, 1290, 24, 24], [130, 170, 700, 1170, 350, 585], [74, 420, 670, 930, 140, 140]];
const origin = process.env.SITE_TEST_URL || 'http://host.docker.internal:3001';
const output = process.env.SITE_TEST_OUTPUT || '/tmp/site-perspective';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const errors = [];
try {
  for (const width of [1440, 390, 320]) for (const reducedMotion of ['no-preference', 'reduce']) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : width === 390 ? 844 : 568 }, hasTouch: true, isMobile: width < 800, reducedMotion });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      window.entranceTrace = []; window.layoutShifts = [];
      new PerformanceObserver(list => window.layoutShifts.push(...list.getEntries().filter(e => !e.hadRecentInput).map(e => e.value))).observe({ type: 'layout-shift', buffered: true });
      function sample(t) {
        const scene = document.querySelector('.scene');
        if (scene?.dataset.entrance) window.entranceTrace.push({ t, state: scene.dataset.entrance,
          transform: scene.querySelector('[data-slot="1"]')?.style.transform,
          opacity: Number(getComputedStyle(scene.querySelector('.photo')).opacity) });
        if (!scene || scene.dataset.entrance !== 'ready') requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    for (const route of ['/', '/estudos/', '/estudos/molduras/', '/estudos/perspectiva/']) assert.equal((await page.goto(origin + route)).status(), 200);
    const scene = page.locator('.scene');
    assert.ok((await page.request.get(origin + '/estudos/perspectiva/')).headers()['content-security-policy'], 'real gateway CSP');
    await page.evaluate(() => { window.cspViolations = []; document.addEventListener('securitypolicyviolation', e => window.cspViolations.push(e.violatedDirective)); });
    const cdp = await context.newCDPSession(page);
    const photo = () => page.locator('.photo').evaluate(el => { const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; });
    const settled = () => page.waitForFunction(() => document.querySelector('.scene').dataset.settled === 'true');
    async function snap() {
      await settled();
      await page.waitForTimeout(320);
      const p = await photo();
      const f = await page.locator('.frame').evaluateAll(els => {
        const el = els.find(e => Math.abs(Number(e.dataset.distance)) < .0001);
        const b = el.getBoundingClientRect();
        return { rect: [b.x, b.y, b.width, b.height], bg: getComputedStyle(el).backgroundColor, transform: el.style.transform };  
      });
      const shape = geometry[Number(await scene.getAttribute('data-active'))];
      const expected = [f.rect[0] + shape[0] / 900 * f.rect[2], f.rect[1] + shape[1] / 1600 * f.rect[3], shape[2] / 900 * f.rect[2], shape[3] / 1600 * f.rect[3]];
      expected.forEach((v, i) => assert.ok(Math.abs(v - p[i]) < .03, 'independent photo geometry'));
      assert.notEqual(f.bg, 'rgba(0, 0, 0, 0)');
      assert.ok(await page.locator('.frame').evaluateAll(els => els.every(el => {
        const css = getComputedStyle(el);
        return /^rgb\(/.test(css.backgroundColor) && css.maskImage === 'none' && css.clipPath === 'none';
      })), 'every material has an opaque fill without a mask');
      assert.equal(await page.locator('.frame svg, .frame mask, .frame .photo').count(), 0, 'solid previews, no cutout or duplicate photo');
      assert.equal(await page.locator('.sticker[data-phase="out"]').count(), 0);
      const active = await scene.getAttribute('data-active');
      assert.equal(await page.locator(`.sticker:not([data-set="${active}"])`).count(), 0);
      assert.equal(await page.locator('.sticker').count(), active === '1' ? 3 : 2);
      const radius = await page.locator('.photo').evaluate(el => parseFloat(getComputedStyle(el).borderTopLeftRadius));
      assert.ok(Math.abs(radius - shape[4] / shape[2] * 100) < .01, 'photo final curvature');
      await visiblePhoto();
      if (reducedMotion === 'reduce') assert.equal(await page.locator('.sticker').evaluateAll(els => els.flatMap(e => e.getAnimations()).length), 0);
      assert.ok(await page.locator('.frame').evaluateAll(els => els.every(el => {
        const css = getComputedStyle(el);
        return Math.abs(parseFloat(css.width) / parseFloat(css.height) - 9 / 16) < .0001;
      })), 'all frame outer boxes are 9:16, including borders');
    }
    async function visiblePhoto(path) {
      await page.evaluate(() => { window.paused = document.getAnimations().filter(a => a.playState === 'running'); window.paused.forEach(a => a.pause()); });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const data = await page.locator('.photo').evaluate(el => {
        const b = el.getBoundingClientRect(), css = getComputedStyle(el);
        const radii = css.borderTopLeftRadius.split(' ').map(parseFloat);
        return { x: b.x, y: b.y, w: b.width, h: b.height, rx: radii[0] / 100 * b.width, ry: (radii[1] ?? radii[0]) / 100 * b.height,
          stickers: [...document.querySelectorAll('.sticker')].map(s => { const r = s.getBoundingClientRect(); return [r.left - 12, r.top - 12, r.right + 12, r.bottom + 12]; }) };
      });
      const image = PNG.sync.read(await page.screenshot(path ? { path } : {}));
      let checked = 0;
      for (let y = Math.ceil(data.y + 3); y < data.y + data.h - 3; y += 5) for (let x = Math.ceil(data.x + 3); x < data.x + data.w - 3; x += 5) {
        const cx = Math.max(data.x + data.rx, Math.min(x, data.x + data.w - data.rx));
        const cy = Math.max(data.y + data.ry, Math.min(y, data.y + data.h - data.ry));
        if (((x - cx) / data.rx) ** 2 + ((y - cy) / data.ry) ** 2 > .93 || data.stickers.some(r => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3])) continue;
        if (y < 0 || y >= image.height) continue;
        const pixel = (y * image.width + x) * 4;
        assert.ok([0, 1, 2].every(c => Math.abs(image.data[pixel + c] - 217) <= 2), `photo unoccluded at ${x},${y}`);
        checked++;
      }
      assert.ok(checked > 100, 'dense visible photo coverage');
      await page.evaluate(() => window.paused.forEach(a => a.play()));
      return [data.x, data.y, data.w, data.h, data.rx, data.ry];
    }
    async function swipe(dx, dy = 1, steps = 10, delay = 18, capture = false) {
      const b = await scene.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height * .45;
      const fixed = await photo();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      let fixedSelection;
      for (let i = 1; i <= steps; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / steps, y: y + dy * i / steps }] });
        await page.waitForTimeout(delay);
        if (Math.abs(dx) > Math.abs(dy)) {
          if (await scene.evaluate(el => el.hasAttribute('data-dragging'))) {
            const active = await scene.getAttribute('data-active');
            if (fixedSelection === undefined) fixedSelection = active;
            assert.equal(active, fixedSelection, 'selection frozen during drag');
          }
          if (await scene.getAttribute('data-settled') === 'true') assert.deepEqual(await photo(), fixed);
        }
        if (capture && [3, 6, 9].includes(i)) await page.screenshot({ path: `${output}/${width}-${reducedMotion}-drag-${i}.png`, fullPage: true });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    // Sample the natural entrance; assertions use observed state, not a fixed
    // assumption that a sleep means the animation must have finished.
    const entranceStart = await page.evaluate(() => performance.now());
    for (const ms of [0, 200, 500, 900, 1400]) {
      const remaining = await page.evaluate(({ start, ms }) => start + ms - performance.now(), { start: entranceStart, ms });
      if (remaining > 0) await page.waitForTimeout(remaining);
      await page.screenshot({ path: `${output}/${width}-${reducedMotion}-entrance-${ms}.png`, fullPage: true });
    }
    await page.waitForFunction(() => document.querySelector('.scene').dataset.entrance === 'ready');
    const entranceTrace = await page.evaluate(() => window.entranceTrace);
    if (reducedMotion === 'reduce') {
      assert.ok(entranceTrace.every(f => f.state === 'ready' && f.opacity === 1), 'reduced-motion is immediately final');
    } else {
      assert.ok(entranceTrace.some(f => f.state === 'running' && f.opacity < .9), 'real photo reveal');
      assert.ok(new Set(entranceTrace.map(f => f.transform)).size > 10, 'continuous integrated perspective opening');
      assert.ok(entranceTrace.at(-1).t - entranceTrace[0].t < 1350, 'short overlapping entrance');
    }
    assert.deepEqual(await page.evaluate(() => window.layoutShifts), [], 'entrance has no layout shift');
    // Keep the geometry/gesture regression suite independent of wall-clock
    // screenshot speed. Automatic progression has its own clock suite below.
    if (reducedMotion === 'no-preference') await page.locator('.autoplay').click();
    await snap();
    assert.ok(await scene.evaluate(el => {
      const p = el.querySelector('.photo-canvas').getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const originY = parseFloat(getComputedStyle(el).perspectiveOrigin.split(' ')[1]);
      return Math.abs(box.height - p.height - 112) < .05 && Math.abs(originY - (p.y - box.y + p.height / 2)) < .05;
    }), 'scene height and perspective center follow story height');
    if (width >= 390) assert.ok(await page.locator('.controls').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'story and controls fit viewport');
    assert.ok(await page.locator('.frame').evaluateAll(els => [-1, 1].every(distance => {
      const el = els.find(e => Number(e.dataset.distance) === distance);
      const r = el.getBoundingClientRect();
      return getComputedStyle(el).visibility === 'visible' && Number(getComputedStyle(el).opacity) > 0 && r.right > 0 && r.left < innerWidth;
    })), 'both adjacent previews remain visible');
    await page.screenshot({ path: `${output}/${width}-${reducedMotion}-initial.png`, fullPage: true });
    const shapes = [];
    for (let index = 0; index < 3; index++) {
      await snap(); shapes.push(await photo());
      await page.screenshot({ path: `${output}/${width}-${reducedMotion}-variant-${index}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Próxima moldura' }).scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await page.getByRole('button', { name: 'Próxima moldura' }).click();
      if (reducedMotion === 'no-preference') {
        await page.waitForFunction(() => document.querySelector('.sticker[data-phase="out"]'));
        assert.ok(await page.locator('.sticker[data-phase="in"]').count() >= 2);
        assert.ok(await page.locator('.sticker').evaluateAll(els => els.every(e => e.getAnimations().some(a => a.effect.getKeyframes().some(k => Number(k.opacity) === 0 && parseFloat(k.scale) < 1)))), 'real scale/opacity pop keyframes');
        const morph = [];
        for (let frame = 0; frame < 3; frame++) {
          morph.push(await visiblePhoto(`${output}/${width}-${reducedMotion}-morph-${index}-${frame}.png`));
          await page.waitForTimeout(35);
        }
        assert.ok(new Set(morph.map(r => r.map(v => v.toFixed(2)).join(','))).size > 1, 'progressive independent geometry');
      }
    }
    await snap();
    assert.equal(new Set(shapes.map(r => r.slice(2).join(','))).size, 3, 'three distinct photo sizes');
    assert.equal(new Set(geometry.map(g => g.slice(4).join(','))).size, 3, 'three distinct shapes');
    await page.evaluate(() => {
      window.trace = []; window.record = true;
      function sample(t) {
        const scene = document.querySelector('.scene');
        window.trace.push({ t, p: Number(scene.dataset.position), drag: scene.hasAttribute('data-dragging'), transforms: [...document.querySelectorAll('.frame')].map(e => ({ slot: e.dataset.slot, d: Number(e.dataset.distance), transform: e.style.transform })) });
        if (window.record) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    await swipe(-125, 1, 12, 25, true); await snap();
    assert.equal(await scene.getAttribute('data-active'), '1');
    await swipe(-18, 1); await snap();
    assert.equal(await scene.getAttribute('data-active'), '1');
    await swipe(-140, 1, 5, 8);
    await swipe(-100, 1, 5, 8);
    await swipe(125, 1, 6, 10); await snap();
    for (let i = 0; i < 8; i++) { await scene.focus(); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(35); }
    await snap();
    for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowRight', 'ArrowLeft']) {
      await scene.focus(); await page.keyboard.press(key); await page.waitForTimeout(190);
      assert.ok(await page.locator('.sticker').count() <= 6, 'interruption has no queued sticker sets');
    }
    await snap();
    const before = Number(await scene.getAttribute('data-active'));
    await page.getByRole('button', { name: 'Próxima moldura' }).click(); await snap();
    assert.equal(Number(await scene.getAttribute('data-active')), (before + 1) % 3);
    await page.getByRole('button', { name: 'Moldura anterior' }).click(); await snap();
    assert.equal(Number(await scene.getAttribute('data-active')), before);
    const box = await scene.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + 100); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 110, box.y + 101, { steps: 20 });
    await page.mouse.up(); await snap();
    const trace = await page.evaluate(() => { window.record = false; return window.trace; });
    await writeFile(`${output}/${width}-${reducedMotion}-trajectory.json`, JSON.stringify(trace));
    assert.ok(trace.some(s => s.drag && s.transforms.some(f => Math.abs(f.d) > .1 && Math.abs(f.d) < .9 && /rotateY\(/.test(f.transform))));
    if (reducedMotion === 'no-preference') {
      const deltas = trace.slice(1).map((s, i) => ({ dt: s.t - trace[i].t, dx: (((s.p - trace[i].p + 1.5) % 3 + 3) % 3) - 1.5, drag: s.drag || trace[i].drag }));
      assert.ok(deltas.filter(s => !s.drag && s.dt < 40).every(s => Math.abs(s.dx) < .5), 'continuous settling');
      assert.ok(deltas.some(s => !s.drag && Math.abs(s.dx) > .001), 'progressive release');
    }
    // No recycled slot can have any visible pixels in the viewport.
    assert.ok(await page.locator('.frame').evaluateAll(els => els.filter(e => Math.abs(Number(e.dataset.distance)) >= 3).every(e => { const r = e.getBoundingClientRect(); return r.right < 0 || r.left > innerWidth || getComputedStyle(e).visibility === 'hidden' || Number(getComputedStyle(e).opacity) === 0; })));
    if (width < 800) {
      await page.evaluate(() => scrollTo(0, 0));
      const active = await scene.getAttribute('data-active');
      await swipe(1, -100); await page.waitForTimeout(350);
      assert.ok(await page.evaluate(() => scrollY) > 20, 'vertical scroll preserved');
      assert.equal(await scene.getAttribute('data-active'), active);
      await page.evaluate(() => scrollTo(0, 0));
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(await page.evaluate(() => window.cspViolations), []);
    const transforms = await page.locator('.frame').evaluateAll(els => els.map(e => e.style.transform));
    await page.waitForTimeout(200);
    assert.deepEqual(await page.locator('.frame').evaluateAll(els => els.map(e => e.style.transform)), transforms);
    await page.screenshot({ path: `${output}/${width}-${reducedMotion}-final.png`, fullPage: true });
    if (reducedMotion === 'no-preference') {
      for (const interaction of ['keyboard', 'pointer', 'button']) {
        await page.reload();
        await page.waitForFunction(() => document.querySelector('.scene').dataset.entrance === 'running');
        if (interaction === 'keyboard') { await scene.focus(); await page.keyboard.press('ArrowRight'); }
        if (interaction === 'button') await page.getByRole('button', { name: 'Próxima moldura' }).click();
        if (interaction === 'pointer') await swipe(-125, 1, 10, 18);
        assert.equal(await scene.getAttribute('data-entrance'), 'ready', 'input ends entrance immediately');
        await snap();
        assert.equal(await scene.getAttribute('data-active'), '1', 'input during entrance keeps correct snap');
        await page.waitForTimeout(400);
        assert.equal(await scene.getAttribute('data-entrance'), 'ready', 'entrance never restarts');
      }
      await page.reload();
      await page.waitForFunction(() => document.querySelector('.scene').dataset.entrance === 'running');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.querySelector('.scene').dataset.entrance === 'ready');
      assert.equal(await page.locator('.photo').evaluate(el => el.getAnimations().length), 0, 'motion preference change cancels reveal');
    }
    console.log(`PASS ${width} ${reducedMotion}: HTTP, continuous perspective, adaptive photo, opaque backgrounds, three shapes, pop lifecycle, independent photo visibility, slow/fast/reverse/repeated swipe, wrap, snap, mouse, keyboard, buttons, scroll, overflow, idle`);
    await context.close();
  }
  // Deterministic browser integration: advance the real scheduler/spring using
  // Playwright's clock, rather than asserting implementation strings.
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 }, hasTouch: true, isMobile: width < 800 });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    assert.equal((await page.goto(origin + '/estudos/perspectiva/')).status(), 200);
    const scene = page.locator('.scene');
    const active = () => scene.getAttribute('data-active');
    const run = ms => page.clock.runFor(ms);
    const blur = () => page.evaluate(() => document.activeElement.blur());
    const outside = async () => { await page.mouse.move(1, 1); await blur(); };
    // IO is intentionally asynchronous and is not a timer controlled by clock.
    await page.waitForTimeout(80);
    await run(1100); assert.equal(await active(), '0');
    assert.equal(await scene.getAttribute('data-entrance'), 'running');
    await run(100); assert.equal(await scene.getAttribute('data-entrance'), 'ready');
    await run(4900); assert.equal(await active(), '0', 'no advance before entrance + 5s');
    await run(500); assert.equal(await active(), '1', 'autoplay commits through spring');
    assert.equal(await page.locator('.photo').getAttribute('data-shape'), '1');
    assert.equal(await page.locator('.sticker[data-set="1"]').count(), 3);
    await run(1200);
    // Touch interrupts an automatic transition, retaining the existing position.
    await run(5200);
    const cdp = await context.newCDPSession(page);
    const b = await scene.boundingBox(), x = b.x + b.width / 2, y = b.y + b.height * .45;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 16, y }] });
      await run(20);
    }
    await run(9000);
    assert.ok(await scene.evaluate(el => el.hasAttribute('data-dragging')), 'no timer steals a held gesture');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await run(1600);
    const afterSwipe = Number(await active());
    await run(6300); assert.equal(Number(await active()), afterSwipe, 'swipe suspends for 8s after release');
    await run(600); assert.equal(Number(await active()), (afterSwipe + 1) % 3, 'touch synthetic hover/focus does not block resume');
    await run(1300);
    const toggle = page.locator('.autoplay');
    await toggle.click(); await outside();
    assert.equal(await toggle.textContent(), 'Retomar');
    const paused = await active();
    await run(24000); assert.equal(await active(), paused, 'explicit pause persists');
    await toggle.click(); await outside();
    await run(7900); assert.equal(await active(), paused);
    await run(600); assert.equal(Number(await active()), (Number(paused) + 1) % 3);
    await run(1300);
    // Hover is mouse-only, then leaving starts a fresh interval (no catch-up).
    await page.mouse.move(x, y);
    const hover = await active();
    await run(16000); assert.equal(await active(), hover);
    await outside(); await run(4900); assert.equal(await active(), hover);
    await run(600); assert.equal(Number(await active()), (Number(hover) + 1) % 3);
    await run(1300);
    await scene.focus(); await page.keyboard.press('ArrowRight'); await run(1600);
    const focused = await active();
    await run(16000); assert.equal(await active(), focused, 'keyboard focus suspends indefinitely');
    await blur(); await run(4900); assert.equal(await active(), focused);
    await run(600); assert.equal(Number(await active()), (Number(focused) + 1) % 3);
    await run(1300);
    // Browser viewport geometry triggers the real IntersectionObserver.
    await page.evaluate(() => { document.querySelector('footer').style.paddingBottom = '2000px'; scrollTo(0, document.body.scrollHeight); });
    await page.waitForTimeout(100);
    const offscreen = await active(); await run(18000); assert.equal(await active(), offscreen);
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(100);
    await run(4900); assert.equal(await active(), offscreen);
    await run(600); assert.equal(Number(await active()), (Number(offscreen) + 1) % 3);
    await run(1300);
    // CDP background lifecycle is not portable in headless Chromium; shadow only
    // the visibility property, delivering the same visibilitychange event.
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    const hidden = await active(); await run(18000); assert.equal(await active(), hidden);
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await run(4900); assert.equal(await active(), hidden);
    await run(600); assert.equal(Number(await active()), (Number(hidden) + 1) % 3);
    await run(1300);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(60);
    const reduced = await active(); await run(18000); assert.equal(await active(), reduced);
    assert.equal(await toggle.textContent(), 'Retomar');
    await toggle.click(); await outside(); await run(8100);
    assert.equal(Number(await active()), (Number(reduced) + 1) % 3, 'reduced motion explicit opt-in');
    assert.equal(await page.locator('.photo').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    assert.equal(await page.locator('.sticker').evaluateAll(els => els.flatMap(el => el.getAnimations()).length), 0);
    await toggle.click(); await outside();
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.waitForTimeout(60);
    const manual = await active(); await run(18000); assert.equal(await active(), manual, 'media changes preserve explicit pause');
    await toggle.click(); await outside(); await run(9400);
    const first = Number(await active());
    // Exactly one advancement per full resting interval; no accumulated timers.
    await run(4000); assert.equal(Number(await active()), first);
    await run(2200); assert.equal(Number(await active()), (first + 1) % 3);
    await toggle.click(); await outside();
    await page.evaluate(() => { document.querySelector('footer').style.paddingBottom = ''; scrollTo(0, 0); });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${output}/${width}-autoplay-control.png`, fullPage: true });
    console.log(`PASS ${width}: controlled-clock autoplay, first tick, morph/stickers, interrupted gesture/8s resume, manual pause, hover, focus, viewport, visibility, reduced-motion opt-in/change, duplicate timer guard, overflow`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
