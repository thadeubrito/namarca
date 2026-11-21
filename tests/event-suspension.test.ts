import assert from 'node:assert/strict';
import test from 'node:test';
import { checkEventSuspended, loadEvent, MissingEventError, SuspendedEventError } from '../packages/editor/src/events/events';

const event = { slug: 'teste', name: 'Teste', color: '#123456', demo: false, endsAt: '2099-12-31T23:59:59Z', artworks: [{ id: 'a', name: 'Arte', file: 'releases/abc/a.png', width: 10, height: 10, reference: { x: 0, y: 0, width: 10, height: 10 } }], stickers: [] };

test('controle público estrito, suspensão antes de versão/assets e compatibilidade legada', async () => {
  const original = globalThis.fetch;
  const signal = new AbortController().signal;
  let manifest: unknown = { version: 2, suspended: true };
  const calls: { path: string; init?: RequestInit }[] = [];
  globalThis.fetch = async (path, init) => {
    calls.push({ path: String(path), init });
    return Response.json(String(path).endsWith('event.json') ? manifest : event);
  };
  try {
    await assert.rejects(loadEvent('teste', signal), SuspendedEventError);
    assert.equal(await checkEventSuspended('teste', signal), true);
    assert.equal(calls.length, 2);
    assert.ok(calls.every(call => call.path === '/events/teste/event.json' && call.init?.cache === 'no-store' && call.init.signal === signal));
    manifest = { version: 2 };
    calls.length = 0;
    assert.equal(await checkEventSuspended('teste', signal), false);
    assert.equal(calls.length, 1);
    assert.equal((await loadEvent('teste', signal)).name, 'Teste');
    assert.equal(calls[2].path, '/events/teste/versions/v2.json');
    for (const invalid of [{ version: 0 }, { version: 1.5 }, { version: '1' }, { version: Number.MAX_SAFE_INTEGER + 1 }, { version: 1, suspended: false }, { version: 1, suspended: 'true' }, { suspended: true }, { version: 1, suspended: true, extra: 1 }, { version: 1, extra: 1 }]) {
      manifest = invalid;
      calls.length = 0;
      await assert.rejects(loadEvent('teste', signal), /Configuração inválida/);
      await assert.rejects(checkEventSuspended('teste', signal), /Configuração inválida/);
      assert.equal(calls.length, 2);
    }
    manifest = event;
    assert.deepEqual((await loadEvent('teste', signal)).artworks, event.artworks);
    assert.equal(await checkEventSuspended('teste', signal), false);
    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(checkEventSuspended('teste', signal), /offline/);
    globalThis.fetch = async () => new Response(null, { status: 404 });
    await assert.rejects(checkEventSuspended('teste', signal), MissingEventError);
    globalThis.fetch = async () => new Response('<html>', { headers: { 'content-type': 'text/html' } });
    await assert.rejects(loadEvent('teste', signal), MissingEventError);
  } finally { globalThis.fetch = original; }
});
