import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaignAssets, campaigns } from '@/db/schema';
import { UUID } from './campaign-editor';
import { campaignAssetKey } from './asset-cleanup-policy';
import { getPrivateObject } from './storage';

/** Material URLs are intentionally public before publication. No draft, private
 * notes or participant photos are returned. The server owns the exact object key.
 * The historical private/ prefix is retained to avoid copies or destructive moves.
 */
export async function readSharedCampaignAsset(slug: string, kind: string, file: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2 || slug.length > 80 || !['artworks', 'stickers'].includes(kind) || !file.endsWith('.png') || !UUID.test(file.slice(0, -4))) return null;
  const id = file.slice(0, -4);
  const [asset] = await db.select({ campaignId: campaignAssets.campaignId, key: campaignAssets.key })
    .from(campaignAssets).innerJoin(campaigns, eq(campaigns.id, campaignAssets.campaignId))
    .where(and(eq(campaigns.slug, slug), eq(campaignAssets.id, id), eq(campaignAssets.kind, kind === 'artworks' ? 'artwork' : 'sticker'))).limit(1);
  if (!asset || asset.key !== campaignAssetKey(asset.campaignId, id)) return null;
  return getPrivateObject(asset.key);
}
