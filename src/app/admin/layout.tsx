import { redirect } from 'next/navigation';
import { getAdminSession, getEnrollmentSession } from '@/lib/admin';
import { AdminLayout as AdminShellLayout } from '@/components/templates/free-dashboard/layouts';
import { ThemeScope } from '@/components/theme-scope';
export const dynamic = 'force-dynamic';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) {
    const enrollment = await getEnrollmentSession();
    redirect(enrollment ? '/seguranca' : '/login');
  }
  return <ThemeScope className="admin-shell"><AdminShellLayout>{children}</AdminShellLayout></ThemeScope>;
}
