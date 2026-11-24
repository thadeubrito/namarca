"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { initializePerspective } from "./perspective";
import { initializeLima } from "./lima";
import { initializeReloadPosition } from "./reload-position";

/** React owns the permanent DOM; the effect owns only its progressive enhancement. */
export function Landing({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];
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
