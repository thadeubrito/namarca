'use server';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { clients } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { clientInput } from '@/lib/client-input';
import { UUID } from '@/lib/campaign-editor';

export type ClientState = { error?: string };
export async function saveClient(id: string | null, _previous: ClientState, form: FormData): Promise<ClientState> {
  await requireAdmin();
  if (id !== null && !UUID.test(id)) return { error: 'Cliente não encontrado.' };
  const input = clientInput.safeParse({ name: form.get('name'), contact: form.get('contact') });
  if (!input.success) return { error: input.error.issues[0].message };
  let savedId: string;
  try {
    const [saved] = id === null
      ? await db.insert(clients).values(input.data).returning({ id: clients.id })
      : await db.update(clients).set(input.data).where(eq(clients.id, id)).returning({ id: clients.id });
    if (!saved) return { error: 'Cliente não encontrado.' };
    savedId = saved.id;
  } catch { return { error: 'Não foi possível salvar o cliente. Tente novamente.' }; }
  revalidatePath('/', 'layout');
  redirect(`/clientes/${savedId}?salvo=1`);
}
