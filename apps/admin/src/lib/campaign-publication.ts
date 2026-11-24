import { and, eq, max } from 'drizzle-orm';
import { db } from '@/db';
import { campaigns, campaignEditor, campaignAssets, campaignPublications, campaignPublicationHistory } from '@/db/schema';
import { assertEditable, CampaignEditorError, requireUuid, validateCampaignConfig, validatePng } from './campaign-editor';
import { getPrivateObject, putPublicObject, publicObjectExists } from './storage';
import { deliverPublicationAccess } from './publication-access-delivery';
import { publicationArtifacts } from './publication-artifacts';
import { publicationPointer, validatePublicationAccess } from './publication-access';
import { parseCampaign, type CampaignConfig } from '@namarca/editor/campaigns';

export function publicationCampaign(input: unknown, campaign: { name: string; slug: string; endsAt: Date }, assets: Parameters<typeof validateCampaignConfig>[2], now = new Date()): CampaignConfig {
  if (campaign.endsAt.getTime() <= now.getTime()) throw new CampaignEditorError(422, 'O encerramento precisa estar no futuro.');
  const event = validateCampaignConfig(input, campaign, assets);
  if (!event.artworks.length) throw new CampaignEditorError(422, 'Adicione e salve ao menos uma arte antes de publicar.');
  return parseCampaign(event, campaign.slug);
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
    if (['admin', 'api', 'checkout', 'campaigns', 'campaign-runtime', 'login', 'seguranca', 'private'].includes(campaign.slug)) throw new CampaignEditorError(422, 'Escolha outro endereço para a campanha: este é reservado pelo aplicativo.');
    const [editor] = await tx.select().from(campaignEditor).where(eq(campaignEditor.campaignId, id)).for('update');
    if (!editor || editor.revision !== revision) throw new CampaignEditorError(409, 'O rascunho mudou. Recarregue e confira antes de publicar.');
    const assets = await tx.select().from(campaignAssets).where(eq(campaignAssets.campaignId, id));
    const config = publicationCampaign(editor.config, campaign, assets);
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
    publicationCampaign(config, campaign, assets);
    const [history] = await tx.select({ version: max(campaignPublicationHistory.version) }).from(campaignPublicationHistory).where(eq(campaignPublicationHistory.campaignId, id));
    const version = Math.max(existing?.version ?? 0, history?.version ?? 0) + 1;
    if (version > 2147483647) throw new CampaignEditorError(409, 'O limite de versões foi atingido.');
    if (existing?.deliveredAt) await tx.insert(campaignPublicationHistory).values({ campaignId: id, version: existing.version, config: existing.config, editorRevision: existing.editorRevision, publishedBy: existing.publishedBy, deliveredAt: existing.deliveredAt, authorizedAt: existing.createdAt }).onConflictDoNothing();
    const values = { version, config: artifacts.event, editorRevision: editor.revision, publishedBy: actor, deliveredAt: null, createdAt: new Date() };
    const [record] = await tx.insert(campaignPublications).values({ campaignId: id, ...values }).onConflictDoUpdate({ target: campaignPublications.campaignId, set: values }).returning();
    await tx.update(campaigns).set({ publicationStatus: 'published' }).where(eq(campaigns.id, id));
    return record;
  });
  return db.transaction(async tx => {
    const [campaign] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).for('update');
    if (!campaign) throw new CampaignEditorError(404, 'Campanha não encontrada.');
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
    await putPublicObject(artifacts.manifestKey, Buffer.from(JSON.stringify(publicationPointer(current.version, campaign.suspendedAt !== null))), 'application/json');
    const [delivered] = await tx.update(campaignPublications).set({ config: artifacts.event, deliveredAt: new Date() }).where(eq(campaignPublications.campaignId, id)).returning();
    return delivered;
  });
}

/** Repositions public access only; the original authorization and authorship survive.
 * S3 precedes the DB swap, not a distributed transaction: a failed PUT leaves DB
 * unchanged; a successful PUT followed by a failed commit can leave the pointer
 * ahead of DB. Explicit retry with the unchanged expectations repairs that state.
 */
