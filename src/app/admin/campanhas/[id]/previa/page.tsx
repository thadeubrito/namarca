import { requireAdmin } from '@/lib/admin';
import { redirect, notFound } from 'next/navigation';
import { UUID } from '@/lib/campaign-editor';

export const dynamic = 'force-dynamic';
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  redirect(`/event-runtime/preview.html?campaignId=${id}`);
}
