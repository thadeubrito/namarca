import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const slug = '[a-z0-9]+(?:-[a-z0-9]+)*';
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const manifestRoute = new RegExp(`^/events/(${slug})/event\\.json$`);
const versionRoute = new RegExp(`^/events/(${slug})/versions/v[1-9][0-9]*\\.json$`);
const imageRoute = new RegExp(`^/events/(${slug})/(?:releases/[0-9a-f]{64}|artworks|stickers)/(${uuid})\\.png$`);
const slugRoute = new RegExp(`^/(${slug})$`);
const reserved = new Set(['admin', 'api', 'login', 'seguranca', 'checkout', 'events', 'event-runtime', 'private']);
const immutable = 'public, max-age=31536000, immutable';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
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

async function localFile(res, directory, relative) {
  // Both lexical and canonical containment: encoded traversal and symlink escapes fail closed.
  const base = await realpath(directory);
  const candidate = resolve(base, relative);
  if (!candidate.startsWith(base + sep)) return reply(res, 404, 'Não encontrado.');
  const file = await realpath(candidate);
  if (!file.startsWith(base + sep) || !(await stat(file)).isFile()) return reply(res, 404, 'Não encontrado.');
  const type = types[extname(file)];
  if (!type) return reply(res, 404, 'Não encontrado.');
  const bytes = await readFile(file);
  res.writeHead(200, { ...security, 'Content-Type': type, 'Cache-Control': relative.startsWith('chunks/') && /-[a-zA-Z0-9]{8,}\./.test(relative) ? immutable : 'no-store', 'Content-Length': bytes.length });
  res.end(bytes);
}

// Injected readObject accepts only a canonical public key; no list, write or DB abstraction exists.
export function createPublicServer({ readObject, runtimeDir = resolve(root, 'apps/campaign/dist'), siteDir = resolve(root, 'apps/site') }) {
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
      if (path === '/') return await localFile(res, siteDir, 'index.html');
      if (path.startsWith('/event-runtime/')) return await localFile(res, runtimeDir, path.slice('/event-runtime/'.length));
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
      const event = slugRoute.exec(path);
      if (event && event[1].length >= 2 && event[1].length <= 80 && !reserved.has(event[1])) return await localFile(res, runtimeDir, 'index.html');
      return reply(res, 404, 'Não encontrado.');
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      const missing = ['ENOENT', 'ENOTDIR', 'EACCES'].includes(error?.code) || ['NoSuchKey', 'NotFound', 'AccessDenied'].includes(error?.name) || [403, 404].includes(error?.$metadata?.httpStatusCode);
      reply(res, error instanceof URIError || missing ? 404 : 503, error instanceof URIError || missing ? 'Não encontrado.' : 'Serviço temporariamente indisponível.');
    }
  });
}

export async function start(env = process.env) {
  // Deliberate allow-list: no shared application env parser, DB, finance or SDK credential discovery.
  const { S3_ENDPOINT, S3_REGION = 'us-east-1', S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, PORT = '3001' } = env;
  if (![S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY].every(value => typeof value === 'string' && value.length) || !/^\d+$/.test(PORT) || Number(PORT) < 1 || Number(PORT) > 65535) throw new Error('Configuração pública inválida.');
  const endpoint = new URL(S3_ENDPOINT);
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) throw new Error('Configuração pública inválida.');
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({ endpoint: S3_ENDPOINT, region: S3_REGION, forcePathStyle: true, credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY }, maxAttempts: 2 });
  const server = createPublicServer({ readObject: async (key, { signal }) => {
    // Defense in depth at the storage boundary.
    const path = key.slice('public'.length);
    if (!key.startsWith('public/events/') || !(manifestRoute.test(path) || versionRoute.test(path) || imageRoute.test(path))) throw new Error('Chave inválida.');
    const result = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }), { abortSignal: signal });
    return { body: result.Body };
  } });
  server.on('close', () => client.destroy());
  server.listen(Number(PORT), '0.0.0.0');
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start().catch(() => { console.error('Não foi possível iniciar o servidor público local.'); process.exitCode = 1; });
}
