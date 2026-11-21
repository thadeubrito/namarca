import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';
import { ActionLink, PageIntro, Workspace } from '@/components/admin-workspace/primitives';
import { ClientContactForm } from '@/components/admin-workspace/client-contact-form';
import { ClientEntrance } from '@/components/admin-workspace/client-motion';

export default async function NewClientPage() {
  await requireAdmin();
  return <Workspace>
    <PageIntro eyebrow="Clientes / Cadastro" title="Novo cliente" description="Cadastre um contato reutilizável nas campanhas." action={<ActionLink href="/clientes" variant="ghost"><ArrowLeft className="size-4" aria-hidden="true" />Voltar para clientes</ActionLink>} />
    <ClientEntrance className="mx-auto w-full max-w-2xl"><ClientContactForm /></ClientEntrance>
  </Workspace>;
}
