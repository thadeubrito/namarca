export function publicSiteUrl(slug: string) {
  const fallback = process.env.NODE_ENV === 'production' ? 'https://namarca.com' : 'http://localhost:3001';
  const base = new URL(process.env.PUBLIC_SITE_URL || fallback);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new Error('PUBLIC_SITE_URL deve ser uma origem HTTP(S).');
  return new URL(`/${slug}`, base).href;
}
