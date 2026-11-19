'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, FolderOpen, ShieldCheck, Users, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ThemeToggle, useDarkTheme } from '@/components/theme-scope';
import { SignOut } from '@/components/sign-out';

const navigation = [
  { href: '/admin', title: 'Campanhas', icon: FolderOpen },
  { href: '/admin/clientes', title: 'Clientes', icon: Users },
];

export function AdminNav() {
  const path = usePathname();
  const dark = useDarkTheme();
  const clients = path.startsWith('/admin/clientes');
  return <>
    <div className="admin-masthead">
      <div className="admin-header-inner">
        <Link href="/admin" className="admin-brand" aria-label="Namarca, campanhas"><span>namarca</span></Link>
        <div className="admin-tools">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" className="account-trigger" aria-label="Minha conta"><span className="admin-avatar"><UserRound aria-hidden /></span><span>Minha conta</span><ChevronDown aria-hidden className="size-3" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={10} className={`ui-scope account-menu ${dark ? 'dark' : ''}`}>
              <DropdownMenuLabel>Administração Namarca</DropdownMenuLabel>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Senha e segundo fator obrigatórios</DropdownMenuLabel>
              <DropdownMenuLabel><ShieldCheck className="mr-2 inline size-4" />Acesso protegido</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/seguranca">Segurança da conta</Link></DropdownMenuItem>
              <DropdownMenuSeparator /><SignOut />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
    <div className="admin-nav-row">
      <div className="admin-header-inner">
        <nav className="admin-links" aria-label="Principal">
          {navigation.map(({ href, title, icon: Icon }) => {
            const active = href === '/admin' ? !clients : clients;
            return <Link key={href} href={href} aria-current={active ? 'page' : undefined}><Icon className="size-4" aria-hidden /><span>{title}</span></Link>;
          })}
        </nav>
      </div>
    </div>
  </>;
}
