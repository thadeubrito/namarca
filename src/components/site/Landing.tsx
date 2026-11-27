"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { trackPublicEvent } from '@/lib/public-analytics';
import { initializePerspective } from "./perspective";
import { initializeLima } from "./lima";
import { initializeReloadPosition } from "./reload-position";

/** React owns the permanent DOM; the effect owns only its progressive enhancement. */
export function Landing({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    trackPublicEvent('landing_viewed');
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[data-analytics-event]');
      if (!link || !root.contains(link)) return;
      const name = link.dataset.analyticsEvent;
      if (name === 'contact_clicked' || name === 'example_clicked') trackPublicEvent(name);
    };
    root.addEventListener('click', onClick);
    const cleanups: Array<() => void> = [() => root.removeEventListener('click', onClick)];
    try {
      cleanups.push(initializeReloadPosition(root));
      cleanups.push(initializeLima(root));
      const scene = root.querySelector<HTMLElement>("[data-perspective]");
      if (scene) cleanups.push(initializePerspective(scene));
    } catch (error) {
      // A failed enhancement must not leave hidden content or partial listeners.
      cleanups.reverse().forEach(cleanup => cleanup());
      throw error;
    }
    return () => { cleanups.reverse().forEach(cleanup => cleanup()); };
  }, []);
  return <div className="landing" ref={scope}>{children}</div>;
}
