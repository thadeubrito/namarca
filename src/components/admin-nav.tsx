'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderOpen, Users } from 'lucide-react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { ThemeToggle } from '@/components/theme-scope';
import { SignOut } from '@/components/sign-out';

const navigation = [
  { href: '/admin', title: 'Campanhas', icon: FolderOpen },
  { href: '/admin/clientes', title: 'Clientes', icon: Users },
];

export function AdminNav() {
  const path = usePathname();
  const reduced = useReducedMotion();
  const clients = path.startsWith('/admin/clientes');
  return <div className="admin-header-inner">
    <Link href="/admin" className="admin-brand" aria-label="Namarca, campanhas"><span>namarca</span></Link>
    <LayoutGroup id="admin-navigation">
      <nav className="admin-links" aria-label="Principal">
        {navigation.map(({ href, title, icon: Icon }) => {
          const active = href === '/admin' ? !clients : clients;
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
            <Icon className="size-4" aria-hidden /><span>{title}</span>
            {active && <motion.span className="admin-nav-indicator" aria-hidden layoutId="active-link" transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 }} />}
          </Link>;
        })}
      </nav>
    </LayoutGroup>
    <div className="admin-tools">
      <ThemeToggle />
      <SignOut />
    </div>
  </div>;
}
