/* Namarca — independent DOM perspective study. No reference code or assets. */
(() => {
  'use strict';
  document.querySelectorAll('[data-perspective]').forEach(initPerspective);
  function initPerspective(root) {
  if (root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const scope = root.parentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const counter = scope.querySelector('.counter');
  const status = scope.querySelector('[role="status"]');
  const wrap = n => ((n % 3) + 3) % 3;
  // Independent photo geometry in a 900 × 1600 Stories canvas.
  // Solid materials need no second clipping shape to align.
  const compositions = [
    { shape: [62, 120, 776, 1290, 24, 24], material: '#858585', stickers: [[20, 1040, 220, 138, -9], [655, 1350, 188, 160, 8]] },
    { shape: [130, 170, 700, 1170, 350, 585], material: '#a2a2a2', stickers: [[30, 320, 200, 150, -12], [598, 1190, 245, 135, 11], [100, 1400, 155, 100, -5]] },
    { shape: [74, 420, 670, 930, 140, 140], material: '#747474', stickers: [[535, 190, 250, 165, 10], [28, 1230, 210, 160, -7]] }
  ];
  const photo = root.querySelector('.photo');
  const stickerLayer = document.createElement('div');
  stickerLayer.className = 'sticker-layer'; stickerLayer.setAttribute('aria-hidden', 'true');
  root.append(stickerLayer);
  let selection = -1;
  // A single, interruptible entrance; it never owns carousel position or input.
  let entering = !reduce.matches && !document.hidden;
  let entranceProgress = entering ? 0 : 1, entranceRaf = 0;
  const entranceAnimations = [];
  const phase = (ms, start, duration) => {
    const t = Math.max(0, Math.min(1, (ms - start) / duration));
    return 1 - (1 - t) ** 3;
  };
  function stickers(index, entrance = false) {
    // Interruptions retain at most the current and outgoing sets, never queues.
    stickerLayer.querySelectorAll('[data-phase="out"]').forEach(el => { el.getAnimations().forEach(a => a.cancel()); el.remove(); });
    [...stickerLayer.children].forEach(el => {
      el.getAnimations().forEach(a => a.cancel());
      if (reduce.matches) { el.remove(); return; }
      el.dataset.phase = 'out';
      const animation = el.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '.65' }], { duration: 90, fill: 'forwards', easing: 'ease-in' });
      animation.finished.then(() => el.remove()).catch(() => {});
    });
    compositions[index].stickers.forEach(([x, y, w, h, angle], i) => {
      const el = document.createElement('div'); el.className = 'sticker';
      el.dataset.set = String(index); el.dataset.phase = reduce.matches ? 'ready' : 'in';
      Object.assign(el.style, { left: `${x / 9}%`, top: `${y / 16}%`, width: `${w / 9}%`, height: `${h / 16}%`, rotate: `${angle}deg` });
      stickerLayer.append(el);
      if (!reduce.matches) {
        const animation = el.animate([{ opacity: 0, scale: '.75' }, { opacity: 1, scale: '1.045', offset: .72 }, { opacity: 1, scale: '1' }], { duration: 230, delay: (entrance ? 760 : 65) + i * 24, fill: 'both', easing: 'cubic-bezier(.2,.7,.3,1)' });
        if (entrance) entranceAnimations.push(animation);
        animation.finished.then(() => { if (el.dataset.phase === 'in') { el.dataset.phase = 'ready'; animation.cancel(); } }).catch(() => {});
      }
    });
  }
  function select(index) {
    if (selection === index) return;
    selection = index;
    const [x, y, w, h, rx, ry] = compositions[index].shape;
    // Optional root-scoped geometry; absent properties retain every study's defaults.
    Object.assign(photo.style, { left: `var(--perspective-photo-${index}-left, ${x / 9}%)`, top: `var(--perspective-photo-${index}-top, ${y / 16}%)`, width: `var(--perspective-photo-${index}-width, ${w / 9}%)`, height: `var(--perspective-photo-${index}-height, ${h / 16}%)`, borderRadius: `var(--perspective-photo-${index}-radius, ${rx / w * 100}% / ${ry / h * 100}%)` });
    photo.dataset.shape = String(index);
    stickers(index, entering);
    root.dataset.active = String(index);
    if (counter) counter.textContent = `0${index + 1} / 03`;
    if (status) status.textContent = `Composição ${index + 1} de 3`;
  }
  function material(el, index) {
    el.style.backgroundColor = `var(--perspective-material-${index}, ${compositions[index].material})`;
  }
  // Nine instances, only three materials. Recycle exclusively beyond the clipped
  // viewport: at the half-slot boundary the outgoing slot is >3.5 gaps away.
  const pool = Array.from({ length: 9 }, () => {
    const el = document.createElement('div');
    el.className = 'frame';
    return el;
  });
  root.querySelector('.track').replaceChildren(...pool);
  let position = 0, target = 0, velocity = 0, raf = 0, last = 0, drag = null;
  let gap = 1;
  const controls = scope.querySelector('.controls');
  const autoplayButton = scope.querySelector('.autoplay');
  const autoplayLabel = autoplayButton?.querySelector('[data-autoplay-label]') || autoplayButton;
  let autoTimer = 0, interactionUntil = 0, explicitlyPaused = false;
  let motionOptIn = false, inViewport = false, keyboardMode = false, keyboardFocus = false;
  const hovered = new Set();
  const isCarousel = el => el && (root.contains(el) || controls?.contains(el));
  function clearAutoplay() { clearTimeout(autoTimer); autoTimer = 0; }
  function scheduleAutoplay() {
    const paused = explicitlyPaused || (reduce.matches && !motionOptIn);
    if (autoplayLabel) autoplayLabel.textContent = (paused ? 'Retomar' : 'Pausar') + (autoplayLabel === autoplayButton ? '' : ' animação');
    autoplayButton?.setAttribute('aria-pressed', String(paused));
    if (paused || entering || drag || root.dataset.settled !== 'true' || document.hidden || !inViewport || keyboardFocus || hovered.size) {
      clearAutoplay(); return;
    }
    if (autoTimer) return;
    autoTimer = setTimeout(() => { autoTimer = 0; step(1); }, Math.max(5000, interactionUntil - performance.now()));
  }
  function interact() {
    interactionUntil = performance.now() + 8000;
    clearAutoplay(); scheduleAutoplay();
  }
  // Keyboard focus is a hard suspension, unlike synthetic touch focus/hover.
  document.addEventListener('pointerdown', e => {
    keyboardMode = false; keyboardFocus = false;
    if (e.pointerType !== 'mouse') hovered.clear();
    if (isCarousel(e.target)) interact(); else scheduleAutoplay();
  }, true);
  document.addEventListener('keydown', e => {
    keyboardMode = true;
    if (isCarousel(e.target)) { keyboardFocus = true; interact(); }
  }, true);
  for (const region of [...new Set([root, controls || autoplayButton].filter(Boolean))]) {
    region.addEventListener('focusin', () => { keyboardFocus = keyboardMode; scheduleAutoplay(); });
    region.addEventListener('focusout', () => queueMicrotask(() => {
      keyboardFocus = keyboardMode && isCarousel(document.activeElement); scheduleAutoplay();
    }));
    region.addEventListener('pointerenter', e => {
      if (e.pointerType === 'mouse') { hovered.add(region); scheduleAutoplay(); }
    });
    region.addEventListener('pointerleave', e => {
      if (e.pointerType === 'mouse') { hovered.delete(region); scheduleAutoplay(); }
    });
    region.addEventListener('pointermove', e => { if (e.buttons) interact(); });
    region.addEventListener('pointerup', interact);
    region.addEventListener('pointercancel', interact);
  }
  autoplayButton?.addEventListener('click', () => {
    const paused = explicitlyPaused || (reduce.matches && !motionOptIn);
    explicitlyPaused = !paused;
    if (paused && reduce.matches) motionOptIn = true;
    interact();
  });
  new IntersectionObserver(entries => {
    inViewport = entries[0].isIntersecting;
    clearAutoplay(); scheduleAutoplay();
  }).observe(root);
  function paint() {
    const base = Math.round(position);
    pool.forEach((el, i) => {
      const slot = base + i - 4;
      const d = slot - position, distance = Math.abs(d);
      // Smooth at zero (no abs cusp in depth/scale), front-facing at the snap.
      const depth = 210 * (Math.sqrt(1 + d * d) - 1);
      const angle = -48 * Math.tanh(d * .9);
      const scale = 1 / (1 + .035 * d * d);
      if (el.dataset.slot !== String(slot)) {
        el.className = `frame variant-${wrap(slot)}`;
        el.dataset.slot = String(slot);
        material(el, wrap(slot));
      }
      el.dataset.distance = String(d);
      // Opening and carousel geometry share ONE transform writer. At progress=1
      // these are exactly the original resting / dragging transforms.
      const ms = entranceProgress * 1120;
      const open = phase(ms, 100, 720), reveal = phase(ms, 0, 440);
      const spread = .12 + .88 * open;
      el.style.transform = `translate3d(${d * gap * spread}px, ${(1 - reveal) * 12}px, ${-depth * open}px) rotateY(${angle * open}deg) scale(${scale * (.97 + .03 * reveal)})`;
      el.style.opacity = String(reveal * Math.max(0, Math.min(1 - .16 * distance, (2.4 - distance) * 1.5)));
      el.style.zIndex = String(1000 - Math.round(distance * 100));
      // Hidden well outside both desktop and mobile viewports, never mid-scene.
      el.style.visibility = distance > 3.4 ? 'hidden' : 'visible';
    });
    root.dataset.position = String(position);
  }
  function measure() {
    // Geometry reads are cached and never run in pointermove or animation ticks.
    gap = pool[0].offsetWidth * 1.02;
    if (drag) { drag.start = position; drag.x = drag.latestX; drag.dx = 0; drag.samples = []; }
    paint();
  }
  // Selection stays frozen throughout a drag. Commit only in the last .32 slot
  // of settling, once per effective index: no boundary flicker or per-rAF tween.
  function announce(force = false) {
    if (force || (!drag && Math.abs(position - target) < .32)) select(wrap(Math.round(target)));
  }
  function rest() {
    position = target = wrap(Math.round(target));
    velocity = 0; last = 0;
    root.dataset.settled = 'true';
    announce(true); paint(); scheduleAutoplay();
  }
  function tick(now) {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60;
    last = now;
    if (drag) { paint(); return; }
    if (reduce.matches) { rest(); return; }
    // Exact critical spring keeps the measured release velocity on the same
    // curve as settling, and remains stable at variable requestAnimationFrame dt.
    const omega = 14, offset = position - target;
    const decay = Math.exp(-omega * dt), c = velocity + omega * offset;
    position = target + (offset + c * dt) * decay;
    velocity = (velocity - omega * c * dt) * decay;
    if (Math.abs(target - position) < .0002 && Math.abs(velocity) < .003) { rest(); return; }
    announce(); paint(); raf = requestAnimationFrame(tick);
  }
  function wake() {
    clearAutoplay();
    root.dataset.settled = 'false';
    if (!raf && !document.hidden) raf = requestAnimationFrame(tick);
  }
  function step(direction) {
    finishEntrance();
    if (drag) return;
    target = Math.round(target) + direction;
    announce(); wake();
  }
  root.addEventListener('pointerdown', e => {
    if (e.button !== 0 || drag || !e.isPrimary || e.target.closest('button')) return;
    finishEntrance();
    clearAutoplay();
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
    target = Math.round(position + Math.max(-.65, Math.min(.65, velocity * .16)));
    if (d.locked && released && Math.abs(d.dx) > gap * .14 && target === Math.round(d.start)) target -= Math.sign(d.dx);
    last = performance.now(); announce(); wake();
  }
  for (const type of ['pointerup', 'pointercancel']) root.addEventListener(type, finish);
  root.addEventListener('lostpointercapture', e => { if (e.target === root) finish(e, false); });
  root.addEventListener('pointerleave', e => { if (drag && !drag.locked && e.pointerType === 'mouse') finish(e, false); });
  root.addEventListener('keydown', e => {
    if (e.target.closest('button') || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault(); step(e.key === 'ArrowLeft' ? -1 : 1);
  });
  scope.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => { interact(); step(Number(button.dataset.step)); }));
  new ResizeObserver(measure).observe(root);
  reduce.addEventListener('change', () => {
    motionOptIn = false;
    clearAutoplay(); scheduleAutoplay();
    if (reduce.matches) {
      finishEntrance();
      stickerLayer.querySelectorAll('.sticker').forEach(el => {
        el.getAnimations().forEach(a => a.cancel());
        if (el.dataset.phase === 'out') el.remove();
        else el.dataset.phase = 'ready';
      });
    }
    if (!drag) { target = Math.round(target); wake(); }
  });
  document.addEventListener('visibilitychange', () => {
    clearAutoplay();
    if (!document.hidden) { scheduleAutoplay(); return; }
    finishEntrance();
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
  function finishEntrance() {
    if (!entering) return;
    entering = false; entranceProgress = 1;
    cancelAnimationFrame(entranceRaf);
    entranceAnimations.forEach(animation => animation.cancel());
    stickerLayer.querySelectorAll('[data-phase="in"]').forEach(el => { el.dataset.phase = 'ready'; });
    root.dataset.entrance = 'ready';
    paint(); scheduleAutoplay();
  }
  root.dataset.entrance = entering ? 'running' : 'ready';
  select(0);
  measure();
  if (entering) {
    // Scale/clip only: left/top/size/radius remain exclusively owned by morph.
    entranceAnimations.push(photo.animate([
      { opacity: 0, transform: 'translateY(10px) scale(.96)', clipPath: 'inset(8% 4% 8% 4%)' },
      { opacity: 1, transform: 'translateY(0) scale(1)', clipPath: 'inset(0%)' }
    ], { duration: 640, delay: 260, fill: 'both', easing: 'cubic-bezier(.2,.7,.3,1)' }));
    const start = performance.now();
    function entranceTick(now) {
      if (!entering) return;
      entranceProgress = Math.min(1, (now - start) / 1120);
      paint();
      if (entranceProgress === 1) finishEntrance();
      else entranceRaf = requestAnimationFrame(entranceTick);
    }
    entranceRaf = requestAnimationFrame(entranceTick);
  }
  }
})();
