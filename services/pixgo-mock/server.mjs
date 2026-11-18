import http from 'node:http';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CALLBACK = 'http://app:3000/api/webhooks/pixgo';
const equal = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export async function createMock({ apiKey, webhookSecret, devToken, dataFile, deliver = fetch, now = Date.now } = {}) {
  if (![apiKey, webhookSecret, devToken].every(v => typeof v === 'string' && v.length >= 16)) throw new Error('PIXGO secrets required (at least 16 characters)');
  let payments = dataFile ? JSON.parse(await readFile(dataFile, 'utf8').catch(e => { if (e.code === 'ENOENT') return '[]'; throw e; })) : [];
  let queue = Promise.resolve();
  const save = async () => {
    if (!dataFile) return;
    await mkdir(dirname(dataFile), { recursive: true });
    await writeFile(`${dataFile}.tmp`, JSON.stringify(payments), { mode: 0o600 });
    await rename(`${dataFile}.tmp`, dataFile);
  };
  const json = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(data)); };
  const body = async req => {
    let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 16384) throw Object.assign(new Error('Body too large'), { status: 413 }); }
    try { return JSON.parse(raw || '{}'); } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
  };
  const expire = async () => { let changed = false; for (const p of payments) if (p.status === 'pending' && Date.parse(p.expires_at) <= now()) { p.status = 'expired'; changed = true; } if (changed) await save(); };
  const handler = async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true, fake: true });
    const dev = url.pathname.startsWith('/__dev/');
    if (!equal(req.headers[dev ? 'x-dev-token' : 'x-api-key'], dev ? devToken : apiKey)) return json(res, 401, { success: false, error: 'Unauthorized' });
    await expire();
    const path = url.pathname.replace(/^\/api\/v1/, '');
    if (req.method === 'POST' && (path === '/payment/create' || path === '/payments')) {
      const input = await body(req);
      if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 1000000 || !/^\d{11}$/.test(input.receiver_cpf || '') || typeof input.external_id !== 'string' || !input.external_id || input.external_id.length > 200 || input.webhook_url !== CALLBACK) return json(res, 400, { success: false, error: 'Invalid amount, receiver_cpf, external_id or webhook_url; only the local app callback is allowed' });
      const payment = { payment_id: randomUUID(), amount: input.amount, external_id: input.external_id, webhook_url: CALLBACK, status: 'pending', qr_code: 'FAKE-PIX-SEM-VALOR', qr_image_url: null, created_at: new Date(now()).toISOString(), expires_at: new Date(now() + 30 * 60000).toISOString() };
      payments.push(payment); await save(); return json(res, 200, { success: true, data: payment });
    }
    if (req.method === 'GET' && (path === '/payment/list' || path === '/payments')) return json(res, 200, { success: true, data: payments.filter(p => !url.searchParams.has('external_id') || p.external_id === url.searchParams.get('external_id')) });
    const statusId = path === '/payment/status' ? url.searchParams.get('payment_id') : path.match(/^\/payment\/([^/]+)\/status$/)?.[1] || path.match(/^\/payments\/([^/]+)$/)?.[1];
    if (req.method === 'GET' && statusId) {
      const payment = payments.find(p => p.payment_id === statusId);
      return json(res, payment ? payment.status === 'expired' ? 410 : 200 : 404, payment ? { success: payment.status !== 'expired', data: payment } : { success: false, error: 'Not found' });
    }
    const action = url.pathname.match(/^\/__dev\/payments\/([^/]+)\/(complete|expire|refund)$/);
    if (req.method === 'POST' && action) {
      const payment = payments.find(p => p.payment_id === action[1]);
      if (!payment) return json(res, 404, { success: false, error: 'Not found' });
      const next = { complete: 'completed', expire: 'expired', refund: 'refunded' }[action[2]];
      if (payment.status !== next && !(payment.status === 'pending' && next !== 'refunded') && !(payment.status === 'completed' && next === 'refunded')) return json(res, payment.status === 'expired' ? 410 : 409, { success: false, error: 'Invalid transition', data: payment });
      payment.status = next; await save();
      const raw = JSON.stringify({ event: `payment.${next}`, timestamp: new Date(now()).toISOString(), data: payment });
      const timestamp = Math.floor(now() / 1000).toString();
      const signature = createHmac('sha256', webhookSecret).update(`${timestamp}.${raw}`).digest('hex');
      // Release the mutation queue before delivery: the receiver queries status back.
      const snapshot = { ...payment };
      return async () => {
        try {
          const response = await deliver(CALLBACK, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000), headers: { 'content-type': 'application/json', 'x-webhook-timestamp': timestamp, 'x-webhook-signature': signature }, body: raw });
          if (!response.ok) throw new Error('Callback rejected');
          return json(res, 200, { success: true, data: snapshot, webhook_delivered: true });
        } catch { return json(res, 502, { success: false, data: snapshot, webhook_delivered: false, error: 'State saved; repeat same action to retry callback' }); }
      };
    }
    return json(res, 404, { success: false, error: 'Not found' });
  };
  const server = http.createServer((req, res) => {
    // Serial mutations and atomic JSON replacement: one process per volume.
    const handleError = error => { if (!res.headersSent) json(res, error.status || 500, { success: false, error: error.status ? error.message : 'Internal error' }); else res.end(); };
    const operation = queue.then(() => handler(req, res));
    queue = operation.then(() => undefined, () => undefined);
    operation.then(delivery => typeof delivery === 'function' ? delivery() : undefined).catch(handleError);
  });
  server.requestTimeout = 10000; server.headersTimeout = 5000;
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await createMock({ apiKey: process.env.PIXGO_API_KEY, webhookSecret: process.env.PIXGO_WEBHOOK_SECRET, devToken: process.env.PIXGO_MOCK_DEV_TOKEN, dataFile: process.env.PIXGO_MOCK_DATA });
  server.listen(4010, '0.0.0.0', () => console.log('FAKE PIX — SEM VALOR; local mock listening on 4010'));
}
