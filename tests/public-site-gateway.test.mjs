import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { request } from 'node:http';
import { createPublicServer } from './support/public-site-gateway.mjs';

const sha = 'a'.repeat(64);
const id = '12345678-1234-1234-1234-123456789abc';

test('gateway público: HTTP real, filesystem isolado e storage injetado', async t => {
  const keys = [];
  const server = createPublicServer({ readObject: async key => {
    keys.push(key);
    if (key.includes('/missing/')) throw Object.assign(new Error('sensitive bucket endpoint credentials'), { name: 'NoSuchKey' });
    if (key.includes('/failure/')) throw new Error('sensitive internal error');
    return { body: Readable.from([key.endsWith('.json') ? '{"version":1}' : Buffer.from([137, 80, 78, 71])]) };
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); });
  function get(path, method = 'GET') {
    return new Promise((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port: server.address().port, path, method }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
      });
      req.on('error', reject); req.end();
    });
  }
  assert.equal((await get('/')).status, 404, 'gateway de testes não serve a landing Next');
  assert.equal((await get('/my-event')).status, 404, 'campanhas são páginas Next');
  assert.equal(keys.length, 0, 'HTML não consulta bucket');
  assert.equal((await get('/campaign-runtime/main.js')).status, 404);
  const json = await get('/campaigns/my-event/campaign.json');
  assert.equal(json.status, 200);
  assert.equal(json.headers['cache-control'], 'no-store');
  assert.equal(json.headers['content-type'], 'application/json; charset=utf-8');
  const png = await get(`/campaigns/my-event/releases/${sha}/${id}.png`);
  assert.equal(png.status, 200);
  assert.equal(png.headers['content-type'], 'image/png');
  assert.match(png.headers['cache-control'], /immutable/);
  assert.deepEqual(keys, ['public/campaigns/my-event/campaign.json', `public/campaigns/my-event/releases/${sha}/${id}.png`]);
  for (const path of ['versions/v1.json', 'versions/v12.json', `artworks/${id}.png`, `stickers/${id}.png`]) {
    const response = await get(`/campaigns/my-event/${path}`);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers['cache-control'], 'public, max-age=31536000, immutable');
    assert.equal(response.headers['content-type'], path.endsWith('.json') ? 'application/json; charset=utf-8' : 'image/png');
    assert.equal(keys.at(-1), `public/campaigns/my-event/${path}`);
  }
  const count = keys.length;
  for (const path of ['/events/my-event/event.json', '/campaigns/my-event/event.json', '/campaigns/my-event/campaign.json.bak', '/campaigns/campaigns/campaign.json', '/campaigns/my-event/versions/v0.json', '/campaigns/my-event/versions/v01.json', '/campaigns/my-event/versions/v-1.json', '/campaigns/my-event/versions/v1.5.json', '/campaigns/my-event/artworks/not-a-uuid.png', '/campaigns/my-event/stickers/12345678-1234-1234-1234-123456789abz.png', '/private/a', '/admin', '/api/health', '//campaigns/my-event/campaign.json', '/campaigns/', '/campaigns/my-event/', '/campaigns/my-event/private.png', '/campaigns/my-event/releases/bad/file.png', '/campaigns/admin/campaign.json', '/campaign-runtime/', '/campaign-runtime/escape.js', '/campaign-runtime/../secret.js', '/campaign-runtime/%2e%2e/secret.js', '/campaign-runtime/%2F..%2Fsecret.js', '/campaign-runtime/%5csecret.js', '/campaign-runtime/%00.js', '/campaign-runtime/%ZZ', '/campaign-runtime/.hidden', '/campaign-runtime/missing.js']) {
    const response = await get(path);
    assert.equal(response.status, 404, path);
    assert.doesNotMatch(response.body, /PRIVATE|sensitive/);
    assert.equal(response.headers['cache-control'], 'no-store');
  }
  assert.equal(keys.length, count);
  for (const method of ['POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']) assert.equal((await get('/campaigns/my-event/campaign.json', method)).status, 405);
  assert.equal(keys.length, count);
  assert.equal((await get('/campaigns/missing/campaign.json')).status, 404);
  const failure = await get('/campaigns/failure/campaign.json');
  assert.equal(failure.status, 503);
  assert.doesNotMatch(failure.body, /sensitive|internal/);
});
