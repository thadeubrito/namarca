// Container-only domain integration. Authorization belongs to the external
// privileged actions; this fixture does not claim HTTP/auth/browser coverage.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createServer, request as httpRequest } from 'node:http';
import { eq, inArray } from 'drizzle-orm';
import { PNG } from 'pngjs';
import type { Artwork, Material } from '@/lib/campaigns/campaigns';
import { S3Client, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

async function main() {
  assert.ok(existsSync('/.dockerenv'), 'Container required');
  const url = new URL(process.env.DATABASE_URL ?? '');
  assert.equal(url.pathname, '/namarca_publication_test');
  assert.equal(url.hostname, 'publication-test-db');
  assert.equal(process.env.PUBLICATION_TEST_DISPOSABLE, 'true');
  assert.equal(process.env.NODE_ENV, 'development');
  assert.equal(process.env.PIXGO_MODE, 'mock');
  const endpoint = new URL(process.env.S3_ENDPOINT ?? '');
  assert.equal(endpoint.hostname, 'publication-test-s3');
  assert.equal(process.env.S3_BUCKET, 'publication-test');
  const markerDirectory = mkdtempSync(join(tmpdir(), 'publication-test-marker-'));
  const marker = join(markerDirectory, 'server-only.mjs');
  writeFileSync(marker, 'export {};\n');
  const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') return { url: pathToFileURL(marker).href, shortCircuit: true };
    return nextResolve(specifier, context);
  } });
  const client = new S3Client({ endpoint: endpoint.href, region: 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } });
  const Bucket = process.env.S3_BUCKET!;
  const { db, pool } = await import('../src/db');
  const s = await import('../src/db/schema');
  const { publishCampaign, publishHistoricalVersion, setCampaignSuspended } = await import('../src/lib/campaign-publication');
  const { readPublishedCampaign } = await import('../src/lib/published-campaign');
  const { readSharedCampaignAsset } = await import('../src/lib/shared-campaign-asset');
  const { restorePublishedDraft } = await import('../src/lib/publication-restore');
  const { CampaignEditorError, defaultCampaignConfig } = await import('../src/lib/campaign-editor');
  const { putPrivateObject } = await import('../src/lib/storage');
  const { publicationArtifacts } = await import('../src/lib/publication-artifacts');
  const ids = Array.from({ length: 5 }, () => randomUUID());
  const [id, emptyId, expiredId, failureId, paidId] = ids;
  const keys = new Set<string>();
  let ownsFixtures = false;
  let rejectImages = false;
  let inspectSlug: string | undefined;
  const observations: Awaited<ReturnType<typeof readPublishedCampaign>>[] = [];
  const writes: string[] = [];
  // Transport fault injection only. Reads use the real DB reader on a separate
  // pool connection while the publisher holds its transaction/campaign lock.
  const proxy = createServer(async (req, res) => {
    try {
      const path = req.url ?? '';
      const pathname = decodeURIComponent(path.split('?')[0]);
      if (req.method === 'PUT') writes.push(pathname);
      if (req.method === 'HEAD' && pathname.includes('/private/campaigns/') && pathname.endsWith('.png')) {
        if (inspectSlug) observations.push(await readPublishedCampaign(inspectSlug));
        if (rejectImages) {
          req.resume(); res.writeHead(503); res.end(); return;
        }
      }
      const upstream = httpRequest(new URL(path, endpoint), { method: req.method, headers: req.headers }, response => { res.writeHead(response.statusCode!, response.headers); response.pipe(res); });
      upstream.on('error', () => { res.writeHead(502); res.end(); });
      req.pipe(upstream);
    } catch { req.resume(); res.writeHead(500); res.end(); }
  });
  await new Promise<void>(resolve => proxy.listen(0, '127.0.0.1', resolve));
  const address = proxy.address(); assert.ok(address && typeof address !== 'string');
  process.env.S3_ENDPOINT = `http://127.0.0.1:${address.port}`;
  const financialState = async () => ({ links: await db.select().from(s.checkoutLinks), attempts: await db.select().from(s.checkoutAttempts), events: await db.select().from(s.checkoutAttemptEvents), payments: await db.select().from(s.payments), receipts: await db.select().from(s.webhookReceipts), tasks: await db.select().from(s.publicationTasks) });
  const object = async (Key: string) => { const result = await client.send(new GetObjectCommand({ Bucket, Key })); return { bytes: Buffer.from(await result.Body!.transformToByteArray()), type: result.ContentType }; };
  const status = (value: number) => (e: unknown) => e instanceof CampaignEditorError && e.status === value;
  const current = async (campaignId = id) => (await db.select().from(s.campaignPublications).where(eq(s.campaignPublications.campaignId, campaignId)))[0];
  const campaign = async (campaignId: string = id) => (await db.select().from(s.campaigns).where(eq(s.campaigns.id, campaignId)))[0];
  const editor = async (campaignId = id) => (await db.select().from(s.campaignEditor).where(eq(s.campaignEditor.campaignId, campaignId)))[0];
  const history = async (campaignId = id) => db.select().from(s.campaignPublicationHistory).where(eq(s.campaignPublicationHistory.campaignId, campaignId));
  const png = new PNG({ width: 2, height: 2 }); png.data.fill(255); png.data[3] = 0;
  const bytes = PNG.sync.write(png);
  async function addAsset(campaignId: string, kind?: 'artwork'): Promise<Artwork>;
  async function addAsset(campaignId: string, kind: 'sticker'): Promise<Material>;
  async function addAsset(campaignId: string, kind: 'artwork' | 'sticker' = 'artwork'): Promise<Artwork | Material> {
    const asset = randomUUID(), key = `private/campaigns/${campaignId}/assets/${asset}.png`;
    keys.add(key);
    await db.insert(s.campaignAssets).values({ id: asset, campaignId, key, width: 2, height: 2, kind });
    await putPrivateObject(key, bytes, 'image/png');
    return { id: asset, name: 'Synthetic material', file: `${asset}.png`, width: 2, height: 2, ...(kind === 'artwork' ? { reference: { x: 0, y: 0, width: 2, height: 2 } } : {}) };
  }
  try {
    const occupied = await pool.query('SELECT EXISTS (SELECT 1 FROM campaigns) OR EXISTS (SELECT 1 FROM clients) OR EXISTS (SELECT 1 FROM auth_user) AS occupied');
    assert.equal(occupied.rows[0].occupied, false);
    assert.equal((await client.send(new ListObjectsV2Command({ Bucket }))).KeyCount, 0);
    assert.ok((await pool.query("SELECT to_regclass('public.campaign_asset_uploads') AS uploads")).rows[0].uploads, 'Complete migration chain, including0016');
    ownsFixtures = true;
    for (const campaignId of ids) {
      const identity = { name: `Public fixture ${campaignId}`, slug: `publication-${campaignId}`, endsAt: new Date(campaignId === expiredId ? '2000-01-01' : '2099-01-01') };
      await db.insert(s.campaigns).values({ id: campaignId, ...identity, notes: 'PRIVATE-NOTES-FIXTURE', contact: 'PRIVATE-CONTACT-FIXTURE' });
      const artwork = await addAsset(campaignId), sticker = await addAsset(campaignId, 'sticker');
      await db.insert(s.campaignEditor).values({ campaignId, revision: 7, config: { ...defaultCampaignConfig(identity), artworks: campaignId === emptyId ? [] : [artwork], stickers: [sticker] } });
    }
    const slug = (await campaign()).slug;
    const read = () => readPublishedCampaign(slug);
    const draftMaterial = (await editor()).config.artworks[0];
    const assertSharedArtwork = async () => {
      const shared = await readSharedCampaignAsset(slug, 'artworks', `${draftMaterial.id}.png`);
      assert.ok(shared?.body, 'Canonical material is readable without a publication dependency');
      assert.equal(shared.contentType, 'image/png');
      assert.ok(Buffer.from(shared.body).equals(bytes), 'Draft and public URLs use the same bytes');
      assert.equal(await readSharedCampaignAsset(slug, 'stickers', `${draftMaterial.id}.png`), null, 'Wrong kind cannot resolve the row');
      assert.equal(await readSharedCampaignAsset((await campaign(emptyId)).slug, 'artworks', `${draftMaterial.id}.png`), null, 'Wrong campaign slug cannot resolve the row');
    };
    assert.equal(await read(), null);
    await assertSharedArtwork();
    const beforeFinance = await financialState();
    assert.ok(Object.values(beforeFinance).every(rows => rows.length === 0), 'Payment is not required');
    for (const [campaignId, revision, code] of [[emptyId, 7, 422], [expiredId, 7, 422], [id, 6, 409]] as const) {
      await assert.rejects(() => publishCampaign(campaignId, revision, 'fixture-admin'), status(code));
      assert.equal(await current(campaignId), undefined);
      assert.equal(await readPublishedCampaign((await campaign(campaignId)).slug), null);
    }
    await assert.rejects(() => publishCampaign(id, 7, 'fixture-admin', '2000-01-01T00:00:00.000Z'), status(409));
    writes.length = 0; inspectSlug = slug;
    const published = await publishCampaign(id, 7, 'fixture-admin', (await campaign()).updatedAt.toISOString());
    assert.equal(published.version, 1); assert.equal(published.editorRevision, 7); assert.ok(published.deliveredAt);
    assert.equal(writes.length, 0, 'Publication validates shared objects without PUT');
    assert.ok(observations.length > 0); observations.forEach(value => assert.equal(value, null));
    assert.deepEqual(await read(), { config: published.config, version: 1, suspended: false });
    assert.deepEqual(published.config, publicationArtifacts((await editor()).config).event);
    await assertSharedArtwork();
    for (const value of ['PRIVATE-', 'fixture-admin', 'private/campaigns/', 'publishedBy', 'priceCents']) assert.ok(!JSON.stringify((await read())!.config).includes(value));
    for (const material of [...published.config.artworks, ...published.config.stickers]) {
      const result = await object(`private/campaigns/${id}/assets/${material.id}.png`);
      assert.equal(result.type, 'image/png'); assert.ok(result.bytes.equals(bytes));
    }
    const access = async (suspended: boolean) => setCampaignSuspended(id, suspended, 'access-admin', (await campaign()).updatedAt.toISOString());
    await assert.rejects(() => setCampaignSuspended(id, true, 'stale-admin', '2000-01-01T00:00:00.000Z'), status(409));
    writes.length = 0;
    await access(true); const suspended = await campaign();
    await access(true);
    assert.deepEqual((await campaign()).suspendedAt, suspended.suspendedAt);
    assert.equal((await read())!.suspended, true); assert.equal(writes.length, 0, 'Access is DB-only');
    const configV2 = { ...(await editor()).config, artworks: [await addAsset(id)], stickers: [] };
    writes.length = 0; // Upload is outside the publication write gate.
    await db.update(s.campaignEditor).set({ revision: 8, config: configV2 }).where(eq(s.campaignEditor.campaignId, id));
    const priorRead = await read(), priorCampaign = await campaign();
    assert.equal(priorRead!.version, 1, 'Draft save cannot publish');
    observations.length = 0; rejectImages = true;
    await assert.rejects(() => publishCampaign(id, 8, 'update-admin'));
    assert.deepEqual(await current(), published); assert.deepEqual(await history(), []);
    assert.deepEqual(await campaign(), priorCampaign); assert.deepEqual(await read(), priorRead);
    assert.ok(observations.length > 0); observations.forEach(value => assert.deepEqual(value, priorRead));
    assert.equal(writes.length, 0, 'Failed publication performs no PUT');
    rejectImages = false; observations.length = 0;
    const v2 = await publishCampaign(id, 8, 'update-admin');
    assert.equal(v2.version, 2); assert.equal((await read())!.suspended, true);
    assert.ok(observations.length > 0); observations.forEach(value => assert.deepEqual(value, priorRead));
    assert.equal(writes.length, 0, 'Updated publication performs no PUT');
    assert.deepEqual((await campaign()).suspendedAt, suspended.suspendedAt);
    assert.deepEqual((await history())[0].config, published.config);
    assert.deepEqual((await history())[0].authorizedAt, published.createdAt);
    writes.length = 0;
    assert.deepEqual(await publishCampaign(id, 8, 'other-admin'), v2); assert.equal(writes.length, 0);
    await access(false); assert.equal((await read())!.suspended, false);
    assert.deepEqual(await current(), v2);
    // Concurrent identical requests allocate exactly one integer/version.
    const configV3 = { ...configV2, name: configV2.name, artworks: [{ ...configV2.artworks[0], name: 'Concurrent v3' }] };
    await db.update(s.campaignEditor).set({ revision: 9, config: configV3 }).where(eq(s.campaignEditor.campaignId, id));
    const concurrent = await Promise.all(Array.from({ length: 6 }, () => publishCampaign(id, 9, 'concurrent-admin')));
    concurrent.forEach(value => assert.deepEqual(value, concurrent[0]));
    assert.equal(concurrent[0].version, 3); assert.deepEqual((await history()).map(row => row.version).sort(), [1, 2]);
    // Rollback keeps authorship and draft, suspension survives; next N uses max history.
    await access(true);
    const draftBeforeRollback = await editor();
    const rollback = async (target = 1) => publishHistoricalVersion(id, (await editor()).revision, 'rollback-admin', (await campaign()).updatedAt.toISOString(), (await current()).version, target);
    await assert.rejects(() => rollback(999), status(404));
    await assert.rejects(() => publishHistoricalVersion(id, 8, 'admin', (new Date()).toISOString(), 3, 1), status(409));
    const rolledBack = await rollback();
    assert.equal(rolledBack.version, 1); assert.equal(rolledBack.publishedBy, published.publishedBy);
    assert.deepEqual(rolledBack.createdAt, published.createdAt); assert.deepEqual(await editor(), draftBeforeRollback);
    assert.deepEqual(await read(), { config: published.config, version: 1, suspended: true });
    const beforeRestore = await read(), rowsBeforeRestore = await history(), financeBeforeRestore = await financialState();
    assert.equal(writes.length, 0, 'Concurrent and historical publication perform no PUT');
    writes.length = 0;
    await assert.rejects(() => restorePublishedDraft(id, 8, (new Date()).toISOString(), 1, 2), status(409));
    await restorePublishedDraft(id, 9, (await campaign()).updatedAt.toISOString(), 1, 2);
    assert.equal((await editor()).revision, 10); assert.deepEqual((await editor()).config, configV2);
    assert.deepEqual(await read(), beforeRestore); assert.deepEqual(await history(), rowsBeforeRestore);
    assert.deepEqual(await financialState(), financeBeforeRestore); assert.equal(writes.length, 0);
    const v4 = await publishCampaign(id, 10, 'next-admin'); assert.equal(v4.version, 4);
    assert.deepEqual((await history()).map(row => row.version).sort(), [1, 2, 3]);
    // Reactivation validates delivered snapshot, not a future private draft.
    await db.update(s.campaignPublications).set({ config: { ...v4.config, endsAt: '2000-01-01T00:00:00Z' } }).where(eq(s.campaignPublications.campaignId, id));
    await assert.rejects(() => access(false), status(422)); await access(true);
    await db.update(s.campaignPublications).set({ config: v4.config }).where(eq(s.campaignPublications.campaignId, id));
    await access(false);
    // A failed first shared-object HEAD creates neither current nor pending publication.
    inspectSlug = (await campaign(failureId)).slug; rejectImages = true; observations.length = 0;
    await assert.rejects(() => publishCampaign(failureId, 7, 'failure-admin'));
    assert.equal(await current(failureId), undefined); assert.deepEqual(await history(failureId), []);
    assert.equal(await readPublishedCampaign(inspectSlug), null); assert.equal((await campaign(failureId)).publicationStatus, 'unpublished');
    assert.ok(observations.length > 0); observations.forEach(value => assert.equal(value, null));
    assert.equal(writes.length, 0, 'First publication failure performs no PUT');
    rejectImages = false;
    // Legacy pending rows remain supported, with explicit frozen retry. Seed the
    // pre-migration state, rather than expecting new atomic publishes to create it.
    const frozenDraft = (await editor(failureId)).config;
    const frozen = publicationArtifacts(frozenDraft).event;
    const authorizedAt = new Date('2026-01-01T00:00:00Z');
    await db.insert(s.campaignPublications).values({ campaignId: failureId, version: 1, config: frozen, editorRevision: 7, publishedBy: 'original-admin', createdAt: authorizedAt, deliveredAt: null });
    await db.update(s.campaigns).set({ publicationStatus: 'published' }).where(eq(s.campaigns.id, failureId));
    await db.update(s.campaignEditor).set({ revision: 8, config: { ...frozenDraft, artworks: [] } }).where(eq(s.campaignEditor.campaignId, failureId));
    assert.equal(await readPublishedCampaign(inspectSlug), null);
    await assert.rejects(() => setCampaignSuspended(failureId, true, 'admin', (new Date()).toISOString()), status(409));
    const retried = await publishCampaign(failureId, 8, 'different-admin');
    assert.equal(retried.editorRevision, 7); assert.equal(retried.publishedBy, 'original-admin');
    assert.deepEqual(retried.createdAt, authorizedAt); assert.deepEqual(retried.config, frozen); assert.ok(retried.deliveredAt);
    assert.deepEqual((await readPublishedCampaign(inspectSlug))!.config, frozen);
    // Pending legacy fallback follows last effective delivery after rollback,
    // not the highest historical version. Retry never adopts the newer draft.
    const lastPublic = await current();
    const [lowHistory] = (await history()).filter(row => row.version === 1);
    await db.update(s.campaignPublicationHistory).set({ deliveredAt: new Date(Date.now() + 1000) }).where(eq(s.campaignPublicationHistory.id, lowHistory.id));
    await db.update(s.campaignPublications).set({ deliveredAt: null }).where(eq(s.campaignPublications.campaignId, id));
    assert.equal((await read())!.version, 1);
    await db.update(s.campaignPublications).set({ deliveredAt: lastPublic.deliveredAt }).where(eq(s.campaignPublications.campaignId, id));
    assert.deepEqual(await financialState(), beforeFinance);
    // Existing payment and receipt are neither consulted nor mutated by publish.
    const [payment] = await db.insert(s.payments).values({ campaignId: paidId, externalId: randomUUID(), paymentId: randomUUID(), amountCents: 1000, status: 'paid', paidAt: new Date() }).returning();
    await db.insert(s.webhookReceipts).values({ paymentId: payment.paymentId, eventId: randomUUID() });
    const paidBefore = await financialState(); inspectSlug = undefined;
    await publishCampaign(paidId, 7, 'paid-admin'); assert.deepEqual(await financialState(), paidBefore);
    assert.equal(await readPublishedCampaign('missing-campaign'), null);
    assert.equal(await readPublishedCampaign('../private'), null);
    const objects = await client.send(new ListObjectsV2Command({ Bucket }));
    assert.equal(objects.KeyCount, keys.size, 'Publication creates no duplicate objects');
    assert.ok(objects.Contents?.length); assert.ok(objects.Contents!.every(item => keys.has(item.Key!)), 'Only canonical private PNGs exist');
    assert.equal(writes.length, 0, 'Publication, frozen retry and access perform no PUT');
    console.log('PASS publication DB: atomic first/update publish; HEAD failure retains current/history/access; draft independence; concurrent idempotency; payment independence; shared private PNGs without publication PUT');
    console.log('PASS history/access: rollback/authorship, max-history numbering, historical draft restore, suspension/expiry/stale gates, legacy pending fallback and frozen retry; real DB public reader');
  } finally {
    rejectImages = false; inspectSlug = undefined;
    try {
      if (ownsFixtures) {
        for (const Key of keys) await client.send(new DeleteObjectCommand({ Bucket, Key }));
        await db.delete(s.webhookReceipts).where(inArray(s.webhookReceipts.paymentId, (await db.select().from(s.payments)).map(row => row.paymentId)));
        await db.delete(s.payments).where(inArray(s.payments.campaignId, ids));
        await db.delete(s.campaignPublicationHistory).where(inArray(s.campaignPublicationHistory.campaignId, ids));
        await db.delete(s.campaignPublications).where(inArray(s.campaignPublications.campaignId, ids));
        await db.delete(s.campaigns).where(inArray(s.campaigns.id, ids));
        const residual = await pool.query('SELECT (SELECT count(*) FROM campaigns)::int + (SELECT count(*) FROM campaign_publications)::int + (SELECT count(*) FROM campaign_publication_history)::int + (SELECT count(*) FROM payments)::int + (SELECT count(*) FROM campaign_assets)::int + (SELECT count(*) FROM campaign_editor)::int + (SELECT count(*) FROM webhook_receipts)::int AS total');
        assert.equal(residual.rows[0].total, 0);
        assert.equal((await client.send(new ListObjectsV2Command({ Bucket }))).KeyCount, 0);
        console.log('PASS cleanup: owned DB fixtures/objects removed; dedicated bucket empty');
      }
    } finally {
      process.env.S3_ENDPOINT = endpoint.href; client.destroy();
      await new Promise<void>(resolve => proxy.close(() => resolve())); await pool.end();
      hooks.deregister(); rmSync(markerDirectory, { recursive: true, force: true });
    }
  }
}
main().catch((error: unknown) => {
  if (error instanceof Error && !/postgres|secret|token|http/i.test(error.message)) console.error(error.message);
  const location = error instanceof Error ? error.stack?.match(/(?:test-publication|campaign-publication|published-campaign)\.ts:\d+:\d+/)?.[0] : undefined;
  console.error('FAIL publication integration', error instanceof Error ? error.name : 'UnknownError', location ?? '(details suppressed for privacy)'); process.exitCode = 1;
});
