import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
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
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
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
  const type = ['estudos/NOTICE.txt', 'estudos/galeria/OFL.txt', 'estudos/galeria/NOTICE.txt', 'estudos/lima/OFL.txt', 'estudos/lima/NOTICE.txt'].includes(relative) && directory === resolve(root, 'apps/site')
    ? 'text/plain; charset=utf-8' : types[extname(file)];
  if (!type) return reply(res, 404, 'Não encontrado.');
  const bytes = await readFile(file);
  // Permit only the exact inline prototype shipped with the institutional HTML.
  // Campaign/runtime responses retain their original, stricter script policy.
  const headers = { ...security };
  if (directory === resolve(root, 'apps/site') && relative === 'index.html') {
    const hashes = [...bytes.toString('utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)]
      .map(match => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
    if (hashes.length) headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace("script-src 'self'", `script-src 'self' ${hashes.join(' ')}`);
  }
  res.writeHead(200, { ...headers, 'Content-Type': type, 'Cache-Control': relative.startsWith('chunks/') && /-[a-zA-Z0-9]{8,}\./.test(relative) ? immutable : 'no-store', 'Content-Length': bytes.length });
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
      // The approved institutional page has one source; the study URL remains available.
      if (path === '/') return await localFile(res, siteDir, 'estudos/lima/index.html');
      // Exact study assets only: do not expose the site directory or shadow campaign slugs.
      if (path === '/estudos/') return await localFile(res, siteDir, 'estudos/index.html');
      if (path === '/estudos/molduras/') return await localFile(res, siteDir, 'estudos/molduras/index.html');
      if (path === '/estudos/perspectiva/') return await localFile(res, siteDir, 'estudos/perspectiva/index.html');
      if (path === '/estudos/galeria/') return await localFile(res, siteDir, 'estudos/galeria/index.html');
      if (path === '/estudos/lima/') return await localFile(res, siteDir, 'estudos/lima/index.html');
      if (['/estudos/lima/materials/clube-sol-story-display.webp', '/estudos/lima/materials/orbita-story-display.webp', '/estudos/lima/materials/adote-story-display.webp', '/estudos/lima/materials/ritmo-story-display.webp', '/estudos/lima/materials/final-story-display.webp', '/estudos/lima/materials/final-story-approved.webp', '/estudos/lima/materials/final-sticker-ball.webp', '/estudos/lima/materials/final-sticker-flag.webp', '/estudos/lima/materials/ritmo-story-approved.webp', '/estudos/lima/materials/ritmo-sticker-motion.webp', '/estudos/lima/materials/ritmo-sticker-shoe.webp', '/estudos/lima/materials/adote-story-approved.webp', '/estudos/lima/materials/adote-sticker-support.webp', '/estudos/lima/materials/adote-sticker-print.webp', '/estudos/lima/materials/orbita-story-approved.webp', '/estudos/lima/materials/orbita-sticker-cross.webp', '/estudos/lima/materials/orbita-sticker-crown.webp', '/estudos/lima/materials/clube-sol-story-approved.webp', '/estudos/lima/materials/clube-sol-sticker-sun.webp', '/estudos/lima/materials/clube-sol-sticker-spark.webp', '/estudos/lima/materials/compartilhamento-real-01.webp', '/estudos/lima/materials/compartilhamento-real-02.webp', '/estudos/lima/materials/compartilhamento-real-03.webp', '/estudos/lima/materials/compartilhamento-real-04.webp', '/estudos/lima/materials/compartilhamento-real-05.webp', '/estudos/lima/materials/compartilhamento-real-06.webp', '/estudos/lima/materials/compartilhamento-real-07.webp', '/estudos/lima/materials/compartilhamento-artista.webp', '/estudos/lima/materials/compartilhamento-tecnologia.webp', '/estudos/lima/materials/compartilhamento-financeiro.webp', '/estudos/lima/materials/compartilhamento-esporte.webp', '/estudos/lima/materials/compartilhamento-musica.webp', '/estudos/lima/materials/compartilhamento-estudante.webp', '/estudos/lima/materials/compartilhamento-cafe.webp', '/estudos/lima/materials/mouth-sharing-young.webp', '/estudos/lima/materials/cafe-story-approved.webp', '/estudos/lima/materials/cafe-sticker-cup.webp', '/estudos/lima/materials/cafe-sticker-croissant.webp', '/estudos/lima/materials.css', '/estudos/lima/materials/torn-tape.webp', '/estudos/lima/materials/coral-seal.webp', '/estudos/lima/materials/angular-cuts.webp', '/estudos/lima/materials/halftone-paper.webp', '/estudos/lima/materials/michael-dam-portrait.webp', '/estudos/lima/lima.css', '/estudos/lima/boot.js', '/estudos/lima/photo-geometry.js', '/estudos/lima/lima.js', '/estudos/lima/poppins-300-latin.woff2', '/estudos/lima/poppins-400-latin.woff2', '/estudos/lima/poppins-500-latin.woff2', '/estudos/lima/poppins-600-latin.woff2', '/estudos/lima/poppins-700-latin.woff2', '/estudos/lima/OFL.txt', '/estudos/lima/NOTICE.txt'].includes(path)) return await localFile(res, siteDir, path.slice(1));
      if (path === '/estudos/azul/') return await localFile(res, siteDir, 'estudos/azul/index.html');
      if (path === '/estudos/azul/azul.css') return await localFile(res, siteDir, 'estudos/azul/azul.css');
      if (['/estudos/galeria/galeria.css', '/estudos/galeria/manrope-latin.woff2', '/estudos/galeria/OFL.txt', '/estudos/galeria/NOTICE.txt'].includes(path)) return await localFile(res, siteDir, path.slice(1));
      if (['/estudos/estudos.css', '/estudos/estudos.js', '/estudos/NOTICE.txt', '/estudos/molduras/molduras.css', '/estudos/molduras/molduras.js', '/estudos/perspectiva/perspectiva.css', '/estudos/perspectiva/perspectiva.js'].includes(path)) return await localFile(res, siteDir, path.slice(1));
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
