import { AdminNav } from '@/components/admin-nav';

/** Original implementation using the public Shadcn Studio header-13 as visual reference. */
export function Topbar() {
  return <header className="admin-header sticky top-0 z-40"><AdminNav /></header>;
}
