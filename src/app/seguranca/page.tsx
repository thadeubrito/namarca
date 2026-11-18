import { redirect } from 'next/navigation';
import { AuthPanel } from '@/components/auth-panel';
import { getEnrollmentSession, getAdminSession } from '@/lib/admin';
export const dynamic = 'force-dynamic';
export default async function Security() {
  if (await getAdminSession()) redirect('/admin');
  if (!await getEnrollmentSession()) redirect('/login');
  return <AuthPanel mode="setup" />;
}
