'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { campaignInput } from '@/lib/campaign-input';
import { resolveCampaignClient } from '@/lib/campaign-client';
export type CreateState = { error?: string };
export async function createCampaign(_previous: CreateState, form: FormData): Promise<CreateState> {
  await requireAdmin();
  const input = campaignInput.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: input.error.issues[0].message };
  let id: string;
  try {
    id = await db.transaction(async tx => {
      const clientId = await resolveCampaignClient(tx, input.data);
      const [created] = await tx.insert(campaigns).values({ name: input.data.name, slug: input.data.slug, endsAt: new Date(`${input.data.endsAt}T23:59:59-03:00`), clientId, notes: input.data.notes }).returning({ id: campaigns.id });
      return created.id;
    });
  } catch (error) {
    const code = (error as { cause?: { code?: string }; code?: string });
    if (code.code === '23505' || code.cause?.code === '23505') return { error: 'Já existe uma campanha com esse endereço.' };
    return { error: 'Não foi possível salvar a campanha. Tente novamente.' };
  }
  revalidatePath('/admin'); redirect(`/admin/campanhas/${id}`);
}
