'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { publishCampaign, setCampaignSuspended } from '@/lib/campaign-publication';
import { restorePublishedDraft } from '@/lib/publication-restore';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaignPublications } from '@/db/schema';
import { CampaignEditorError, requireUuid } from '@/lib/campaign-editor';

export type DiscardState = { error?: string; restored?: boolean };
export async function discardUnpublishedChanges(id: string, _previous: DiscardState, form: FormData): Promise<DiscardState> {
  await requireAdmin();
  try { requireUuid(id); } catch { return { error: 'Campanha inválida.' }; }
  const single = (key: string) => { const values = form.getAll(key); return values.length === 1 && typeof values[0] === 'string' ? values[0] : undefined; };
  const confirm = single('confirm'), revision = single('revision'), version = single('version'), updatedAt = single('updatedAt');
  const integer = (value: string | undefined) => value !== undefined && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647;
  if (confirm !== 'yes') return { error: 'Confirme o descarte das alterações não publicadas.' };
  if (!integer(revision) || !integer(version) || !updatedAt || !Number.isFinite(Date.parse(updatedAt)) || new Date(updatedAt).toISOString() !== updatedAt) return { error: 'Recarregue a campanha antes de descartar alterações.' };
  try {
    await restorePublishedDraft(id, Number(revision), updatedAt, Number(version));
    revalidatePath('/');
    revalidatePath(`/campanhas/${id}`);
    return { restored: true };
  } catch (error) {
    revalidatePath(`/campanhas/${id}`);
    return { error: error instanceof CampaignEditorError ? error.message : 'Não foi possível descartar as alterações. Recarregue e tente novamente.' };
  }
}

export type AccessState = { error?: string; success?: string };
export async function changeCampaignAccess(id: string, _previous: AccessState, form: FormData): Promise<AccessState> {
  const session = await requireAdmin();
  try { requireUuid(id); } catch { return { error: 'Campanha inválida.' }; }
  const values = form.getAll('suspended');
  const timestamps = form.getAll('updatedAt');
  const suspended = values[0];
  const updatedAt = timestamps[0];
  if (values.length !== 1 || (suspended !== 'yes' && suspended !== 'no')) return { error: 'Escolha suspender ou reativar a campanha.' };
  if (timestamps.length !== 1 || typeof updatedAt !== 'string' || !Number.isFinite(Date.parse(updatedAt)) || new Date(updatedAt).toISOString() !== updatedAt) return { error: 'Recarregue os detalhes antes de alterar o acesso.' };
  try {
    await setCampaignSuspended(id, suspended === 'yes', session.user.id, updatedAt);
    revalidatePath('/');
    revalidatePath(`/campanhas/${id}`);
    return { success: suspended === 'yes' ? 'Campanha suspensa.' : 'Campanha reativada.' };
  } catch (error) {
    revalidatePath(`/campanhas/${id}`);
    return { error: error instanceof CampaignEditorError ? error.message : 'Não foi possível alterar o acesso. Recarregue e tente novamente explicitamente.' };
  }
}

export type PublicationState = { error?: string; published?: boolean };
export async function publishWithoutPayment(id: string, _previous: PublicationState, form: FormData): Promise<PublicationState> {
  const session = await requireAdmin();
  try { requireUuid(id); } catch { return { error: 'Campanha inválida.' }; }
  const [existing] = await db.select({ id: campaignPublications.campaignId }).from(campaignPublications).where(eq(campaignPublications.campaignId, id));
  if (!existing && form.get('confirm') !== 'yes') return { error: 'Confirme a publicação da campanha.' };
  const expectedUpdatedAt = form.get('updatedAt');
  if (typeof expectedUpdatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(expectedUpdatedAt)) return { error: 'Recarregue os detalhes antes de publicar.' };
  const revision = Number(form.get('revision'));
  if (!Number.isSafeInteger(revision) || revision < 1) return { error: 'Salve os materiais antes de publicar.' };
  try {
    await publishCampaign(id, revision, session.user.id, expectedUpdatedAt);
    revalidatePath('/');
    revalidatePath(`/campanhas/${id}`);
    return { published: true };
  } catch (error) {
    revalidatePath(`/campanhas/${id}`);
    return { error: error instanceof CampaignEditorError ? error.message : 'Não foi possível publicar. Confira os materiais e tente novamente.' };
  }
}
