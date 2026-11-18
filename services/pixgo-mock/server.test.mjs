import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CALLBACK, createMock } from './server.mjs';
const apiKey = 'test-api-key-0123456789';
const webhookSecret = 'test-webhook-secret-0123456789';
const devToken = 'test-dev-token-0123456789';
async function fixture(t, extra = {}) {
  const server = await createMock({ apiKey, webhookSecret, devToken, ...extra });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const call = async (path, { method = 'GET', data, dev = false, key = apiKey } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { 'content-type': 'application/json', ...(dev ? { 'x-dev-token': devToken } : { 'x-api-key': key }) }, body: data === undefined ? undefined : JSON.stringify(data) });
    return { status: response.status, body: await response.json() };
  };
  return { call, server };
}
const input = { amount: 12.34, receiver_cpf: '12345678901', external_id: 'repeatable', webhook_url: CALLBACK };
test('requires secrets', async () => { await assert.rejects(createMock(), /secrets required/); });
test('create, duplicate external_id, status, list, auth and SSRF rejection', async t => {
  const { call } = await fixture(t);
  assert.equal((await call('/health', { key: '' })).status, 200);
  assert.equal((await call('/payments', { key: '' })).status, 401);
  assert.equal((await call('/payments', { method: 'POST', data: { ...input, webhook_url: 'http://169.254.169.254/' } })).status, 400);
  assert.equal((await call('/payments', { method: 'POST', data: { ...input, amount: -1 } })).status, 400);
  const first = await call('/api/v1/payment/create', { method: 'POST', data: input });
  assert.equal(first.status, 200); assert.equal(first.body.data.status, 'pending');
  assert.equal(first.body.data.qr_code, 'FAKE-PIX-SEM-VALOR'); assert.equal(first.body.data.qr_image_url, null);
  const second = await call('/payments', { method: 'POST', data: input });
  assert.notEqual(first.body.data.payment_id, second.body.data.payment_id);
  assert.equal((await call('/payment/list?external_id=repeatable')).body.data.length, 2);
  assert.equal((await call(`/payment/status?payment_id=${first.body.data.payment_id}`)).body.data.amount, 12.34);
  assert.equal((await call('/payments/unknown')).status, 404);
});
test('dev isolation, HMAC exact bytes, complete/refund and callback retries', async t => {
  let deliveries = [], ok = false;
  const { call } = await fixture(t, { deliver: async (url, opts) => { deliveries.push({ url, ...opts }); return { ok }; } });
  const id = (await call('/payments', { method: 'POST', data: input })).body.data.payment_id;
  const path = `/__dev/payments/${id}/complete`;
  assert.equal((await call(path, { method: 'POST' })).status, 401);
  assert.equal((await call(path, { method: 'POST', dev: true })).status, 502);
  ok = true;
  assert.equal((await call(path, { method: 'POST', dev: true })).status, 200);
  const delivered = deliveries[0];
  assert.equal(delivered.url, CALLBACK); assert.equal(delivered.redirect, 'error');
  assert.equal(delivered.headers['x-webhook-signature'], createHmac('sha256', webhookSecret).update(`${delivered.headers['x-webhook-timestamp']}.${delivered.body}`).digest('hex'));
  assert.equal(JSON.parse(delivered.body).data.status, 'completed');
  assert.equal((await call(`/__dev/payments/${id}/expire`, { method: 'POST', dev: true })).status, 409);
  assert.equal((await call(`/__dev/payments/${id}/refund`, { method: 'POST', dev: true })).body.data.status, 'refunded');
});
test('expiration returns HTTP410 and cannot complete', async t => {
  let clock = Date.now();
  const { call } = await fixture(t, { now: () => clock, deliver: async () => ({ ok: true }) });
  const id = (await call('/payments', { method: 'POST', data: input })).body.data.payment_id;
  clock += 31 * 60000;
  assert.equal((await call(`/payments/${id}`)).status, 410);
  assert.equal((await call(`/__dev/payments/${id}/complete`, { method: 'POST', dev: true })).status, 410);
});
test('manual expire callback and persisted payments survive restart', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'pixgo-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const dataFile = join(directory, 'payments.json');
  const { call } = await fixture(t, { dataFile, deliver: async () => ({ ok: true }) });
  const id = (await call('/payments', { method: 'POST', data: input })).body.data.payment_id;
  assert.equal((await call(`/__dev/payments/${id}/expire`, { method: 'POST', dev: true })).status, 200);
  const restored = await fixture(t, { dataFile });
  const result = await restored.call(`/payments/${id}`);
  assert.equal(result.status, 410); assert.equal(result.body.data.status, 'expired');
});
