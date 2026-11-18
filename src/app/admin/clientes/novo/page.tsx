import { requireAdmin } from '@/lib/admin';
import { ClientForm } from '@/components/client-form';
export default async function NewClientPage() {
  await requireAdmin();
  return <div style={{ maxWidth: 760 }}><div className="page-heading"><div><h1>Novo cliente</h1></div></div><ClientForm /></div>;
}
