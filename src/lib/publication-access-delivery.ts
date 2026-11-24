import { parseCampaign, type CampaignConfig } from '@/lib/campaigns/campaigns';
import { publicationPointer } from './publication-access';

/** Access changes never adopt a draft or rewrite asset references from a delivered snapshot. */
export async function deliverPublicationAccess(
  publication: { config: CampaignConfig; version: number },
  suspended: boolean,
  storage: {
    exists: (key: string) => Promise<boolean>;
    put: (key: string, body: Uint8Array, contentType: 'application/json') => Promise<unknown>;
  },
) {
  const { version } = publication;
  const pointer = publicationPointer(version, suspended);
  const event = parseCampaign(publication.config, publication.config.slug);
  const base = `public/campaigns/${event.slug}`;
  const versionKey = `${base}/versions/v${version}.json`;
  // Migration 0014 numbered DB rows, not storage objects. Delivered legacy
  // manifests use releases/hash assets, which must remain unchanged here.
  // Also repairs a pointer previously written by the buggy access action.
  // Existing immutable versions must never be overwritten on an access toggle.
  if (!await storage.exists(versionKey)) {
    await storage.put(versionKey, Buffer.from(JSON.stringify(event)), 'application/json');
  }
  await storage.put(`${base}/campaign.json`, Buffer.from(JSON.stringify(pointer)), 'application/json');
}
