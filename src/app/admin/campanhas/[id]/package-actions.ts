'use server';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { campaigns, campaignEditor, campaignAssets, campaignPackages } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { requireUuid, assertEditable, validatePng } from '@/lib/campaign-editor';
import { packageApprovalInput, packageIdentity, packageMatches, validatePackage } from '@/lib/campaign-package';
import { getPrivateObject } from '@/lib/storage';

export type PackageState = { error?: string; success?: string };
export async function approvePackage(id: string, _state: PackageState, form: FormData): Promise<PackageState> {
  const session = await requireAdmin();
  // Select domain fields explicitly: React Server Actions add $ACTION_* metadata.
  const parsed = packageApprovalInput.safeParse(Object.fromEntries(['revision', 'identity', 'approvedBy', 'channel', 'approvedAt', 'rights'].map(key => [key, form.get(key)])));
  if (!parsed.success) return { error: 'Confira o responsável, canal, data e autorização de uso dos materiais.' };
  const input = parsed.data;
  const approvedAt = new Date(`${input.approvedAt}T12:00:00-03:00`);
  if (!Number.isFinite(approvedAt.getTime()) || approvedAt.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) !== input.approvedAt || input.approvedAt > new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })) return { error: 'Informe uma data válida, não futura.' };
  try {
    requireUuid(id);
    await db.transaction(async tx => {
      const [campaign] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).for('update');
      if (!campaign) throw new Error('Campanha não encontrada.');
      assertEditable(campaign);
      const [editor] = await tx.select().from(campaignEditor).where(eq(campaignEditor.campaignId, id)).for('update');
      if (!editor || editor.revision !== input.revision || packageIdentity(campaign) !== input.identity) throw new Error('O pacote mudou. Recarregue a página e revise antes de aprovar.');
      const assets = await tx.select().from(campaignAssets).where(eq(campaignAssets.campaignId, id));
      const event = validatePackage(editor.config, campaign, assets);
      const [latest] = await tx.select().from(campaignPackages).where(eq(campaignPackages.campaignId, id)).orderBy(desc(campaignPackages.version)).limit(1);
      if (latest && packageMatches(latest.config, event)) throw new Error('Este pacote já tem aprovação registrada.');
      const used = new Set([...event.artworks, ...event.stickers].map(a => a.id.toLowerCase()));
      // Inspect only campaign-owned immutable objects; never accept storage keys from the form.
      const referencedAssets = assets.filter(a => used.has(a.id.toLowerCase()));
      if (referencedAssets.length !== used.size) throw new Error('Material indisponível.');
      for (const asset of referencedAssets) {
        const object = await getPrivateObject(asset.key);
        if (!object.body || object.contentType !== 'image/png') throw new Error('Material indisponível.');
        const dimensions = validatePng(Buffer.from(object.body));
        if (dimensions.width !== asset.width || dimensions.height !== asset.height) throw new Error('Dimensões divergentes.');
      }
      await tx.insert(campaignPackages).values({ campaignId: id, version: (latest?.version ?? 0) + 1, editorRevision: editor.revision, config: event, approvedBy: input.approvedBy, channel: input.channel, approvedAt, recordedBy: session.user.id });
      // Keep the editable draft separate; an approval never publishes or freezes the ongoing draft.
    });
  } catch (error) {
    const safe = ['Campanha não encontrada.', 'O pacote mudou. Recarregue a página e revise antes de aprovar.', 'Este pacote já tem aprovação registrada.', 'A campanha precisa ter encerramento futuro.', 'Salve ao menos uma arte antes de registrar a aprovação.', 'O pacote aprovado não pode estar em modo de demonstração.'];
    return { error: error instanceof Error && safe.includes(error.message) ? error.message : 'Não foi possível aprovar. Confira os materiais salvos e tente novamente.' };
  }
  revalidatePath(`/admin/campanhas/${id}`);
  return { success: 'Aprovação registrada. A versão do pacote foi preservada, sem publicar a campanha.' };
}
