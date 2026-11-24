import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { assertUploadBinding, assertUploadBytes, parseUploadAuthorization, temporaryUploadKey } from '../apps/admin/src/lib/direct-upload';

const campaignId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const bytes = Buffer.from('test');
const input = { id, name: 'Material.png', kind: 'artwork', byteLength: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
test('authorization rejects arbitrary keys, oversized declarations, invalid kind/hash/name', () => {
  assert.equal(parseUploadAuthorization(input).id, id);
  for (const change of [{ key: 'public/file' }, { byteLength: 0 }, { byteLength: 26214401 }, { sha256: 'x' }, { kind: 'photo' }, { name: '../file' }]) {
    assert.throws(() => parseUploadAuthorization({ ...input, ...change }));
  }
  assert.equal(temporaryUploadKey(campaignId, id), `private/uploads/${campaignId}/${id}.png`);
  assert.throws(() => temporaryUploadKey('../public', id));
});
test('immutable authorization binds campaign, admin, kind, size and exact file hash', () => {
  const binding = { ...parseUploadAuthorization(input), campaignId, authorizedBy: 'admin' };
  assertUploadBinding(binding, binding);
  for (const change of [{ campaignId: id }, { authorizedBy: 'another' }, { kind: 'sticker' }, { byteLength: 99 }, { sha256: 'f'.repeat(64) }]) {
    assert.throws(() => assertUploadBinding(binding, { ...binding, ...change }));
  }
  assertUploadBytes(bytes, binding);
  assert.throws(() => assertUploadBytes(Buffer.from('TEST'), binding));
  assert.throws(() => assertUploadBytes(Buffer.from('test!'), binding));
});
test('both upload operations enforce admin and origin, bounded authorization and validated promotion', async () => {
  const root = 'apps/admin/src/app/api/campaigns/[id]/assets/uploads/';
  const authorize = await readFile(`${root}route.ts`, 'utf8');
  const complete = await readFile(`${root}[uploadId]/complete/route.ts`, 'utf8');
  for (const source of [authorize, complete]) {
    assert.match(source, /await requireAdmin\(request.headers\)/);
    assert.match(source, /assertMutationOrigin/);
    assert.match(source, /assertEditable/);
    assert.match(source, /authorizedBy/);
  }
  assert.match(authorize, /readLimitedBody\(request, 4096\)/);
  assert.match(complete, /assertUploadBytes\(bytes, upload\)/);
  assert.match(complete, /validatePng\(bytes\)/);
  assert.match(complete, /putPrivateObject\(key, bytes, 'image\/png'\)/);
  assert.doesNotMatch(complete, /CopyObjectCommand/);
});
