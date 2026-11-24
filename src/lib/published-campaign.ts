import 'server-only';
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { parseCampaign, resolveSlug, type CampaignConfig } from '@/lib/campaigns/campaigns';
import { db } from '@/db';
import { campaigns, campaignPublications, campaignPublicationHistory } from '@/db/schema';

/** Public, allow-listed committed snapshot. No admin session, draft or storage I/O.
 * One SQL statement keeps current/fallback/access consistent across a concurrent
 * commit. A legacy pending row is not public: its last delivered history is.
 */
export async function readDeliveredCampaignSnapshot(slug: string): Promise<{ config: CampaignConfig; version: number; suspended: boolean } | null> {
  if (resolveSlug(`/${slug}`) !== slug) return null;
  const [row] = await db.select({
    config: campaignPublications.config,
    version: campaignPublications.version,
    deliveredAt: campaignPublications.deliveredAt,
    previousConfig: campaignPublicationHistory.config,
    previousVersion: campaignPublicationHistory.version,
    suspendedAt: campaigns.suspendedAt,
  }).from(campaignPublications)
    .innerJoin(campaigns, eq(campaigns.id, campaignPublications.campaignId))
    .leftJoin(campaignPublicationHistory, and(
      eq(campaignPublicationHistory.campaignId, campaigns.id),
      isNull(campaignPublications.deliveredAt),
      isNotNull(campaignPublicationHistory.deliveredAt),
    ))
    .where(and(eq(campaigns.slug, slug), eq(campaigns.publicationStatus, 'published')))
    .orderBy(desc(campaignPublicationHistory.deliveredAt), desc(campaignPublicationHistory.version))
    .limit(1);
  if (!row) return null;
  const snapshot = row.deliveredAt ? row.config : row.previousConfig;
  const version = row.deliveredAt ? row.version : row.previousVersion;
  if (!snapshot || version === null) return null;
  // parseCampaign rebuilds every field (including nested materials/theme). Never
  // spread a raw DB config into the public response, including legacy snapshots.
  return { config: parseCampaign(snapshot, slug), version, suspended: row.suspendedAt !== null };
}

export async function readPublishedCampaign(slug: string): Promise<{ config: CampaignConfig; version: number; suspended: boolean } | null> {
  const publication = await readDeliveredCampaignSnapshot(slug);
  if (!publication) return null;
  const parsed = publication.config;
  const config = parseCampaign({ ...parsed,
    artworks: parsed.artworks.map(item => ({ ...item, file: `artworks/${item.id}.png` })),
    stickers: parsed.stickers.map(item => ({ ...item, file: `stickers/${item.id}.png` })),
  }, slug);
  return { ...publication, config };
}
