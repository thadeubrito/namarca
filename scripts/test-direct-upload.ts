// Container-only integration: real route handlers, Better Auth/TOTP, migrated DB and S3.
// No Next HTTP server/browser: server-only is stubbed only in this test process.
import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hashPassword } from 'better-auth/crypto';
import { Pool } from 'pg';
import { PNG } from 'pngjs';
import { S3Client, PutObjectCommand, GetObjectCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';

let stage = 'isolation gates';
let pool: Pool | undefined;
let closeDomain: (() => Promise<void>) | undefined;
let s3: S3Client | undefined;
const markerDirectory = mkdtempSync(join(tmpdir(), 'direct-upload-test-marker-'));
const marker = join(markerDirectory, 'server-only.mjs');
writeFileSync(marker, 'export {};\n');
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return { url: pathToFileURL(marker).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
function totp(uri: string) {
  const bits = [...new URL(uri).searchParams.get('secret')!.replace(/=+$/, '').toUpperCase()]
    .map(c => { const n = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c); assert.ok(n >= 0); return n.toString(2).padStart(5, '0'); }).join('');
  const key = Buffer.from(bits.match(/.{8}/g)!.map(b => parseInt(b, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac('sha1', key).update(counter).digest();
  return ((digest.readUInt32BE(digest[digest.length - 1] & 15) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
}
function png(color: number) {
  const image = new PNG({ width: 64, height: 64 });
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = color; image.data[i + 1] = 190; image.data[i + 2] = 80;
    image.data[i + 3] = i < image.data.length / 2 ? 255 : 0;
  }
  return PNG.sync.write(image, { deflateLevel: 0 });
}
async function main() {
  assert.equal(process.env.DIRECT_UPLOAD_TEST_DISPOSABLE, 'true');
  assert.equal(process.env.NODE_ENV, 'development');
  const database = new URL(process.env.DATABASE_URL!);
  assert.equal(database.hostname, 'direct-upload-test-db');
  assert.equal(database.pathname, '/namarca_direct_upload_test');
  const base = 'http://direct-upload-test-app:3000';
  const email = 'direct-upload-test@namarca.test';
  assert.equal(process.env.BETTER_AUTH_URL, base);
  assert.equal(process.env.ADMIN_EMAIL, email);
  assert.equal(process.env.S3_ENDPOINT, 'http://direct-upload-test-s3:9000');
  assert.equal(process.env.S3_UPLOAD_ENDPOINT, process.env.S3_ENDPOINT);
  assert.equal(process.env.S3_BUCKET, 'direct-upload-test');
  assert.equal(process.env.PIXGO_MODE, 'mock');
  pool = new Pool({ connectionString: database.href });
  assert.equal((await pool.query('select count(*)::int n from auth_user')).rows[0].n, 0);
  assert.equal((await pool.query('select count(*)::int n from campaigns')).rows[0].n, 0);
  assert.ok((await pool.query('select count(*)::int n from drizzle.__drizzle_migrations')).rows[0].n > 0);
  await pool.query('select id from campaign_asset_uploads limit 0');
  stage = 'load real handlers';
  const { auth } = await import('../apps/admin/src/lib/auth');
  const domain = await import('../apps/admin/src/db'); closeDomain = () => domain.pool.end();
  const authorize = (await import('../apps/admin/src/app/api/campaigns/[id]/assets/uploads/route')).POST;
  const complete = (await import('../apps/admin/src/app/api/campaigns/[id]/assets/uploads/[uploadId]/complete/route')).POST;
  const id = randomUUID(), campaignId = randomUUID(), otherCampaign = randomUUID();
  const password = randomBytes(30).toString('base64url');
  await pool.query('insert into auth_user (id,name,email,email_verified,created_at,updated_at) values ($1,$2,$3,true,now(),now())', [id, 'Direct upload integration', email]);
  await pool.query('insert into auth_account (id,account_id,provider_id,user_id,password,created_at,updated_at) values ($1,$2,$3,$2,$4,now(),now())', [randomUUID(), id, 'credential', await hashPassword(password)]);
  for (const cid of [campaignId, otherCampaign]) await pool.query("insert into campaigns (id,name,slug,ends_at) values ($1,'Synthetic direct upload',$2,'2099-12-31')", [cid, `direct-upload-test-${cid}`]);
  const cookies = new Map<string, string>();
  const headers = () => new Headers({ origin: base, 'content-type': 'application/json', cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; ') });
  async function authRequest(path: string, body: Record<string, unknown>) {
    const response = await auth.handler(new Request(`${base}/api/auth${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }));
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(';', 1)[0], split = pair.indexOf('=');
      if (!pair.slice(split + 1) || /max-age=0/i.test(value)) cookies.delete(pair.slice(0, split));
      else cookies.set(pair.slice(0, split), pair.slice(split + 1));
    }
    assert.equal(response.status, 200); return response.json();
  }
  function metadata(bytes: Buffer, uploadId = randomUUID()) {
    return { id: uploadId, name: 'Synthetic.png', kind: 'artwork', byteLength: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  async function start(input: ReturnType<typeof metadata>, cid = campaignId, h = headers()) {
    return authorize(new Request(`${base}/api/campaigns/${cid}/assets/uploads`, { method: 'POST', headers: h, body: JSON.stringify(input) }), { params: Promise.resolve({ id: cid }) });
  }
  async function finish(uploadId: string, cid = campaignId, h = headers()) {
    return complete(new Request(`${base}/api/campaigns/${cid}/assets/uploads/${uploadId}/complete`, { method: 'POST', headers: h }), { params: Promise.resolve({ id: cid, uploadId }) });
  }
  const bytes = png(40), different = png(41), input = metadata(bytes);
  stage = 'anonymous and password-only gates';
  assert.equal((await start(input)).status, 403);
  assert.equal((await finish(input.id)).status, 403);
  await authRequest('/sign-in/email', { email, password });
  assert.equal((await start(input)).status, 403);
  assert.equal((await finish(input.id)).status, 403);
  const setup = await authRequest('/two-factor/enable', { password, method: 'totp' });
  await authRequest('/two-factor/verify-totp', { code: totp(setup.totpURI), trustDevice: false });
  stage = 'origin, signed PUT and retry';
  const badOrigin = headers(); badOrigin.set('origin', 'https://other.invalid');
  assert.equal((await start(input, campaignId, badOrigin)).status, 403);
  assert.equal((await finish(input.id, campaignId, badOrigin)).status, 403);
  s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: 'us-east-1', forcePathStyle: true,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } });
  const bucket = process.env.S3_BUCKET!;
  async function putSigned(url: string, data: Buffer) {
    assert.equal(new URL(url).hostname, 'direct-upload-test-s3');
    // Browser code cannot set content-length: fetch derives it from the Blob size.
    const response = await fetch(url, { method: 'PUT', headers: { 'content-type': 'image/png', origin: base }, body: new Blob([new Uint8Array(data)], { type: 'image/png' }) });
    assert.equal(response.ok, true);
  }
  async function approved(value: ReturnType<typeof metadata>) {
    const response = await start(value); assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control')!, /no-store/);
    return (await response.json()).url as string;
  }
  const url = await approved(input);
  stage = 'real S3 CORS preflight';
  await s3.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: [{
    AllowedOrigins: [base], AllowedMethods: ['PUT'], AllowedHeaders: ['content-type', 'x-amz-*'], MaxAgeSeconds: 300,
  }] } }));
  const preflight = (origin: string) => fetch(url, { method: 'OPTIONS', headers: {
    origin, 'access-control-request-method': 'PUT', 'access-control-request-headers': 'content-type',
  } });
  const allowed = await preflight(base);
  assert.equal(allowed.ok, true);
  assert.equal(allowed.headers.get('access-control-allow-origin'), base);
  assert.match(allowed.headers.get('access-control-allow-methods')!, /PUT/);
  const forbidden = await preflight('https://other.invalid');
  assert.notEqual(forbidden.headers.get('access-control-allow-origin'), 'https://other.invalid');
  assert.notEqual(forbidden.headers.get('access-control-allow-origin'), '*');
  stage = 'signed Blob PUT and retry';
  const signed = new URL(url);
  assert.match(signed.searchParams.get('X-Amz-SignedHeaders')!, /content-length/);
  assert.match(signed.searchParams.get('X-Amz-SignedHeaders')!, /content-type/);
  // Authenticated staging is still not an asset until finalization.
  await putSigned(url, bytes);
  assert.equal((await pool.query('select count(*)::int n from campaign_assets')).rows[0].n, 0);
  assert.equal((await finish(input.id, otherCampaign)).status, 404);
  const first = await finish(input.id); assert.equal(first.status, 201);
  const result = await first.json(); assert.equal(result.material.width, 64);
  assert.equal((await finish(input.id)).status, 201);
  const retry = await start(input); assert.equal(retry.status, 200);
  assert.equal((await retry.json()).completed, true);
  assert.equal((await start({ ...input, sha256: '0'.repeat(64) })).status, 409);
  assert.equal((await start(input, otherCampaign)).status, 409);
  stage = 'staging replay cannot replace final bytes';
  // Replay the still-valid original signed URL with different bytes of equal length.
  assert.equal(different.length, bytes.length);
  await putSigned(url, different);
  assert.equal((await finish(input.id)).status, 201);
  const final = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: `private/campaigns/${campaignId}/assets/${input.id}.png` }));
  assert.deepEqual(Buffer.from(await final.Body!.transformToByteArray()), bytes);
  stage = 'different bytes, invalid PNG and expired authorization';
  const mismatch = metadata(bytes); const mismatchUrl = await approved(mismatch);
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: `private/uploads/${campaignId}/${mismatch.id}.png`, Body: different, ContentType: 'image/png' }));
  assert.equal((await finish(mismatch.id)).status, 409);
  // Retry uses same ID and succeeds after the exact authorized bytes arrive.
  await putSigned(mismatchUrl, bytes); assert.equal((await finish(mismatch.id)).status, 201);
  const invalid = Buffer.from('synthetic invalid PNG'), invalidInput = metadata(invalid);
  await putSigned(await approved(invalidInput), invalid);
  assert.equal((await finish(invalidInput.id)).status, 422);
  const expired = metadata(bytes); await putSigned(await approved(expired), bytes);
  await pool.query("update campaign_asset_uploads set expires_at=now()-interval '1 minute' where id=$1", [expired.id]);
  assert.equal((await finish(expired.id)).status, 409);
  await approved(expired); assert.equal((await finish(expired.id)).status, 201);
  stage = 'oversize authorization and storage object';
  const oversize = metadata(bytes); assert.equal((await start({ ...oversize, byteLength: 25 * 1024 * 1024 + 1 })).status, 422);
  await approved(oversize);
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: `private/uploads/${campaignId}/${oversize.id}.png`, Body: Buffer.alloc(25 * 1024 * 1024 + 1), ContentType: 'image/png' }));
  assert.equal((await finish(oversize.id)).status, 413);
  assert.equal((await pool.query('select count(*)::int n from campaign_assets where id=any($1::uuid[])', [[invalidInput.id, oversize.id]])).rows[0].n, 0);
  console.info('PASS direct upload: migrated disposable DB; real handlers + password/TOTP; origin/auth gates; signed PUT; retry/binding; invalid PNG; expiry; oversize; mismatched bytes; staging replay preserves final object.');
  console.info('PASS local S3 CORS: PutBucketCors; allowed/foreign-origin OPTIONS; signed Blob PUT without manual content-length.');
  console.info('LIMIT: no Next HTTP/browser or browser-enforced CORS; no production provider validation; expiry moved only in disposable DB.');
}
main().catch(() => { console.error(`Direct upload integration failed at: ${stage}. No payloads or signed URLs logged.`); process.exitCode = 1; })
  .finally(async () => { s3?.destroy(); await closeDomain?.(); await pool?.end(); rmSync(markerDirectory, { recursive: true, force: true }); });
