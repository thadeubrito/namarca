import { unstable_cache } from 'next/cache';
import { readPublishedCampaign } from './published-campaign';

export const publicationCacheTag = (slug: string) => `public-campaign:${slug}`;
export function cachedPublishedCampaign(slug: string) {
  return unstable_cache(() => readPublishedCampaign(slug), ['public-campaign', slug], { revalidate: 30, tags: [publicationCacheTag(slug)] })();
}
