import { and, eq, max } from 'drizzle-orm';
import { db } from '@/db';
import { campaigns, campaignEditor, campaignAssets, campaignPublications, campaignPublicationHistory } from '@/db/schema';
import { assertEditable, CampaignEditorError, requireUuid, validateCampaignConfig, MAX_UPLOAD_BYTES } from './campaign-editor';
import { headPrivateObject } from './storage';
import { publicationArtifacts } from './publication-artifacts';
import { validatePublicationAccess } from './publication-access';
import { parseCampaign, type CampaignConfig } from '@/lib/campaigns/campaigns';

export function publicationCampaign(input: unknown, campaign: { name: string; slug: string; endsAt: Date }, assets: Parameters<typeof validateCampaignConfig>[2], now = new Date()): CampaignConfig {
  if (campaign.endsAt.getTime() <= now.getTime()) throw new CampaignEditorError(422, 'O encerramento precisa estar no futuro.');
  const event = validateCampaignConfig(input, campaign, assets);
  if (!event.artworks.length) throw new CampaignEditorError(422, 'Adicione e salve ao menos uma arte antes de publicar.');
  return parseCampaign(event, campaign.slug);
}

function privateConfig(config: CampaignConfig): CampaignConfig {
  return { ...config,
    artworks: config.artworks.map(item => ({ ...item, file: `${item.id}.png` })),
    stickers: config.stickers.map(item => ({ ...item, file: `${item.id}.png` })),
  };
}

/** Validated uploads are already immutable definitive objects. Publication only
 * verifies availability and stores references; it never copies or writes PNGs.
 * The DB commit remains the switch for the campaign, not secrecy of material URLs.
 */
async function prepareImages(id: string, config: CampaignConfig, assets: (typeof campaignAssets.$inferSelect)[]) {
  const artifacts = publicationArtifacts(config);
  for (const material of [...config.artworks, ...config.stickers]) {
    const asset = assets.find(asset => asset.id === material.id);
    if (!asset || asset.key !== `private/campaigns/${id}/assets/${asset.id}.png`) throw new CampaignEditorError(422, 'Material inválido.');
    const object = await headPrivateObject(asset.key);
    if (object.contentType !== 'image/png' || !object.byteLength || object.byteLength > MAX_UPLOAD_BYTES) throw new CampaignEditorError(422, 'Um material salvo não está disponível ou é inválido.');
  }
  return artifacts.event;
}

