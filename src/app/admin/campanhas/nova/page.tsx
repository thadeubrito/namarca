import { requireAdmin } from '@/lib/admin';
import { CampaignForm } from './form';
import { db } from '@/db';
import { clients } from '@/db/schema';
import { asc } from 'drizzle-orm';
export default async function NewCampaign() {
  await requireAdmin();
  const clientOptions = await db.select({ id: clients.id, name: clients.name, contact: clients.contact }).from(clients).orderBy(asc(clients.name));
  return <div style={{ maxWidth: 760 }}><div className="page-heading"><div><p className="eyebrow">Campanhas / Nova campanha</p><h1>Cadastre o evento</h1><p>Comece com os dados da ativação. Ela será salva como rascunho.</p></div></div><CampaignForm clients={clientOptions} /></div>;
}
