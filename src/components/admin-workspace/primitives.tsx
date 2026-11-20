'use client';

import { useId, useState, useSyncExternalStore, type ReactNode, type ComponentProps, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { motion, MotionConfig, useReducedMotion } from 'motion/react';
import { Inbox, FileText, Image, Smile, Palette, Wallet } from 'lucide-react';
import './workspace.css';

const subscribeWorkbench = (notify: () => void) => { const media = window.matchMedia('(min-width: 1101px)'); media.addEventListener('change', notify); return () => media.removeEventListener('change', notify); };
const getWorkbench = () => window.matchMedia('(min-width: 1101px)').matches;
const sectionIcons: Record<string, typeof Inbox> = { dados: FileText, artes: Image, stickers: Smile, cores: Palette, cobranca: Wallet };

/** Operational components with Revolut-inspired hierarchy and segmented navigation.
 * Persistent panels, server actions and reduced-motion behavior are preserved. */
export function Workspace({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <MotionConfig reducedMotion="user"><div className={`workspace ${className}`}>{children}</div></MotionConfig>;
}
export function Action({ children, variant = 'primary', className = '', ...props }: ComponentProps<'button'> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const reduced = useReducedMotion();
  return <motion.button {...props as ComponentProps<typeof motion.button>} type={props.type ?? 'button'} className={`ws-action ws-action-${variant} ${className}`} whileTap={reduced ? undefined : { scale: .97 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>{children}</motion.button>;
}
export function ActionLink({ children, variant = 'secondary', className = '', ...props }: ComponentProps<typeof Link> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <Link {...props} className={`ws-action ws-action-${variant} ${className}`}>{children}</Link>;
}
export function Surface({ className = '', ...props }: ComponentProps<'div'>) {
  return <div {...props} className={`ws-surface ${className}`} />;
}
export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return <label className="ws-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function TextInput({ className = '', ...props }: ComponentProps<'input'>) {
  return <input {...props} className={`ws-input ${className}`} />;
}
export function TextArea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea {...props} className={`ws-input ws-textarea ${className}`} />;
}
export function Notice({ children, tone = 'info', className = '', ...props }: ComponentProps<'div'> & { tone?: 'info' | 'error' | 'success' }) {
  const reduced = useReducedMotion();
  return <motion.div {...props as ComponentProps<typeof motion.div>} role={props.role ?? (tone === 'error' ? 'alert' : tone === 'success' ? 'status' : 'note')} initial={reduced ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className={`ws-notice ws-notice-${tone} ${className}`}>{children}</motion.div>;
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  const reduced = useReducedMotion();
  return <motion.div className="ws-empty" initial={reduced ? false : { opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 280, damping: 24 }}><span className="ws-empty-icon"><Inbox aria-hidden /></span><h2>{title}</h2><p>{description}</p>{action}</motion.div>;
}
export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="ws-intro"><div>{eyebrow && <p className="ws-kicker">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="ws-description">{description}</p>}</div>{action && <div className="ws-intro-action">{action}</div>}</header>;
}
export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' }) {
  return <span className={`ws-pill ws-pill-${tone}`}>{children}</span>;
}
/** Pace motion-tabs shared indicator, with content kept mounted even when inactive.
 * The registry's conditional child rendering would discard studio/form state. */
export function WorkspaceTabs({ label, items, initialId, activeId, onActiveChange, layout = 'horizontal' }: { layout?: 'horizontal' | 'workbench'; label: string; items: { id: string; label: string; content: ReactNode; lazy?: boolean; pending?: boolean; panelKey?: string }[]; initialId?: string; activeId?: string; onActiveChange?: (id: string) => void }) {
  const id = useId();
  const desktop = useSyncExternalStore(subscribeWorkbench, getWorkbench, () => false);
  const [localActive, setActive] = useState(initialId ?? items[0]?.id);
  const active = activeId ?? localActive;
  const panelKey = (item: typeof items[number]) => item.panelKey ?? item.id;
  const panels = items.filter((item, index) => items.findIndex(other => panelKey(other) === panelKey(item)) === index);
  const [visited, setVisited] = useState<string[]>([initialId ?? items[0]?.id]);
  function activate(next: string) {
    setVisited(current => current.includes(next) ? current : [...current, next]);
    setActive(next);
    onActiveChange?.(next);
  }
  const reduced = useReducedMotion();
  function keydown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const keys: Record<string, number> = { ArrowRight: (index + 1) % items.length, ArrowLeft: (index - 1 + items.length) % items.length, ArrowDown: (index + 1) % items.length, ArrowUp: (index - 1 + items.length) % items.length, Home: 0, End: items.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const next = items[keys[event.key]].id;
    activate(next);
    const tab = document.getElementById(`${id}-${next}-tab`);
    tab?.focus({ preventScroll: true });
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  return <div className={`ws-tabs ${layout === 'workbench' ? 'ws-tabs-workbench' : ''}`}><div className="ws-tabrail" role="tablist" aria-label={label} aria-orientation={layout === 'workbench' && desktop ? 'vertical' : 'horizontal'}>{items.map((item, index) => { const Icon = sectionIcons[item.id]; return <button type="button" role="tab" key={item.id} id={`${id}-${item.id}-tab`} aria-selected={active === item.id} aria-describedby={item.pending ? `${id}-${item.id}-pending` : undefined} aria-controls={`${id}-${panelKey(item)}-panel`} tabIndex={active === item.id ? 0 : -1} onClick={() => activate(item.id)} onKeyDown={e => keydown(e, index)}>{active === item.id && <motion.span aria-hidden layoutId={`${id}-indicator`} className="ws-tab-indicator" transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }} />}{Icon && <Icon aria-hidden className="ws-tab-icon" />}<span>{item.label}</span>{item.pending && <><span className="ws-tab-pending" aria-hidden="true">Não salvo</span><span id={`${id}-${item.id}-pending`} hidden>Alterações não salvas</span></>}</button>; })}</div>{panels.map(item => { const group = items.filter(other => panelKey(other) === panelKey(item)); const selected = group.find(other => other.id === active); return <div key={panelKey(item)} role="tabpanel" id={`${id}-${panelKey(item)}-panel`} aria-labelledby={`${id}-${selected?.id ?? item.id}-tab`} hidden={!selected} tabIndex={0} onInvalidCapture={() => flushSync(() => activate(item.id))}>{!item.lazy || group.some(other => visited.includes(other.id)) ? item.content : null}</div>; })}</div>;
}
