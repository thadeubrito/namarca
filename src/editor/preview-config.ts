import { parseCampaign, type CampaignConfig } from '@/lib/campaigns/campaigns';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const privateFile = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i;
export type PreviewInput = { campaignId: string; event: CampaignConfig; selectedArtworkId?: string; localAssets?: Record<string, string>; adminTheme?: 'dark' | 'light' };
export function validatePreview(input: PreviewInput, origin: string) {
  if (!uuid.test(input.campaignId)) throw new Error('Invalid campaign');
  const event = parseCampaign(input.event, input.event.slug, { allowEmptyArtworks: true });
  if ([...event.artworks, ...event.stickers].some(material => !privateFile.test(material.file))) throw new Error('Invalid file');
  if (input.selectedArtworkId !== undefined && !event.artworks.some(art => art.id === input.selectedArtworkId)) throw new Error('Invalid selection');
  const value = input.localAssets === undefined ? {} : input.localAssets;
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('Invalid local assets');
  const files = new Set([...event.artworks, ...event.stickers].map(material => material.file));
  const assets: Record<string, string> = {};
  for (const [file, url] of Object.entries(value)) {
    if (!files.has(file) || typeof url !== 'string' || !url.startsWith(`blob:${origin}/`) || url.length <= `blob:${origin}/`.length || /\s/.test(url) || new URL(url).origin !== origin) throw new Error('Invalid local asset');
    assets[file] = url;
  }
  return { event, selectedArtworkId: input.selectedArtworkId, assetUrls: assets, adminTheme: input.adminTheme === 'dark' ? 'dark' as const : 'light' as const };
}
