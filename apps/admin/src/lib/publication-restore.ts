import { and, eq } from 'drizzle-orm';
import { campaigns, campaignEditor, campaignAssets, campaignPublications, campaignPublicationHistory } from '@/db/schema';
import { assertEditable, CampaignEditorError, requireUuid, validateCampaignEvent, type EditorAsset } from './campaign-editor';
import type { EventConfig } from '@namarca/editor/events';

type RestoreCampaign = { name: string; slug: string; endsAt: Date; updatedAt: Date; preparationStatus: string; publicationStatus: string };
type RestorePublication = { version: number; config: EventConfig; deliveredAt: Date | null };

// Pure preparation shared by the locked writer and tests. The source is always
// a campaign-scoped DB publication, never a snapshot supplied by the form.
export function resolvePublishedRestore(campaign: RestoreCampaign, editor: { revision: number } | undefined, publication: RestorePublication | undefined, assets: readonly EditorAsset[], revision: number, expectedUpdatedAt: string, expectedVersion: number) {
  assertEditable(campaign);
  if (!publication?.deliveredAt) throw new CampaignEditorError(409, 'Conclua a publicação antes de descartar alterações.');
  if (!Number.isSafeInteger(revision) || revision < 1 || !editor || editor.revision !== revision || campaign.updatedAt.toISOString() !== expectedUpdatedAt || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || publication.version !== expectedVersion) {
    throw new CampaignEditorError(409, 'A campanha mudou. Recarregue antes de descartar alterações.');
  }
  if (editor.revision >= 2147483647) throw new CampaignEditorError(409, 'O limite de revisões foi atingido.');
  const snapshot = publication.config;
  if (snapshot.slug !== campaign.slug) throw new CampaignEditorError(409, 'O endereço publicado diverge da campanha.');
  const endsAt = new Date(snapshot.endsAt);
  if (!Number.isFinite(endsAt.getTime()) || !snapshot.name.trim()) throw new CampaignEditorError(422, 'Publicação inválida.');
  const identity = { name: snapshot.name, slug: campaign.slug, endsAt };
  const config = validateCampaignEvent({ ...snapshot,
    artworks: snapshot.artworks.map(item => ({ ...item, file: `${item.id}.png` })),
    stickers: snapshot.stickers.map(item => ({ ...item, file: `${item.id}.png` })),
  }, identity, assets);
  // No publicationEvent: a delivered campaign may have expired since publishing.
  return { ...identity, config, revision: editor.revision + 1 };
}

export async function restorePublishedDraft(id: string, revision: number, expectedUpdatedAt: string, expectedVersion: number, targetVersion = expectedVersion) {
  requireUuid(id);
  const { db } = await import('@/db');
  return db.transaction(async tx => {
    const [campaign] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).for('update');
    if (!campaign) throw new CampaignEditorError(404, 'Campanha não encontrada.');
    assertEditable(campaign);
    const [editor] = await tx.select().from(campaignEditor).where(eq(campaignEditor.campaignId, id)).for('update');
    const [publication] = await tx.select().from(campaignPublications).where(eq(campaignPublications.campaignId, id));
    if (!publication?.deliveredAt) throw new CampaignEditorError(409, 'Conclua a publicação antes de restaurar alterações.');
    if (!Number.isSafeInteger(expectedVersion) || publication.version !== expectedVersion) throw new CampaignEditorError(409, 'A publicação mudou. Recarregue antes de restaurar.');
    if (!Number.isSafeInteger(targetVersion) || targetVersion < 1) throw new CampaignEditorError(422, 'Versão publicada inválida.');
    const [historical] = await tx.select().from(campaignPublicationHistory).where(and(eq(campaignPublicationHistory.campaignId, id), eq(campaignPublicationHistory.version, targetVersion)));
    const target = targetVersion === publication.version ? publication : historical;
    if (!target) throw new CampaignEditorError(404, 'Versão publicada não encontrada.');
    const assets = await tx.select().from(campaignAssets).where(eq(campaignAssets.campaignId, id));
    const restored = resolvePublishedRestore(campaign, editor, target, assets, revision, expectedUpdatedAt, targetVersion);
    const updatedAt = new Date(Math.max(Date.now(), campaign.updatedAt.getTime() + 1, (editor?.updatedAt.getTime() ?? 0) + 1));
    await tx.update(campaigns).set({ name: restored.name, endsAt: restored.endsAt, updatedAt }).where(eq(campaigns.id, id));
    await tx.update(campaignEditor).set({ config: restored.config, revision: restored.revision, updatedAt }).where(eq(campaignEditor.campaignId, id));
    // Deliberately no storage, cleanup, publication or history writes.
    return { revision: restored.revision, updatedAt: updatedAt.toISOString() };
  });
}
