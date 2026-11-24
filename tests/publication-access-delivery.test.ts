import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { createPublicServer } from './support/public-site-gateway.mjs';
import { deliverPublicationAccess } from '../src/lib/publication-access-delivery';
import { loadCampaign, MissingCampaignError, SuspendedCampaignError, type CampaignConfig } from '../src/lib/campaigns/campaigns';

const id = '00000000-0000-4000-8000-000000000001';
const file = `releases/${'a'.repeat(64)}/${id}.png`;
const config: CampaignConfig = { slug: 'fixture-legacy', name: 'Fixture', color: '#123456', demo: false, endsAt: '2099-12-31T23:59:59Z', artworks: [{ id, name: 'Arte', file, width: 10, height: 10, reference: { x: 0, y: 0, width: 10, height: 10 } }], stickers: [] };
const base = `public/campaigns/${config.slug}`;

test('legado entregue: reproduz pointer órfão e repara com snapshot congelado antes do pointer, via gateway/loader reais', async () => {
  const objects = new Map<string, Uint8Array>([[`${base}/campaign.json`, Buffer.from(JSON.stringify(config))], [`${base}/${file}`, Buffer.from('fixture-png')]]);
  const writes: string[] = [];
  const storage = { exists: async (key: string) => objects.has(key), put: async (key: string, body: Uint8Array) => { writes.push(key); objects.set(key, body); } };
  const server = createPublicServer({ readObject: async (key: string) => objects.has(key) ? { body: Readable.from([objects.get(key)!]) } : null });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const origin = `http://127.0.0.1:${address.port}`;
  const fetch = globalThis.fetch;
  globalThis.fetch = (path, init) => fetch(new URL(String(path), origin), init);
  const signal = new AbortController().signal;
  try {
    assert.equal((await loadCampaign(config.slug, signal)).artworks[0].file, file);
    // Exact old action output: campaign.json 200 JSON, missing version 404 text/plain.
    objects.set(`${base}/campaign.json`, Buffer.from(JSON.stringify({ version: 1 })));
    const pointer = await fetch(`${origin}/campaigns/${config.slug}/campaign.json`);
    assert.equal(pointer.status, 200);
    assert.match(pointer.headers.get('content-type')!, /application\/json/);
    const missing = await fetch(`${origin}/campaigns/${config.slug}/versions/v1.json`);
    assert.equal(missing.status, 404);
    assert.match(missing.headers.get('content-type')!, /text\/plain/);
    await assert.rejects(loadCampaign(config.slug, signal), MissingCampaignError);
    await deliverPublicationAccess({ config, version: 1 }, true, storage);
    assert.deepEqual(writes, [`${base}/versions/v1.json`, `${base}/campaign.json`]);
    await assert.rejects(loadCampaign(config.slug, signal), SuspendedCampaignError);
    const frozen = objects.get(`${base}/versions/v1.json`);
    writes.length = 0;
    await deliverPublicationAccess({ config, version: 1 }, false, storage);
    assert.deepEqual(writes, [`${base}/campaign.json`]);
    assert.equal(objects.get(`${base}/versions/v1.json`), frozen);
    assert.equal((await loadCampaign(config.slug, signal)).artworks[0].file, file);
    assert.equal((await fetch(`${origin}/campaigns/${config.slug}/${file}`)).status, 200);
  } finally {
    globalThis.fetch = fetch;
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('falha de materialização/HEAD nunca escreve pointer e versão existente permanece imutável', async () => {
  const writes: string[] = [];
  const put = async (key: string) => { writes.push(key); throw new Error('storage'); };
  await assert.rejects(deliverPublicationAccess({ config, version: 1 }, false, { exists: async () => false, put }), /storage/);
  assert.deepEqual(writes, [`${base}/versions/v1.json`]);
  writes.length = 0;
  await assert.rejects(deliverPublicationAccess({ config, version: 1 }, false, { exists: async () => { throw new Error('HEAD'); }, put }), /HEAD/);
  assert.deepEqual(writes, []);
});
