'use server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { campaignInput } from '@/lib/campaign-input';
import { resolveCampaignClient } from '@/lib/campaign-client';
import type { CreateState } from '../nova/actions';

export async function updateCampaign(id: string, _previous: CreateState, form: FormData): Promise<CreateState> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { error: 'Campanha inválida.' };
  const input = campaignInput.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: input.error.issues[0].message };
  try {
    const outcome = await db.transaction(async tx => {
      const [current] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).for('update');
      if (!current) return 'missing';
      if (current.preparationStatus !== 'draft' || current.publicationStatus !== 'unpublished') return 'locked';
      const clientId = await resolveCampaignClient(tx, input.data);
      await tx.update(campaigns).set({ name: input.data.name, slug: input.data.slug, endsAt: new Date(`${input.data.endsAt}T23:59:59-03:00`), clientId, notes: input.data.notes, updatedAt: new Date() }).where(eq(campaigns.id, id));
      return { clientId };
    });
    if (outcome === 'missing') return { error: 'Campanha não encontrada.' };
    if (outcome === 'locked') return { error: 'Somente rascunhos não publicados podem ser editados nesta versão.' };
    revalidatePath('/admin'); revalidatePath(`/admin/campanhas/${id}`);
    return { saved: { token: randomUUID(), values: { name: input.data.name, slug: input.data.slug, endsAt: input.data.endsAt, clientId: outcome.clientId ?? '', clientName: '', clientContact: '', notes: input.data.notes ?? '' } } };
  } catch (error) {
    const code = error as { cause?: { code?: string }; code?: string };
    return { error: code.code === '23505' || code.cause?.code === '23505' ? 'Já existe uma campanha com esse endereço.' : 'Não foi possível salvar. Tente novamente.' };
  }
}
