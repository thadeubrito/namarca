import { asc, count, eq, ilike, or } from 'drizzle-orm';
import { ClientCreateDialog } from '@/components/admin-workspace/client-create-dialog';
import { db } from '@/db';
import { campaigns, clients } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { clientSearchPattern } from '@/lib/client-input';
import { PageIntro, Workspace } from '@/components/admin-workspace/primitives';
import { ClientDirectory } from '@/components/admin-workspace/client-directory';

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 254) : '';
  const rows = await db.select({ id: clients.id, name: clients.name, contact: clients.contact, campaignCount: count(campaigns.id) })
    .from(clients).leftJoin(campaigns, eq(campaigns.clientId, clients.id))
    .where(q ? or(ilike(clients.name, clientSearchPattern(q)), ilike(clients.contact, clientSearchPattern(q))) : undefined)
    .groupBy(clients.id).orderBy(asc(clients.name), asc(clients.id));

  return <Workspace>
    <PageIntro eyebrow="Contatos" title="Clientes" description="Encontre um contato e acompanhe suas campanhas." action={<ClientCreateDialog />} />
    <ClientDirectory rows={rows} query={q} />
  </Workspace>;
}
