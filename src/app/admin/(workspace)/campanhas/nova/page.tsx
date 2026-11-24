import { requireAdmin } from '@/lib/admin';
import { CampaignCreateForm } from '@/components/admin-workspace/campaign-create-form';
import { Workspace, PageIntro, ActionLink } from '@/components/admin-workspace/primitives';

export default async function NewCampaign() {
  await requireAdmin();
  return <Workspace><PageIntro eyebrow="Campanhas / Novo evento" title="Nova campanha" description="Comece pelos dados do evento. As artes entram na próxima etapa." action={<ActionLink href="/" variant="ghost">Voltar às campanhas</ActionLink>} /><CampaignCreateForm cancel={<ActionLink href="/" variant="ghost">Cancelar</ActionLink>} /></Workspace>;
}
