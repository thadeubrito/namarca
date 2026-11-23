(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Map();
  const pending = new Set();
  // Keep entrance travel inside the page gutter, without clipping content.
  const gutter = Math.min(48, Math.max(0, (innerWidth - (document.querySelector('.wrap')?.getBoundingClientRect().width || innerWidth)) / 2));
  const frames = {
    left: { opacity: 0, translate: `-${gutter}px 0` },
    right: { opacity: 0, translate: `${gutter}px 0` },
    up: { opacity: 0, translate: '0 40px' },
    fade: { opacity: 0 },
    piece: { opacity: 0, translate: '0 55px', scale: '.92' },
    star: { opacity: 0, rotate: '-35deg', scale: '.75' },
    line: { opacity: 0, strokeDashoffset: '1' },
  };
  document.querySelector('.mobile-nav')?.addEventListener('click', (event) => {
    if (event.target.closest('a')) event.currentTarget.open = false;
  });
  // Only WAAPI holds an initial state: without JS or WAAPI all content stays visible.
  if (!Element.prototype.animate || reduced.matches) return;
  const finish = (element) => {
    running.get(element)?.cancel();
    running.delete(element);
    pending.delete(element);
    element.dataset.revealed = 'true';
  };
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target;
      observer.unobserve(element);
      if (!pending.has(element)) continue;
      const animation = running.get(element);
      element.dataset.revealed = 'entering';
      animation.play();
      animation.finished.then(() => finish(element)).catch(() => {});
    }
  }, { threshold: .12 });
  for (const element of document.querySelectorAll('[data-reveal]')) {
    const start = frames[element.dataset.reveal] || frames.fade;
    const animation = element.animate([start, { opacity: 1, translate: '0 0', rotate: '0deg', scale: '1', strokeDashoffset: '0' }], {
      duration: element.dataset.reveal === 'fade' ? 650 : 850,
      delay: Number(element.dataset.delay || 0), easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both',
    });
    animation.pause();
    running.set(element, animation);
    pending.add(element);
    observer.observe(element);
  }
  const revealTarget = (target) => {
    for (const element of [...pending]) if (element.contains(target) || target.contains(element)) finish(element);
  };
  document.addEventListener('focusin', (event) => revealTarget(event.target));
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const target = document.getElementById(link.hash.slice(1));
    if (target) revealTarget(target);
  });
  const showHash = () => {
    const target = document.getElementById(location.hash.slice(1));
    if (target) revealTarget(target);
  };
  addEventListener('hashchange', showHash);
  showHash();
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    observer.disconnect();
    for (const element of [...pending]) finish(element);
  });
})();
