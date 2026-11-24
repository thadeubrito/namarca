/* Every effect owns its listeners, observers, scheduled work and animations. */
export function createLifecycle() {
  let disposed = false;
  const cleanups = [];
  const frames = new Set();
  const timers = new Set();
  const guard = callback => (...args) => { if (!disposed) return callback(...args); };
  const listen = (target, type, callback, options) => {
    if (!target) return;
    const handler = guard(callback);
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };
  const requestFrame = callback => {
    if (disposed) return 0;
    const id = window.requestAnimationFrame(time => { frames.delete(id); if (!disposed) callback(time); });
    frames.add(id);
    return id;
  };
  const cancelFrame = id => { frames.delete(id); window.cancelAnimationFrame(id); };
  const timeout = (callback, delay) => {
    if (disposed) return 0;
    const id = window.setTimeout(() => { timers.delete(id); if (!disposed) callback(); }, delay);
    timers.add(id);
    return id;
  };
  const clearTimer = id => { timers.delete(id); window.clearTimeout(id); };
  const observe = observer => { cleanups.push(() => observer.disconnect()); return observer; };
  const cleanup = () => {
    disposed = true;
    cleanups.splice(0).reverse().forEach(fn => fn());
    frames.forEach(id => window.cancelAnimationFrame(id)); frames.clear();
    timers.forEach(id => window.clearTimeout(id)); timers.clear();
  };
  return { guard, listen, requestFrame, cancelFrame, timeout, clearTimer, observe, cleanup, onCleanup: fn => cleanups.push(fn), isDisposed: () => disposed };
}

/* Restore original React-owned nodes/attributes, rather than replacing them
   with cloned HTML. This also makes the development StrictMode replay exact. */
export function captureDOM(scope) {
  const entries = [scope, ...scope.querySelectorAll('*')].map(node => ({
    node, attributes: [...node.attributes].map(a => [a.name, a.value]),
  }));
  return () => entries.forEach(({ node, attributes }) => {
    node.getAnimations?.().forEach(animation => animation.cancel());
    [...node.attributes].forEach(attribute => node.removeAttribute(attribute.name));
    attributes.forEach(([name, value]) => node.setAttribute(name, value));
  });
}
