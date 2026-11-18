import { requireAdmin } from '@/lib/admin';
import { ClientForm } from '@/components/client-form';
export default async function NewClientPage() {
  await requireAdmin();
  return <div style={{ maxWidth: 760 }}><div className="page-heading"><div><p className="eyebrow">Clientes / Novo cliente</p><h1>Cadastrar cliente</h1><p>Somente nome e contato. O cliente não recebe uma conta de acesso.</p></div></div><ClientForm /></div>;
}
