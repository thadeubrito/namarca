'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { publishCampaign } from '@/lib/campaign-publication';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaignPublications } from '@/db/schema';
import { CampaignEditorError, requireUuid } from '@/lib/campaign-editor';

export type PublicationState = { error?: string; published?: boolean };
export async function publishWithoutPayment(id: string, _previous: PublicationState, form: FormData): Promise<PublicationState> {
  const session = await requireAdmin();
  try { requireUuid(id); } catch { return { error: 'Campanha inválida.' }; }
  const [existing] = await db.select({ id: campaignPublications.campaignId }).from(campaignPublications).where(eq(campaignPublications.campaignId, id));
  if (!existing && form.get('confirm') !== 'yes') return { error: 'Confirme a primeira publicação sem exigir pagamento.' };
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
