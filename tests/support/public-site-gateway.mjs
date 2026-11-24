import { createServer } from 'node:http';
import { pipeline } from 'node:stream/promises';

const slug = '[a-z0-9]+(?:-[a-z0-9]+)*';
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const manifestRoute = new RegExp(`^/campaigns/(${slug})/campaign\\.json$`);
const versionRoute = new RegExp(`^/campaigns/(${slug})/versions/v[1-9][0-9]*\\.json$`);
const imageRoute = new RegExp(`^/campaigns/(${slug})/(?:releases/[0-9a-f]{64}|artworks|stickers)/(${uuid})\\.png$`);
const reserved = new Set(['admin', 'api', 'login', 'seguranca', 'checkout', 'campaigns', 'campaign-runtime', 'private']);
const immutable = 'public, max-age=31536000, immutable';
const security = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; worker-src 'self' blob:; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function reply(res, status, message) {
  res.writeHead(status, { ...security, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(message);
}

// Injected readObject accepts only a canonical public key; no list, write or DB abstraction exists.
export function createPublicServer({ readObject }) {
  return createServer(async (req, res) => {
    try {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return reply(res, 405, 'Método não permitido.');
      }
      // Do not use URL.pathname: its dot-segment normalization could conceal traversal.
      const raw = (req.url ?? '').split('?')[0];
      if (!raw.startsWith('/') || raw.startsWith('//')) return reply(res, 404, 'Não encontrado.');
      const path = decodeURIComponent(raw);
      if (path.includes('\\') || path.includes('\0') || path.split('/').some(part => part === '.' || part === '..' || part.startsWith('.'))) return reply(res, 404, 'Não encontrado.');
      const manifest = manifestRoute.exec(path);
      const version = versionRoute.exec(path);
      const image = imageRoute.exec(path);
      const match = manifest ?? version ?? image;
      if (match && match[1].length >= 2 && match[1].length <= 80 && !reserved.has(match[1])) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10_000);
        const disconnected = () => { if (!res.writableFinished) controller.abort(); };
        res.on('close', disconnected);
        try {
          const object = await readObject(`public${path}`, { signal: controller.signal });
          if (!object?.body) return reply(res, 404, 'Não encontrado.');
          res.writeHead(200, { ...security, 'Content-Type': manifest || version ? 'application/json; charset=utf-8' : 'image/png', 'Cache-Control': manifest ? 'no-store' : immutable });
          await pipeline(object.body, res, { signal: controller.signal });
        } finally {
          clearTimeout(timer);
          res.off('close', disconnected);
        }
        return;
      }
      return reply(res, 404, 'Não encontrado.');
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      const missing = ['ENOENT', 'ENOTDIR', 'EACCES'].includes(error?.code) || ['NoSuchKey', 'NotFound', 'AccessDenied'].includes(error?.name) || [403, 404].includes(error?.$metadata?.httpStatusCode);
      reply(res, error instanceof URIError || missing ? 404 : 503, error instanceof URIError || missing ? 'Não encontrado.' : 'Serviço temporariamente indisponível.');
    }
  });
}
