import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createPublicServer } from '../services/public-site/server.mjs';

test('estudo isolado: allow-list exata, CSP local e raiz preservada', async () => {
  let reads = 0;
  const server = createPublicServer({ readObject: async () => { reads++; return null; } });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as { port: number };
  const origin = `http://127.0.0.1:${port}`;
  try {
    assert.equal(await (await fetch(origin)).text(), await readFile(new URL('../apps/site/estudos/lima/index.html', import.meta.url), 'utf8'));
    for (const path of ['/estudos/', '/estudos/estudos.js', '/estudos/estudos.css', '/estudos/NOTICE.txt', '/estudos/molduras/', '/estudos/molduras/molduras.css', '/estudos/molduras/molduras.js', '/estudos/perspectiva/', '/estudos/perspectiva/perspectiva.css', '/estudos/perspectiva/perspectiva.js', '/estudos/azul/', '/estudos/azul/azul.css']) {
      const response = await fetch(origin + path);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-security-policy')!, /script-src 'self';/);
      assert.doesNotMatch(response.headers.get('content-security-policy')!, /script-src[^;]*unsafe-inline/);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    for (const path of ['/estudos/index.html', '/estudos/unknown.js', '/estudos/.hidden', '/estudos/%2e%2e%2fpackage.json', '/estudos//estudos.js', '/estudos/molduras/index.html', '/estudos/molduras/unknown.js', '/estudos/molduras//molduras.js', '/estudos/molduras/%2e%2e%2findex.html', '/estudos/perspectiva/index.html', '/estudos/perspectiva/unknown.js', '/estudos/perspectiva//perspectiva.js', '/estudos/perspectiva/%2e%2e%2findex.html', '/estudos/azul/index.html', '/estudos/azul/unknown.js', '/estudos/azul//azul.css', '/estudos/azul/%2e%2e%2findex.html']) {
      assert.equal((await fetch(origin + path)).status, 404, path);
    }
    assert.equal((await fetch(origin + '/estudos/', { method: 'POST' })).status, 405);
    assert.equal((await fetch(origin + '/event-runtime/index.html')).status, 200);
    assert.equal((await fetch(origin + '/synthetic-campaign')).status, 200);
    assert.equal(reads, 0);
    assert.equal((await fetch(origin + '/events/synthetic-campaign/event.json')).status, 404);
    assert.equal(reads, 1);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
