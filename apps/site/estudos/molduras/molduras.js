/* Namarca: vanilla CircularGallery arcOf adaptation, wave=0, DOM not WebGL.
 * Copyright (c) 2026 David Haz. MIT + Commons Clause; see ../NOTICE.txt.
 * Fixed photo is deliberately outside the moving slot pool.
 */
(() => {
  'use strict';
  const root = document.querySelector('.scene');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const counter = document.querySelector('.counter');
  const status = document.querySelector('[role="status"]');
  const wrap = n => ((n % 3) + 3) % 3;
  const pool = Array.from({ length: 9 }, () => {
    const el = document.createElement('div');
    el.className = 'frame';
    return el;
  });
  root.querySelector('.track').replaceChildren(...pool);
  let position = 0, target = 0, velocity = 0, raf = 0, last = 0, drag = null;
  let gap = 1, half = 1, radius = 1;
  function paint() {
    const base = Math.round(position);
    pool.forEach((el, i) => {
      const slot = base + i - 4;
      const x = (slot - position) * gap;
      const reach = Math.min(Math.abs(x), half, radius * .999);
      const y = radius - Math.sqrt(radius * radius - reach * reach);
      const angle = Math.sign(x) * Math.asin(reach / radius);
      if (el.dataset.slot !== String(slot)) {
        el.className = `frame variant-${wrap(slot)}`;
        el.dataset.slot = String(slot);
      }
      el.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;
    });
  }
  function measure() {
    // Layout reads only on initialization/resize, never in the animation loop.
    gap = pool[0].offsetWidth * 1.18;
    const height = root.clientHeight;
    const depth = 1.15 * height / 16.57;
    half = Math.max(root.clientWidth, height * 1.9) / 2;
    radius = (half * half + depth * depth) / (2 * depth);
    if (drag) { drag.start = position; drag.x = drag.latestX; drag.dx = 0; drag.samples = []; }
    paint();
  }
  function announce() {
    const active = String(wrap(Math.round(target)));
    if (root.dataset.active === active) return;
    root.dataset.active = active;
    counter.textContent = `0${Number(active) + 1} / 03`;
    status.textContent = `Moldura ${Number(active) + 1} de 3`;
  }
  function rest() {
    position = target = wrap(Math.round(target));
    velocity = 0; last = 0;
    root.dataset.settled = 'true';
    paint();
  }
  function tick(now) {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60;
    last = now;
    if (drag) { paint(); return; }
    if (reduce.matches) { rest(); return; }
    // Exact critically damped spring: one continuous position/velocity curve,
    // rather than a fling followed by a separate, abrupt snap animation.
    const omega = 15;
    const offset = position - target;
    const decay = Math.exp(-omega * dt);
    const c = velocity + omega * offset;
    position = target + (offset + c * dt) * decay;
    velocity = (velocity - omega * c * dt) * decay;
    if (Math.abs(target - position) < .0002 && Math.abs(velocity) < .003) { rest(); return; }
    paint();
    raf = requestAnimationFrame(tick);
  }
  function wake() {
    root.dataset.settled = 'false';
    if (!raf && !document.hidden) raf = requestAnimationFrame(tick);
  }
  function step(direction) {
    if (drag) return;
    target = Math.round(target) + direction;
    announce(); wake();
  }
  root.addEventListener('pointerdown', e => {
    if (e.button !== 0 || drag || !e.isPrimary) return;
    if (raf) cancelAnimationFrame(raf);
    raf = 0; last = 0; velocity = 0;
    drag = { id: e.pointerId, x: e.clientX, latestX: e.clientX, y: e.clientY, start: position, dx: 0, locked: false, samples: [[e.clientX, e.timeStamp]] };
  });
  root.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.locked) {
      if (Math.hypot(dx, dy) < 7) return;
      if (Math.abs(dy) > Math.abs(dx)) { finish(e, false); return; }
      drag.locked = true; root.setPointerCapture(e.pointerId); root.dataset.dragging = '';
    }
    drag.dx = dx; drag.latestX = e.clientX;
    drag.samples.push([e.clientX, e.timeStamp]);
    drag.samples = drag.samples.filter(s => e.timeStamp - s[1] <= 80);
    // Direct tracking, with no easing lag or layout read under the finger.
    position = drag.start - dx / gap;
    wake();
  });
  function finish(e, released = e.type === 'pointerup') {
    if (!drag || drag.id !== e.pointerId) return;
    const d = drag; drag = null;
    delete root.dataset.dragging;
    if (root.hasPointerCapture(d.id)) root.releasePointerCapture(d.id);
    const a = d.samples[0], b = d.samples.at(-1);
    velocity = released && d.locked && !reduce.matches && a && b && e.timeStamp - b[1] < 80
      ? Math.max(-6, Math.min(6, -(b[0] - a[0]) / Math.max(16, b[1] - a[1]) * 1000 / gap)) : 0;
    // Project a short distance to select the destination; velocity itself carries
    // through release into the spring. No extra inertia/snap phase boundary.
    target = Math.round(position + Math.max(-.65, Math.min(.65, velocity * .16)));
    if (d.locked && released && Math.abs(d.dx) > gap * .14 && target === Math.round(d.start)) target -= Math.sign(d.dx);
    last = performance.now();
    announce(); wake();
  }
  for (const type of ['pointerup', 'pointercancel']) root.addEventListener(type, finish);
  root.addEventListener('lostpointercapture', e => { if (e.target === root) finish(e, false); });
  root.addEventListener('pointerleave', e => { if (drag && !drag.locked && e.pointerType === 'mouse') finish(e, false); });
  root.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1);
  });
  document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => step(Number(button.dataset.step))));
  new ResizeObserver(measure).observe(root);
  reduce.addEventListener('change', () => { if (!drag) { target = Math.round(target); wake(); } });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (drag) {
      const id = drag.id; drag = null;
      delete root.dataset.dragging;
      if (root.hasPointerCapture(id)) root.releasePointerCapture(id);
      target = Math.round(position);
    }
    announce(); rest();
  });
  measure();
})();
