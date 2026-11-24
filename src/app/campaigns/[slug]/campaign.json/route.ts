import { cachedPublishedCampaign } from '@/lib/publication-cache';

export const runtime = 'nodejs';
// No persistent JSON artifact: this response is a disposable cache of DB state.
// Browser no-store preserves suspension checks; DB cache lasts at most 30s and
// publication actions invalidate it after commit.
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2 || slug.length > 80) return new Response(null, { status: 404, headers });
  try {
    const publication = await cachedPublishedCampaign(slug);
    if (!publication) return new Response(null, { status: 404, headers });
    // The shared parser accepts a suspended control object before any assets.
    return Response.json(publication.suspended ? { version: publication.version, suspended: true } : publication.config, { headers });
  } catch { return Response.json({ error: 'Campanha temporariamente indisponível' }, { status: 503, headers }); }
}
