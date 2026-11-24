'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
// No viewport-triggered hiding: the empty state enters once and respects reduced motion.
export function ClientEmpty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  const reduced = useReducedMotion();
  return <motion.div initial={reduced ? false : { opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 280, damping: 24, duration: reduced ? 0 : undefined }} className="ws-client-empty">
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </motion.div>;
}

export function ClientEntrance({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.22, ease: 'easeOut' }}>{children}</motion.div>;
}
