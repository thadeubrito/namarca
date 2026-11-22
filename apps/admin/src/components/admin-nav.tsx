'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderOpen, Users, Wallet } from 'lucide-react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { ThemeToggle } from '@/components/theme-scope';
import { SignOut } from '@/components/sign-out';
import { Brand } from '@/components/brand';

const navigation = [
  { href: '/', title: 'Campanhas', icon: FolderOpen },
  { href: '/clientes', title: 'Clientes', icon: Users },
  { href: '/financeiro', title: 'Financeiro', icon: Wallet },
];

export function AdminNav() {
  const path = usePathname();
  const reduced = useReducedMotion();
  const section = path.startsWith('/clientes') ? '/clientes' : path.startsWith('/financeiro') ? '/financeiro' : '/';
  return <div className="admin-header-inner">
    <Brand href="/" className="admin-brand" label="Namarca, campanhas" />
    <LayoutGroup id="admin-navigation">
      <nav className="admin-links" aria-label="Principal">
        {navigation.map(({ href, title, icon: Icon }) => {
          const active = href === section;
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
