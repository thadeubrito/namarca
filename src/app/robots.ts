import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { createHostRoutingConfig } from '@/lib/host-routing';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host')?.toLowerCase();
  const config = createHostRoutingConfig(process.env);
  // Preview/local/admin hosts must never advertise themselves to crawlers.
  if (host !== config.public || host !== 'namarca.com' || process.env.VERCEL_ENV === 'preview') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/login', '/seguranca', '/campanhas', '/clientes', '/financeiro', '/campaigns/'] },
    sitemap: 'https://namarca.com/sitemap.xml',
  };
}
