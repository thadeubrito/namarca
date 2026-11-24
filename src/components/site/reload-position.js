import { createLifecycle } from './lifecycle';

// Native history/fragment navigation is untouched. Unlike the old head script,
// this runs after hydration: it cannot preempt a browser restoration before paint.
let handledReload = false;
export function initializeReloadPosition(scope) {
  const life = createLifecycle();
  if (handledReload || performance.getEntriesByType('navigation')[0]?.type !== 'reload') return life.cleanup;
  const previous = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  life.onCleanup(() => { history.scrollRestoration = previous; });
  const hash = location.hash;
  const restore = () => life.requestFrame(() => {
    if (handledReload) return;
    handledReload = true;
    if (location.hash === hash) {
      if (!hash) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      else {
        let id;
        try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
        [...scope.querySelectorAll('[id]')].find(el => el.id === id)?.scrollIntoView({ behavior: 'instant' });
      }
    }
    history.scrollRestoration = previous;
  });
  if (document.readyState === 'complete') restore();
  else life.listen(window, 'pageshow', restore, { once: true });
  return life.cleanup;
}
