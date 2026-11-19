import { AdminNav } from '@/components/admin-nav';

/** Unified administrative header: brand, navigation and session controls. */
export function Topbar() {
  return <header className="admin-header sticky top-0 z-40"><AdminNav /></header>;
}
