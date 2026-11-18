import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession, getEnrollmentSession } from '@/lib/admin';
import { SignOut } from '@/components/sign-out';
export const dynamic = 'force-dynamic';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) {
    const enrollment = await getEnrollmentSession();
    redirect(enrollment ? '/seguranca' : '/login');
  }
  return <div className="admin-shell"><header className="topbar"><div className="shell"><Link href="/admin" className="wordmark" aria-label="Namarca, campanhas">namarca</Link><nav className="nav" aria-label="Principal"><Link href="/admin">Campanhas</Link><Link href="/admin/clientes">Clientes</Link><small>Administrativo</small><SignOut /></nav></div></header><main id="conteudo" className="shell content">{children}</main></div>;
}
