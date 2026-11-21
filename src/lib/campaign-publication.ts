import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaigns, campaignEditor, campaignAssets, campaignPublications, campaignPublicationHistory } from '@/db/schema';
import { assertEditable, CampaignEditorError, requireUuid, validateCampaignEvent, validatePng } from './campaign-editor';
import { getPrivateObject, putPublicObject } from './storage';
import { publicationArtifacts } from './publication-artifacts';
import { parseEvent, type EventConfig } from '@namarca/editor/events';

export function publicationEvent(input: unknown, campaign: { name: string; slug: string; endsAt: Date }, assets: Parameters<typeof validateCampaignEvent>[2], now = new Date()): EventConfig {
  if (campaign.endsAt.getTime() <= now.getTime()) throw new CampaignEditorError(422, 'O encerramento precisa estar no futuro.');
  const event = validateCampaignEvent(input, campaign, assets);
  if (!event.artworks.length) throw new CampaignEditorError(422, 'Adicione e salve ao menos uma arte antes de publicar.');
  return parseEvent(event, campaign.slug);
}

// Every draft/publication/cleanup writer locks the campaign first. Delivery takes
// the same lock, preventing older manifests from overwriting newer deliveries.
export async function publishCampaign(id: string, revision: number, actor: string, expectedUpdatedAt?: string) {
  requireUuid(id);
  const frozen = await db.transaction(async tx => {
    const [campaign] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).for('update');
    if (!campaign) throw new CampaignEditorError(404, 'Campanha não encontrada.');
    if (!Number.isSafeInteger(revision) || revision < 1 || !actor.trim()) throw new CampaignEditorError(422, 'Publicação inválida.');
    assertEditable(campaign);
    const [existing] = await tx.select().from(campaignPublications).where(eq(campaignPublications.campaignId, id));
    // An incomplete delivery must finish its frozen version, not adopt new drafts.
    if (existing && !existing.deliveredAt) return existing;
    if (expectedUpdatedAt !== undefined && campaign.updatedAt.toISOString() !== expectedUpdatedAt) throw new CampaignEditorError(409, 'Os detalhes da campanha mudaram. Recarregue e confira antes de publicar.');
    if (['admin', 'api', 'checkout', 'events', 'event-runtime', 'login', 'seguranca', 'private'].includes(campaign.slug)) throw new CampaignEditorError(422, 'Escolha outro endereço para a campanha: este é reservado pelo aplicativo.');
    const [editor] = await tx.select().from(campaignEditor).where(eq(campaignEditor.campaignId, id)).for('update');
    if (!editor || editor.revision !== revision) throw new CampaignEditorError(409, 'O rascunho mudou. Recarregue e confira antes de publicar.');
    const assets = await tx.select().from(campaignAssets).where(eq(campaignAssets.campaignId, id));
    const config = publicationEvent(editor.config, campaign, assets);
    const artifacts = publicationArtifacts(config);
    if (existing) {
      const original = { ...existing.config, artworks: existing.config.artworks.map(item => ({ ...item, file: `${item.id}.png` })), stickers: existing.config.stickers.map(item => ({ ...item, file: `${item.id}.png` })) };
      if (publicationArtifacts(original).revision === artifacts.revision) return existing;
    }
    for (const material of [...config.artworks, ...config.stickers]) {
      const asset = assets.find(asset => asset.id === material.id);
      if (!asset || asset.key !== `private/campaigns/${id}/assets/${asset.id}.png`) throw new CampaignEditorError(422, 'Material inválido.');
      const object = await getPrivateObject(asset.key);
      if (!object.body) throw new CampaignEditorError(422, 'Um material salvo não está disponível.');
      const size = validatePng(Buffer.from(object.body));
      if (size.width !== asset.width || size.height !== asset.height) throw new CampaignEditorError(422, 'Dimensões do material divergentes.');
    }
    publicationEvent(config, campaign, assets);
    if (existing?.deliveredAt) await tx.insert(campaignPublicationHistory).values({ campaignId: id, version: existing.version, config: existing.config, editorRevision: existing.editorRevision, publishedBy: existing.publishedBy, deliveredAt: existing.deliveredAt, authorizedAt: existing.createdAt });
    const values = { version: (existing?.version ?? 0) + 1, config: artifacts.event, editorRevision: editor.revision, publishedBy: actor, deliveredAt: null, createdAt: new Date() };
    const [record] = await tx.insert(campaignPublications).values({ campaignId: id, ...values }).onConflictDoUpdate({ target: campaignPublications.campaignId, set: values }).returning();
    await tx.update(campaigns).set({ publicationStatus: 'published' }).where(eq(campaigns.id, id));
    return record;
  });
  return db.transaction(async tx => {
    await tx.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, id)).for('update');
    const [current] = await tx.select().from(campaignPublications).where(eq(campaignPublications.campaignId, id));
    if (!current || current.version !== frozen.version || current.createdAt.getTime() !== frozen.createdAt.getTime()) throw new CampaignEditorError(409, 'A publicação mudou. Recarregue antes de continuar.');
    if (current.deliveredAt) return current;
    // Pending legacy snapshots adopt numbered delivery only on this explicit retry.
    const original = { ...current.config, artworks: current.config.artworks.map(item => ({ ...item, file: `${item.id}.png` })), stickers: current.config.stickers.map(item => ({ ...item, file: `${item.id}.png` })) };
    const artifacts = publicationArtifacts(original, current.version);
    for (const material of [...original.artworks, ...original.stickers]) {
      const object = await getPrivateObject(`private/campaigns/${id}/assets/${material.id}.png`);
      if (!object.body) throw new CampaignEditorError(422, 'Material publicado indisponível.');
      validatePng(Buffer.from(object.body));
      await putPublicObject(artifacts.assetKey(material.id), object.body, 'image/png');
    }
    // S3 and DB are not atomic. A failed final PUT leaves the previous public JSON
    // intact and this pending snapshot can be retried without reading the draft.
    await putPublicObject(artifacts.versionKey, Buffer.from(JSON.stringify(artifacts.event)), 'application/json');
    await putPublicObject(artifacts.manifestKey, Buffer.from(JSON.stringify({ version: current.version })), 'application/json');
    const [delivered] = await tx.update(campaignPublications).set({ config: artifacts.event, deliveredAt: new Date() }).where(eq(campaignPublications.campaignId, id)).returning();
    return delivered;
  });
}
