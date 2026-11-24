/* Reload starts at the hero; hashes and back/forward retain native navigation.
   Runs before layout so Safari does not first restore an off-screen carousel. */
(() => {
  'use strict';
  if (performance.getEntriesByType('navigation')[0]?.type !== 'reload') return;
  const previous = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  if (location.hash) {
    const hash = location.hash;
    addEventListener('pageshow', () => requestAnimationFrame(() => {
      if (location.hash !== hash) { history.scrollRestoration = previous; return; }
      // WebKit does not always repeat fragment positioning on reload.
      let id;
      try { id = decodeURIComponent(hash.slice(1)); } catch { history.scrollRestoration = previous; return; }
      document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
      history.scrollRestoration = previous;
    }), { once: true });
    return;
  }
  addEventListener('pageshow', () => requestAnimationFrame(() => {
    // Do not replay this on bfcache restoration or subsequent anchor navigation.
    scrollTo({ top: 0, left: 0, behavior: 'instant' });
    history.scrollRestoration = previous;
  }), { once: true });
})();
