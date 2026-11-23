/* Namarca study: vanilla adaptations of React Bits Stack and CircularGallery.
 * Copyright (c) 2026 David Haz. MIT + Commons Clause; see NOTICE.txt.
 * Gallery uses the source's arcOf geometry with wave=0, rendered in DOM, not WebGL.
 */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const wrap = (n, count = 3) => ((n % count) + count) % count;
  const stack = document.querySelector('.stack');
  const gallery = document.querySelector('.gallery');
  const cards = [...stack.children];
  const order = [0, 1, 2];
  const poses = cards.map(() => ({ x: 0, y: 0, s: 1, r: 0 }));
  let busy = false;
  const announce = (root, active) => {
    root.dataset.active = String(wrap(active));
    document.querySelector(`#${root.classList.contains('stack') ? 'stack' : 'gallery'}-status`).textContent = `Cartão ${wrap(active) + 1} de 3`;
  };
  function paintCard(i) {
    const p = poses[i];
    cards[i].style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg) scale(${p.s})`;
  }
  // Damped numerical spring, matching Stack's place / tuck spring character.
  function spring(i, goal, stiffness = 260, damping = 24) {
    if (reduce.matches) { Object.assign(poses[i], goal); paintCard(i); return Promise.resolve(); }
    return new Promise(resolve => {
      const velocity = { x: 0, y: 0, s: 0, r: 0 };
      let last = performance.now();
      const start = last;
      function tick(now) {
        const dt = Math.min((now - last) / 1000, .032); last = now;
        let moving = false;
        for (const key of Object.keys(goal)) {
          velocity[key] += ((goal[key] - poses[i][key]) * stiffness - velocity[key] * damping) * dt;
          poses[i][key] += velocity[key] * dt;
          if (Math.abs(goal[key] - poses[i][key]) > .001 || Math.abs(velocity[key]) > .01) moving = true;
        }
        paintCard(i);
        if (moving && now - start < 1800) requestAnimationFrame(tick);
        else { Object.assign(poses[i], goal); paintCard(i); resolve(); }
      }
      requestAnimationFrame(tick);
    });
  }
  function settle() {
    return Promise.all(order.map((i, position) => {
      cards[i].style.zIndex = String(3 - position);
      return spring(i, { x: -position * 22, y: -position * 22, s: 1 - position * .035, r: 0 });
    }));
  }
  async function nextStack(direction = 1) {
    if (busy) return;
    busy = true;
    const top = order[0];
    if (!reduce.matches) await spring(top, { x: direction * (cards[top].offsetWidth + 50), y: 12, s: 1, r: direction * 7 }, 650, 42);
    order.push(order.shift());
    announce(stack, order[0]);
    await settle();
    busy = false;
  }
  settle();

  // Infinite slot pool, arc radius and tangent rotation from CircularGallery arcOf.
  // Flat grayscale cards need no texture mesh or shaders (wave is intentionally zero).
  const pool = Array.from({ length: 9 }, () => {
    const el = document.createElement('div'); el.className = 'card'; el.setAttribute('aria-hidden', 'true'); return el;
  });
  gallery.querySelector('.track').replaceChildren(...pool);
  let scroll = 0, target = 0, raf = 0, last = 0;
  const spacing = () => pool[0].offsetWidth * 1.12;
  function paintGallery() {
    const gap = spacing();
    const base = Math.round(scroll / gap);
    const depth = 1.15 * gallery.clientHeight / 16.57;
    const half = Math.max(gallery.clientWidth, gallery.clientHeight * 1.9) / 2;
    const radius = (half * half + depth * depth) / (2 * depth);
    pool.forEach((el, i) => {
      const slot = base + i - 4;
      const x = slot * gap - scroll;
      const reach = Math.min(Math.abs(x), half, radius * .999);
      const y = radius - Math.sqrt(radius * radius - reach * reach);
      const angle = Math.sign(x) * Math.asin(reach / radius);
      el.className = `card tone-${['a', 'b', 'c'][wrap(slot)]}`;
      el.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;
    });
  }
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60; last = now;
    scroll += (target - scroll) * (reduce.matches ? 1 : 1 - Math.pow(1 - .085, dt * 60));
    if (Math.abs(target - scroll) < .04) scroll = target;
    paintGallery();
    if (scroll !== target) raf = requestAnimationFrame(frame);
    else { last = 0; gallery.dataset.settled = 'true'; }
  }
  function wake() { gallery.dataset.settled = 'false'; if (!raf) raf = requestAnimationFrame(frame); }
  function snap() {
    target = Math.round(target / spacing()) * spacing();
    announce(gallery, Math.round(target / spacing())); wake();
  }
  function stepGallery(direction) { target = (Math.round(target / spacing()) + direction) * spacing(); snap(); }
  let oldSpacing = 0;
  new ResizeObserver(() => {
    const gap = spacing();
    if (oldSpacing) { target = target / oldSpacing * gap; scroll = scroll / oldSpacing * gap; }
    oldSpacing = gap; paintGallery();
  }).observe(gallery);
  paintGallery();

  // Direction lock deliberately gives vertical gestures back to native page scrolling.
  function gesture(root, handlers) {
    let drag = null;
    root.addEventListener('pointerdown', e => {
      if (e.button !== 0 || (root === stack && busy)) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, start: target, samples: [[e.clientX, e.timeStamp]], locked: false };
    });
    root.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.locked) {
        if (Math.hypot(dx, dy) < 7) return;
        if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
        drag.locked = true; root.setPointerCapture(e.pointerId); root.dataset.dragging = '';
      }
      drag.dx = dx;
      drag.samples.push([e.clientX, e.timeStamp]);
      drag.samples = drag.samples.filter(sample => e.timeStamp - sample[1] <= 100);
      handlers.move(drag);
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null; delete root.dataset.dragging;
      if (root.hasPointerCapture(e.pointerId)) root.releasePointerCapture(e.pointerId);
      if (d.locked) handlers.end(d, e.type === 'pointercancel');
    };
    root.addEventListener('pointerup', end); root.addEventListener('pointercancel', end);
    root.addEventListener('pointerleave', e => { if (drag && !drag.locked && e.pointerType === 'mouse') drag = null; });
  }
  gesture(stack, {
    move(d) { const top = order[0]; poses[top].x = d.dx; poses[top].r = reduce.matches ? 0 : d.dx / 30; paintCard(top); },
    end(d, cancelled) { if (!cancelled && Math.abs(d.dx) > 45) nextStack(Math.sign(d.dx)); else { busy = true; settle().then(() => { busy = false; }); } }
  });
  gesture(gallery, {
    move(d) { target = d.start - d.dx; wake(); },
    end(d, cancelled) {
      const a = d.samples[0], b = d.samples.at(-1);
      if (!cancelled && a && b && !reduce.matches) target -= (b[0] - a[0]) / Math.max(b[1] - a[1], 16) * 180;
      snap();
    }
  });
  document.querySelector('[data-next="stack"]').addEventListener('click', () => nextStack());
  document.querySelector('[data-next="gallery"]').addEventListener('click', () => stepGallery(1));
  document.querySelector('[data-prev="gallery"]').addEventListener('click', () => stepGallery(-1));
  for (const root of [stack, gallery]) root.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) return;
    e.preventDefault(); const direction = e.key === 'ArrowLeft' ? -1 : 1;
    if (root === stack) nextStack(direction); else stepGallery(direction);
  });
})();
