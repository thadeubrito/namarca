import { requireAdmin } from '@/lib/admin';
import { CampaignDataForm } from '@/components/admin-workspace/campaign-form';
import { Workspace, PageIntro, ActionLink } from '@/components/admin-workspace/primitives';
import { db } from '@/db';
import { clients } from '@/db/schema';
import { asc } from 'drizzle-orm';
export default async function NewCampaign() {
  await requireAdmin();
  const options = await db.select({ id: clients.id, name: clients.name, contact: clients.contact }).from(clients).orderBy(asc(clients.name));
  return <Workspace><PageIntro eyebrow="Campanhas / Novo evento" title="Nova campanha" description="Comece pelos dados do evento. As artes entram na próxima etapa." action={<ActionLink href="/" variant="ghost">Voltar às campanhas</ActionLink>} /><CampaignDataForm clients={options} /></Workspace>;
}
