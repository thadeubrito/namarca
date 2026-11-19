'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EmptyState } from './primitives';

// Composition adapted from https://paceui.com/r/motion-empty.json.
// No viewport-triggered hiding: the empty state enters once and respects reduced motion.
export function ClientEmpty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  const reduced = useReducedMotion();
  return <motion.div initial={reduced ? false : { opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 280, damping: 24, duration: reduced ? 0 : undefined }} className="py-6">
    <EmptyState title={title} description={description} action={action} />
  </motion.div>;
}

export function ClientEntrance({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 0.22, ease: 'easeOut' }}>{children}</motion.div>;
}
