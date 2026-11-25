import type { Metadata } from 'next';
import { AuthPanel } from '@/components/auth-panel';
import { bootstrapAvailable } from '@/lib/admin-bootstrap';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Primeiro acesso', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function FirstAccess() { return <AuthPanel mode="bootstrap" bootstrapUnavailable={!await bootstrapAvailable()} />; }
