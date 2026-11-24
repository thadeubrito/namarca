import { readSharedCampaignAsset } from '@/lib/shared-campaign-asset';
import { UUID } from '@/lib/campaign-editor';

export const runtime = 'nodejs';
const missing = (error: unknown) => (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404;
const png = (body: Uint8Array) => new Response(Buffer.from(body), { headers: { 'Content-Type': 'image/png', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=31536000, immutable' } });
// One definitive object per material; no legacy public copies or release fallbacks.
export async function GET(_request: Request, context: { params: Promise<{ slug: string; kind: string; file: string }> }) {
  const { slug, kind, file } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2 || slug.length > 80 || !['artworks', 'stickers'].includes(kind) || !file.endsWith('.png') || !UUID.test(file.slice(0, -4))) return new Response(null, { status: 404 });
  try {
    try {
      const shared = await readSharedCampaignAsset(slug, kind, file);
      if (shared?.body) return png(shared.body);
    } catch (error) { if (!missing(error)) throw error; }
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