// All writers lock campaign -> editor. Storage availability checks happen before any
// publication write, under the same transaction: readers retain the old snapshot.
export async function publishCampaign(id: string, revision: number, actor: string, expectedUpdatedAt?: string) {
  requireUuid(id);
  return db.transaction(async tx => {
    const [campaign] = await tx.select().from(campaigns).where(eq(campaigns.id, id)).for('update');
    if (!campaign) throw new CampaignEditorError(404, 'Campanha não encontrada.');
    if (!Number.isSafeInteger(revision) || revision < 1 || typeof actor !== 'string' || !actor.trim()) throw new CampaignEditorError(422, 'Publicação inválida.');
    assertEditable(campaign);
    const [existing] = await tx.select().from(campaignPublications).where(eq(campaignPublications.campaignId, id));
    const [editor] = await tx.select().from(campaignEditor).where(eq(campaignEditor.campaignId, id)).for('update');
    const assets = await tx.select().from(campaignAssets).where(eq(campaignAssets.campaignId, id));
    // Explicit legacy retry finalizes the authorized frozen snapshot, not today's
    // draft/identity/revision. In particular it does not restart its access period.
    if (existing && !existing.deliveredAt) {
      if (existing.config.slug !== campaign.slug) throw new CampaignEditorError(409, 'O endereço publicado diverge da campanha.');
      const frozen = validateCampaignConfig(privateConfig(existing.config), { name: existing.config.name, slug: campaign.slug, endsAt: new Date(existing.config.endsAt) }, assets);
      const config = await prepareImages(id, frozen, assets);
      const [record] = await tx.update(campaignPublications).set({ config, deliveredAt: new Date() }).where(eq(campaignPublications.campaignId, id)).returning();
      await tx.update(campaigns).set({ publicationStatus: 'published' }).where(eq(campaigns.id, id));
      return record;
    }
    if (expectedUpdatedAt !== undefined && campaign.updatedAt.toISOString() !== expectedUpdatedAt) throw new CampaignEditorError(409, 'Os detalhes da campanha mudaram. Recarregue e confira antes de publicar.');
    if (['admin', 'api', 'checkout', 'campaigns', 'campaign-runtime', 'login', 'seguranca', 'private'].includes(campaign.slug)) throw new CampaignEditorError(422, 'Escolha outro endereço para a campanha: este é reservado pelo aplicativo.');
    if (!editor || editor.revision !== revision) throw new CampaignEditorError(409, 'O rascunho mudou. Recarregue e confira antes de publicar.');
    const config = publicationCampaign(editor.config, campaign, assets);
    const artifacts = publicationArtifacts(config);
    if (existing && publicationArtifacts(privateConfig(existing.config)).revision === artifacts.revision) return existing;
    const [history] = await tx.select({ version: max(campaignPublicationHistory.version), deliveredAt: max(campaignPublicationHistory.deliveredAt) }).from(campaignPublicationHistory).where(eq(campaignPublicationHistory.campaignId, id));
    const version = Math.max(existing?.version ?? 0, history?.version ?? 0) + 1;
    if (version > 2147483647) throw new CampaignEditorError(409, 'O limite de versões foi atingido.');
    const prepared = await prepareImages(id, config, assets);
    // Recheck expiry after potentially slow storage I/O, still before DB writes.
    publicationCampaign(config, campaign, assets);
    if (existing?.deliveredAt) await tx.insert(campaignPublicationHistory).values({ campaignId: id, version: existing.version, config: existing.config, editorRevision: existing.editorRevision, publishedBy: existing.publishedBy, deliveredAt: existing.deliveredAt, authorizedAt: existing.createdAt }).onConflictDoNothing();
    const now = new Date(Math.max(Date.now(), (existing?.deliveredAt?.getTime() ?? 0) + 1, (history?.deliveredAt?.getTime() ?? 0) + 1));
    const values = { version, config: prepared, editorRevision: editor.revision, publishedBy: actor, deliveredAt: now, createdAt: now };
    const [record] = await tx.insert(campaignPublications).values({ campaignId: id, ...values }).onConflictDoUpdate({ target: campaignPublications.campaignId, set: values }).returning();
    await tx.update(campaigns).set({ publicationStatus: 'published' }).where(eq(campaigns.id, id));
    return record;
  });
}

/** Atomically repositions public access; draft, version and original authorship survive. */
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
    const identity = { name: target.config.name, slug: campaign.slug, endsAt: new Date(target.config.endsAt) };
    const frozen = publicationCampaign(privateConfig(target.config), identity, assets);
    const config = await prepareImages(id, frozen, assets);
    publicationCampaign(frozen, identity, assets);
    if (target.version !== current.version) {
      const [latestDelivery] = await tx.select({ deliveredAt: max(campaignPublicationHistory.deliveredAt) }).from(campaignPublicationHistory).where(eq(campaignPublicationHistory.campaignId, id));
      const deliveredAt = new Date(Math.max(Date.now(), current.deliveredAt.getTime() + 1, (latestDelivery?.deliveredAt?.getTime() ?? 0) + 1));
      // Latest effective delivery follows the snapshot into history, so legacy
      // pending readers recover the previous public version even after rollback.
      await tx.insert(campaignPublicationHistory).values({ campaignId: id, version: current.version, config: current.config, editorRevision: current.editorRevision, publishedBy: current.publishedBy, deliveredAt: current.deliveredAt, authorizedAt: current.createdAt }).onConflictDoNothing();
      await tx.delete(campaignPublicationHistory).where(and(eq(campaignPublicationHistory.campaignId, id), eq(campaignPublicationHistory.version, target.version)));
      await tx.update(campaignPublications).set({ version: target.version, config, editorRevision: target.editorRevision, publishedBy: target.publishedBy, createdAt: target.createdAt, deliveredAt }).where(eq(campaignPublications.campaignId, id));
    } else {
      await tx.update(campaignPublications).set({ config }).where(eq(campaignPublications.campaignId, id));
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
    const now = new Date(Math.max(Date.now(), campaign.updatedAt.getTime() + 1));
    const [updated] = await tx.update(campaigns).set({
      suspendedAt: suspended ? campaign.suspendedAt ?? now : null,
      suspendedBy: actor,
      updatedAt: now,
    }).where(eq(campaigns.id, id)).returning();
    return updated;
  });
}
