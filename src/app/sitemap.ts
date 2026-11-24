import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  // Campaigns, checkout links and administrative routes are intentionally excluded.
  return [{ url: 'https://namarca.com/', changeFrequency: 'monthly', priority: 1 }];
}
