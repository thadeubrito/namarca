import { createLifecycle, captureDOM } from './lifecycle';
export function initializeLima(scope) {
  const life = createLifecycle();
  const { listen, observe, guard, requestFrame: requestAnimationFrame } = life;
  life.onCleanup(captureDOM(scope));
  life.onCleanup(() => scope.querySelectorAll('*').forEach(el => el.getAnimations?.().forEach(a => a.cancel())));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Map();
  const pending = new Set();
  // Keep entrance travel inside the page gutter, without clipping content.
  const gutter = Math.min(48, Math.max(0, (innerWidth - (scope.querySelector('.wrap')?.getBoundingClientRect().width || innerWidth)) / 2));
  const frames = {
    left: { opacity: 0, translate: `-${gutter}px 0` },
    right: { opacity: 0, translate: `${gutter}px 0` },
    up: { opacity: 0, translate: '0 40px' },
    fade: { opacity: 0 },
    star: { opacity: 0, rotate: '-35deg', scale: '.75' },
  };
  const mobileNav = scope.querySelector('.mobile-nav');
  const menuSummary = mobileNav?.querySelector('summary');
  const updateMenuLabel = () => menuSummary?.setAttribute('aria-label', mobileNav.open ? 'Fechar o menu' : 'Abrir o menu');
  listen(mobileNav, 'toggle', updateMenuLabel);
  listen(mobileNav, 'click', (event) => {
    if (event.target.closest('a')) {
      mobileNav.open = false;
      updateMenuLabel();
    }
  });
  listen(document, 'keydown', (event) => {
    if (event.key === 'Escape' && mobileNav?.open) {
      mobileNav.open = false;
      updateMenuLabel();
      menuSummary.focus();
    }
  });
  // The network has one independent timeline, never a nested generic reveal.
  const network = scope.querySelector('.sharing-network');
  if (network) {
    const cards = [...network.querySelectorAll('.network-card')];
    const paths = [...network.querySelectorAll('path')];
    const svg = network.querySelector('svg');
    let animations = [], played = false, queued = 0;
    const complete = () => {
      animations.forEach(a => a.cancel());
      animations = [];
      network.dataset.motion = 'complete';
    };
    const measure = () => {
      queued = 0;
      const base = network.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);
      const boxes = cards.map(c => { const b = c.getBoundingClientRect(); return {x:b.left-base.left,y:b.top-base.top,w:b.width,h:b.height}; });
      const mobile = innerWidth <= 900;
      for (const path of paths) {
        const from = Number(path.dataset.from), to = Number(path.dataset.to);
        const a = boxes[from], b = boxes[to];
        let d;
        if (!mobile) {
          const x=a.x+a.w, y=a.y+a.h*.5, endX=b.x, endY=b.y+b.h*.5, mid=(x+endX)/2;
          d=`M ${x} ${y} C ${mid} ${y} ${mid} ${endY} ${endX} ${endY}`;
        } else {
          const x=a.x+a.w*.5,y=a.y+a.h,endX=b.x+b.w*.5,endY=b.y,mid=(y+endY)/2;
          d=`M ${x} ${y} C ${x} ${mid} ${endX} ${mid} ${endX} ${endY}`;
        }
        path.setAttribute('d',d);
      }
    };
    const schedule = () => { if (!queued) queued=requestAnimationFrame(measure); };
    measure();
    listen(window, 'resize', schedule);
    if (typeof ResizeObserver !== 'undefined') observe(new ResizeObserver(guard(schedule))).observe(network);
    document.fonts?.ready.then(guard(schedule));
    listen(document.fonts, 'loadingdone', schedule);
    if (Element.prototype.animate && typeof IntersectionObserver !== 'undefined' && !reduced.matches) {
      try {
        const add = (element, frames, duration, delay) => {
          const a=element.animate(frames,{duration,delay,easing:'cubic-bezier(.22,.61,.36,1)',fill:'both'});
          a.pause(); animations.push(a);
        };
        cards.forEach((card,i) => add(card.firstElementChild,[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],560,[0,850,1060,2100,2290,2480,2670][i]));
        paths.forEach((path,i) => {
          path.setAttribute('pathLength','1');
          add(path,[{strokeDasharray:'1',strokeDashoffset:1},{strokeDasharray:'1',strokeDashoffset:0}],650,i<2?350+i*100:1400+(i-2)*120);
        });
        network.dataset.motion='pending';
        const trigger = observe(new IntersectionObserver(guard(entries => {
          if (!entries.some(e=>e.isIntersecting) || played) return;
          played=true; trigger.disconnect(); network.dataset.motion='playing';
          animations.forEach(a=>a.play());
          Promise.all(animations.map(a=>a.finished)).then(guard(complete)).catch(()=>{});
        }),{threshold:0,rootMargin:'0px 0px -70px 0px'}));
        trigger.observe(cards[0]);
        listen(reduced, 'change', () => { if(reduced.matches){played=true;trigger.disconnect();complete();} });
      } catch { complete(); }
    }
  }
  // Only WAAPI holds an initial state: without JS or WAAPI all content stays visible.
  if (!Element.prototype.animate || reduced.matches) return life.cleanup;
  const finish = (element) => {
    running.get(element)?.cancel();
    running.delete(element);
    pending.delete(element);
    element.dataset.revealed = 'true';
  };
  const observer = observe(new IntersectionObserver(guard((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target;
      observer.unobserve(element);
      if (!pending.has(element)) continue;
      const animation = running.get(element);
      element.dataset.revealed = 'entering';
      animation.play();
      animation.finished.then(guard(() => finish(element))).catch(() => {});
    }
  }), { threshold: .12 }));
  for (const element of scope.querySelectorAll('[data-reveal]')) {
    const start = frames[element.dataset.reveal] || frames.fade;
    const animation = element.animate([start, { opacity: 1, translate: '0 0', rotate: '0deg', scale: '1' }], {
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
  listen(document, 'focusin', (event) => revealTarget(event.target));
  listen(document, 'click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const target = document.getElementById(link.hash.slice(1));
    if (target) revealTarget(target);
  });
  const showHash = () => {
    const target = document.getElementById(location.hash.slice(1));
    if (target) revealTarget(target);
  };
  listen(window, 'hashchange', showHash);
  showHash();
  listen(reduced, 'change', () => {
    if (!reduced.matches) return;
    observer.disconnect();
    for (const element of [...pending]) finish(element);
  });
  return life.cleanup;
}