export async function publishHistoricalVersion(id: string, revision: number, actor: string, expectedUpdatedAt: string, expectedVersion: number, targetVersion: number) {
  requireUuid(id);
  return db.transaction(async tx => {
    const [campaign] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).for('update');
    if (!campaign) throw new CampaignEditorError(404, 'Campanha não encontrada.');
    assertEditable(campaign);
    if (typeof actor !== 'string' || !actor.trim() || !Number.isSafeInteger(targetVersion) || targetVersion < 1) throw new CampaignEditorError(422, 'Publicação inválida.');
    const [current] = await tx.select().from(campaignPublications).where(eq(campaignPublications.campaignId, id));
    const [editor] = await tx.select().from(campaignEditor).where(eq(campaignEditor.campaignId, id)).for('update');
    if (!current?.deliveredAt) throw new CampaignEditorError(409, 'Conclua a publicação pendente antes de publicar uma versão histórica.');
    if (campaign.updatedAt.toISOString() !== expectedUpdatedAt || !Number.isSafeInteger(expectedVersion) || current.version !== expectedVersion || !Number.isSafeInteger(revision) || revision < 1 || editor?.revision !== revision) throw new CampaignEditorError(409, 'A campanha mudou. Recarregue antes de publicar.');
    const [historical] = await tx.select().from(campaignPublicationHistory).where(and(eq(campaignPublicationHistory.campaignId, id), eq(campaignPublicationHistory.version, targetVersion)));
    const target = targetVersion === current.version ? current : historical && { ...historical, createdAt: historical.authorizedAt };
    if (!target) throw new CampaignEditorError(404, 'Versão publicada não encontrada.');
    if (target.config.slug !== campaign.slug) throw new CampaignEditorError(409, 'O endereço publicado diverge da campanha.');
    const assets = await tx.select().from(campaignAssets).where(eq(campaignAssets.campaignId, id));
    // Validate ownership/references without adopting private identity or rewriting
    // frozen legacy paths. Expiry is checked even while access is suspended.
    publicationCampaign({ ...target.config,
      artworks: target.config.artworks.map(item => ({ ...item, file: `${item.id}.png` })),
      stickers: target.config.stickers.map(item => ({ ...item, file: `${item.id}.png` })),
    }, { name: target.config.name, slug: campaign.slug, endsAt: new Date(target.config.endsAt) }, assets);
    await deliverPublicationAccess(target, campaign.suspendedAt !== null, { exists: publicObjectExists, put: putPublicObject });
    if (target.version !== current.version) {
      const [latestDelivery] = await tx.select({ deliveredAt: max(campaignPublicationHistory.deliveredAt) }).from(campaignPublicationHistory).where(eq(campaignPublicationHistory.campaignId, id));
      const deliveredAt = new Date(Math.max(Date.now(), current.deliveredAt.getTime() + 1, (latestDelivery?.deliveredAt?.getTime() ?? 0) + 1));
      // deliveredAt is the latest effective delivery, not the first delivery.
      // On the next publication this timestamp follows the snapshot into history,
      // letting pending readers recover the actually previous public version by
      // deliveredAt DESC even after rollback. History is a snapshot set, not an
      // append-only audit log of switches; publishedBy remains original authorship.
      await tx.insert(campaignPublicationHistory).values({ campaignId: id, version: current.version, config: current.config, editorRevision: current.editorRevision, publishedBy: current.publishedBy, deliveredAt: current.deliveredAt, authorizedAt: current.createdAt }).onConflictDoNothing();
      await tx.delete(campaignPublicationHistory).where(and(eq(campaignPublicationHistory.campaignId, id), eq(campaignPublicationHistory.version, target.version)));
      await tx.update(campaignPublications).set({ version: target.version, config: target.config, editorRevision: target.editorRevision, publishedBy: target.publishedBy, createdAt: target.createdAt, deliveredAt }).where(eq(campaignPublications.campaignId, id));
    }
    const updatedAt = new Date(Math.max(Date.now(), campaign.updatedAt.getTime() + 1));
    await tx.update(campaigns).set({ updatedAt }).where(eq(campaigns.id, id));
    const [publication] = await tx.select().from(campaignPublications).where(eq(campaignPublications.campaignId, id));
    return publication;
  });
}

export async function setCampaignSuspended(id: string, suspended: boolean, actor: string, expectedUpdatedAt: string) {
  requireUuid(id);
  return db.transaction(async tx => {
    const [campaign] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).for('update');
    if (!campaign) throw new CampaignEditorError(404, 'Campanha não encontrada.');
    const [publication] = await tx.select().from(campaignPublications).where(eq(campaignPublications.campaignId, id));
    validatePublicationAccess(campaign, publication, suspended, actor, expectedUpdatedAt);
    // Storage first, DB second: failed PUT/commit retains the prior DB state.
    // An explicit retry rewrites the same pointer, repairing a lost DB commit.
    // Never skip the PUT even when the requested state already matches the DB.
    await deliverPublicationAccess(publication, suspended, { exists: publicObjectExists, put: putPublicObject });
    const now = new Date(Math.max(Date.now(), campaign.updatedAt.getTime() + 1));
    const [updated] = await tx.update(campaigns).set({
      suspendedAt: suspended ? campaign.suspendedAt ?? now : null,
      suspendedBy: actor,
      updatedAt: now,
    }).where(eq(campaigns.id, id)).returning();
    return updated;
  });
}
