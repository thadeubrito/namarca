'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const key = 'namarca-admin-theme';
const event = 'namarca-theme-change';
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(event, callback);
  return () => { window.removeEventListener('storage', callback); window.removeEventListener(event, callback); };
}
function snapshot() { try { return localStorage.getItem(key) === 'dark'; } catch { return false; } }

export function useDarkTheme() { return useSyncExternalStore(subscribe, snapshot, () => false); }

export function ThemeScope({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  return <div className={`ui-scope ${dark ? 'dark' : ''} ${className}`}>{children}</div>;
}

export function ThemeToggle() {
  const ready = useSyncExternalStore(subscribeHydration, clientReady, serverReady);
  const dark = useSyncExternalStore(subscribe, snapshot, () => false);
  function toggle() {
    try { localStorage.setItem(key, dark ? 'light' : 'dark'); } catch { /* Preference storage may be disabled. */ }
    window.dispatchEvent(new Event(event));
  }
  return <Button variant="ghost" size="icon" type="button" disabled={!ready} onClick={toggle} aria-label={dark ? 'Ativar tema claro' : 'Ativar tema escuro'} title={dark ? 'Ativar tema claro' : 'Ativar tema escuro'}>{dark ? <Sun /> : <Moon />}</Button>;
}
