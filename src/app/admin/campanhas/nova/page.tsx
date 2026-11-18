import { requireAdmin } from '@/lib/admin';
import { CampaignForm } from './form';
import { db } from '@/db';
import { clients } from '@/db/schema';
import { asc } from 'drizzle-orm';
export default async function NewCampaign() {
  await requireAdmin();
  const clientOptions = await db.select({ id: clients.id, name: clients.name, contact: clients.contact }).from(clients).orderBy(asc(clients.name));
  return <div style={{ maxWidth: 760 }}><div className="page-heading"><div><h1>Nova campanha</h1></div></div><CampaignForm clients={clientOptions} /></div>;
}
