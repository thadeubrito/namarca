// Container-only, exclusive tmpfs DB and local S3. Public host MUST run in a separate
// container on a storage-only network, without app/DB connectivity or credentials.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createServer, request as httpRequest } from 'node:http';
import { eq, inArray } from 'drizzle-orm';
import { PNG } from 'pngjs';
import { S3Client, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

async function main() {
  assert.ok(existsSync('/.dockerenv'), 'Container required');
  const url = new URL(process.env.DATABASE_URL ?? '');
  assert.match(url.pathname, /^\/[a-z0-9_]+_publication_test$/);
  assert.equal(url.hostname, 'publication-test-db');
  assert.equal(process.env.PUBLICATION_TEST_DISPOSABLE, 'true');
  assert.equal(process.env.PIXGO_MODE, 'mock');
  const endpoint = new URL(process.env.S3_ENDPOINT ?? '');
  assert.equal(endpoint.hostname, 'publication-test-s3');
  assert.equal(process.env.S3_BUCKET, 'publication-test');
  const publicUrl = process.env.PUBLICATION_TEST_PUBLIC_URL ?? '';
  assert.equal(new URL(publicUrl).hostname, 'publication-test-public');
  const client = new S3Client({ endpoint: endpoint.href, region: 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } });
  const Bucket = process.env.S3_BUCKET!;
  const { db, pool } = await import('../apps/admin/src/db');
  const s = await import('../apps/admin/src/db/schema');
  const { publishCampaign, publishHistoricalVersion, setCampaignSuspended } = await import('../apps/admin/src/lib/campaign-publication');
  const { CampaignEditorError, defaultCampaignConfig } = await import('../apps/admin/src/lib/campaign-editor');
  const { putPrivateObject, putPublicObject } = await import('../apps/admin/src/lib/storage');
  const { publicationArtifacts } = await import('../apps/admin/src/lib/publication-artifacts');
  const ids = Array.from({ length: 6 }, () => randomUUID());
  const [publishedId, emptyId, expiredId, staleId, draftId, failureId] = ids;
  const keys = new Set<string>();
  const receiptEventId = randomUUID();
  let ownsFixtures = false;
  let rejectManifest = false;
  let failureCampaignId = failureId;
  let inspectManifestKey: string | undefined;
  const beforeManifestWrites: unknown[] = [];
  const writes: string[] = [];
  let committedBeforeManifest = false;
  // Real S3 transport with deterministic manifest failure, no production hooks.
  const proxy = createServer(async (req, res) => {
    const path = req.url ?? '';
    const pathname = path.split('?')[0];
    if (req.method === 'PUT') writes.push(decodeURIComponent(pathname));
    if (req.method === 'PUT' && pathname.endsWith('/campaign.json')) {
      if (inspectManifestKey) {
        const previous = await client.send(new GetObjectCommand({ Bucket, Key: inspectManifestKey }));
        beforeManifestWrites.push(JSON.parse(await previous.Body!.transformToString()));
      }
      const rows = await db.select().from(s.campaignPublications).where(eq(s.campaignPublications.campaignId, failureCampaignId));
      if (rejectManifest) {
        committedBeforeManifest = rows.length === 1 && rows[0].deliveredAt === null;
        req.resume(); res.writeHead(503, { 'Content-Type': 'application/xml' }); res.end('<Error><Code>ServiceUnavailable</Code></Error>'); return;
      }
    }
    const upstream = httpRequest(new URL(path, endpoint), { method: req.method, headers: req.headers }, response => { res.writeHead(response.statusCode!, response.headers); response.pipe(res); });
    upstream.on('error', () => { res.writeHead(502); res.end(); });
    req.pipe(upstream);
  });
  await new Promise<void>(resolve => proxy.listen(0, '127.0.0.1', resolve));
  const address = proxy.address(); assert.ok(address && typeof address !== 'string');
  process.env.S3_ENDPOINT = `http://127.0.0.1:${address.port}`;
  const financialState = async () => ({ links: await db.select().from(s.checkoutLinks), attempts: await db.select().from(s.checkoutAttempts), events: await db.select().from(s.checkoutAttemptEvents), payments: await db.select().from(s.payments), receipts: await db.select().from(s.webhookReceipts), tasks: await db.select().from(s.publicationTasks) });
  const object = async (Key: string) => { const result = await client.send(new GetObjectCommand({ Bucket, Key })); return { bytes: Buffer.from(await result.Body!.transformToByteArray()), type: result.ContentType }; };
  const missing = async (Key: string) => assert.rejects(() => object(Key), (e: unknown) => (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404);
  const get = (path: string) => fetch(`${publicUrl}${path}`);
  try {
    const occupied = await pool.query('SELECT EXISTS (SELECT 1 FROM campaigns) OR EXISTS (SELECT 1 FROM clients) OR EXISTS (SELECT 1 FROM auth_user) AS occupied');
    assert.equal(occupied.rows[0].occupied, false);
    assert.equal((await client.send(new ListObjectsV2Command({ Bucket }))).KeyCount, 0, 'Dedicated bucket must be empty');
    assert.equal((await pool.query("SELECT data_type FROM information_schema.columns WHERE table_name='campaign_publications' AND column_name='version'")).rows[0]?.data_type, 'integer', 'schema0014 applied');
    assert.equal((await pool.query("SELECT data_type FROM information_schema.columns WHERE table_name='campaign_publication_history' AND column_name='version'")).rows[0]?.data_type, 'integer');
    const migrated = await pool.query("SELECT is_nullable FROM information_schema.columns WHERE table_name='campaign_publications' AND column_name='delivered_at'");
    assert.equal(migrated.rows[0]?.is_nullable, 'YES', 'schema0011 applied');
    assert.ok((await pool.query("SELECT to_regclass('public.campaign_publication_history') AS history")).rows[0].history, 'schema0012 applied');
    assert.equal((await pool.query("SELECT is_nullable FROM information_schema.columns WHERE table_name='campaign_publication_history' AND column_name='authorized_at'")).rows[0]?.is_nullable, 'NO', 'schema0013 applied');
    ownsFixtures = true;
    const png = new PNG({ width: 2, height: 2 }); png.data.fill(255); png.data[3] = 0;
    const bytes = PNG.sync.write(png);
    const fixtures = [];
    for (const id of ids) {
      const identity = { name: `Public fixture ${id}`, slug: `publication-${id}`, endsAt: new Date(id === expiredId ? '2000-01-01' : '2099-01-01') };
      const asset = randomUUID(), sticker = randomUUID(), outside = randomUUID();
      const config = { ...defaultCampaignConfig(identity), artworks: id === emptyId ? [] : [{ id: asset, name: 'Synthetic artwork', file: `${asset}.png`, width: 2, height: 2, reference: { x: 0, y: 0, width: 2, height: 2 } }], stickers: [{ id: sticker, name: 'Synthetic sticker', file: `${sticker}.png` }] };
      await db.insert(s.campaigns).values({ id, ...identity, notes: 'PRIVATE-NOTES-FIXTURE', contact: 'PRIVATE-CONTACT-FIXTURE', organizer: 'PRIVATE-ORGANIZER-FIXTURE' });
      await db.insert(s.campaignEditor).values({ campaignId: id, revision: 7, config });
      const artifacts = publicationArtifacts(config.artworks.length ? config : { ...config, artworks: [{ id: asset, name: 'Placeholder for rejected fixture key only', file: `${asset}.png`, width: 2, height: 2, reference: { x: 0, y: 0, width: 2, height: 2 } }] });
      keys.add(artifacts.manifestKey);
      keys.add(artifacts.versionKey);
      for (const material of [...config.artworks, ...config.stickers]) keys.add(artifacts.assetKey(material.id));
      for (const [materialId, kind] of [[asset, 'artwork'], [sticker, 'sticker'], [outside, 'artwork']] as const) {
        const key = `private/campaigns/${id}/assets/${materialId}.png`; keys.add(key);
        await db.insert(s.campaignAssets).values({ id: materialId, campaignId: id, key, width: 2, height: 2, kind });
        await putPrivateObject(key, bytes, 'image/png');
      }
      fixtures.push({ id, identity, config, artifacts, asset, sticker, outside });
    }
    const before = await financialState();
    assert.ok(Object.values(before).every(rows => rows.length === 0), 'No payment prerequisite');
    for (const [id, revision, status] of [[emptyId, 7, 422], [expiredId, 7, 422], [staleId, 6, 409]] as const) {
      await assert.rejects(() => publishCampaign(id, revision, 'fixture-admin'), (e: unknown) => e instanceof CampaignEditorError && e.status === status);
      assert.equal((await db.select().from(s.campaignPublications).where(eq(s.campaignPublications.campaignId, id))).length, 0);
      assert.equal((await db.select().from(s.campaigns).where(eq(s.campaigns.id, id)))[0].publicationStatus, 'unpublished');
      await missing(fixtures.find(f => f.id === id)!.artifacts.manifestKey);
    }
    const fixture = fixtures[0];
    const [prior] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, publishedId));
    await assert.rejects(() => publishCampaign(publishedId, 7, 'fixture-admin', new Date(prior.updatedAt.getTime() - 1000).toISOString()), (e: unknown) => e instanceof CampaignEditorError && e.status === 409);
    assert.deepEqual(await db.select().from(s.campaigns).where(eq(s.campaigns.id, publishedId)), [prior]);
    writes.length = 0;
    const started = Date.now();
    const published = await publishCampaign(publishedId, 7, 'fixture-admin', prior.updatedAt.toISOString());
    assert.equal(published.editorRevision, 7); assert.equal(published.publishedBy, 'fixture-admin');
    assert.ok(published.createdAt.getTime() >= started - 1000);
    assert.ok(published.deliveredAt && published.deliveredAt >= published.createdAt);
    assert.deepEqual(published.config, fixture.artifacts.event);
    assert.equal(published.version, 1);
    assert.equal(writes.length, 4); assert.ok(writes[3].endsWith('/campaign.json')); assert.ok(writes[2].endsWith('/versions/v1.json'));
    assert.ok(writes.slice(0, 2).every(key => /\/(artworks|stickers)\//.test(key)));
    const [campaign] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, publishedId));
    assert.equal(campaign.publicationStatus, 'published'); assert.equal(campaign.preparationStatus, 'draft'); assert.equal(campaign.priceCents, null);
    assert.deepEqual(await publishCampaign(publishedId, 7, 'other-fixture-admin'), published);
    const stored = await object(fixture.artifacts.manifestKey);
    assert.equal(stored.type, 'application/json'); assert.deepEqual(JSON.parse(stored.bytes.toString()), { version: 1 });
    const versionV1 = await object(fixture.artifacts.versionKey);
    assert.deepEqual(JSON.parse(versionV1.bytes.toString()), published.config);
    const { parseCampaign } = await import('@namarca/editor/campaigns');
    assert.deepEqual(parseCampaign(JSON.parse(versionV1.bytes.toString()), fixture.identity.slug), published.config);
    assert.deepEqual(Object.keys(published.config).sort(), Object.keys(fixture.config).sort());
    for (const privateValue of ['PRIVATE-', 'fixture-admin', 'private/campaigns/', 'publishedBy', 'deliveredAt', 'priceCents', 'checkoutId', 'paymentId', 'Changed private draft']) assert.ok(!versionV1.bytes.toString().includes(privateValue));
    for (const material of [...published.config.artworks, ...published.config.stickers]) {
      assert.match(material.file, /^(artworks|stickers)\/[a-f0-9-]{36}\.png$/);
      const result = await object(`public/campaigns/${fixture.identity.slug}/${material.file}`); assert.equal(result.type, 'image/png'); assert.ok(result.bytes.equals(bytes));
    }
    // Availability is independent from publication; storage failure leaves DB intact.
    const campaignState = async () => (await db.select().from(s.campaigns).where(eq(s.campaigns.id, publishedId)))[0];
    const access = async (suspended: boolean, actor = 'access-fixture-admin') => setCampaignSuspended(publishedId, suspended, actor, (await campaignState()).updatedAt.toISOString());
    await assert.rejects(() => setCampaignSuspended(publishedId, true, 'stale-admin', new Date(prior.updatedAt.getTime() - 1).toISOString()), (e: unknown) => e instanceof CampaignEditorError && e.status === 409);
    rejectManifest = true;
    const beforeAccessFailure = await campaignState();
    await assert.rejects(() => access(true));
    assert.deepEqual(await campaignState(), beforeAccessFailure);
    assert.deepEqual(JSON.parse((await object(fixture.artifacts.manifestKey)).bytes.toString()), { version: 1 });
    rejectManifest = false;
    await access(true);
    const suspendedV1 = await campaignState();
    assert.ok(suspendedV1.suspendedAt); assert.equal(suspendedV1.suspendedBy, 'access-fixture-admin');
    assert.equal(suspendedV1.publicationStatus, 'published'); assert.ok(suspendedV1.updatedAt > beforeAccessFailure.updatedAt);
    assert.deepEqual(JSON.parse((await object(fixture.artifacts.manifestKey)).bytes.toString()), { version: 1, suspended: true });
    // Repeating the intention always repairs the pointer, even if DB already matches.
    await putPublicObject(fixture.artifacts.manifestKey, Buffer.from(JSON.stringify({ version: 1 })), 'application/json');
    await access(true, 'repair-fixture-admin');
    assert.deepEqual((await campaignState()).suspendedAt, suspendedV1.suspendedAt);
    assert.deepEqual(JSON.parse((await object(fixture.artifacts.manifestKey)).bytes.toString()), { version: 1, suspended: true });
    // Simulate editor saves directly: private v2 cannot replace delivered v1 by itself.
    const configV2 = { ...fixture.config, artworks: [{ ...fixture.config.artworks[0], name: 'Artwork v2', reference: { x: 0, y: 0, width: 1, height: 2 } }], stickers: [] };
    const artifactsV2 = publicationArtifacts(configV2, 2);
    keys.add(artifactsV2.manifestKey); keys.add(artifactsV2.versionKey);
    for (const material of [...configV2.artworks, ...configV2.stickers]) keys.add(artifactsV2.assetKey(material.id));
    await db.update(s.campaignEditor).set({ revision: 8, config: configV2 }).where(eq(s.campaignEditor.campaignId, publishedId));
    assert.deepEqual(await (await get(`/campaigns/${fixture.identity.slug}/campaign.json`)).json(), { version: 1, suspended: true });
    inspectManifestKey = fixture.artifacts.manifestKey;
    beforeManifestWrites.length = 0; writes.length = 0;
    const updated = await publishCampaign(publishedId, 8, 'update-fixture-admin');
    assert.equal(updated.editorRevision, 8); assert.equal(updated.publishedBy, 'update-fixture-admin'); assert.ok(updated.deliveredAt);
    assert.deepEqual(updated.config, artifactsV2.event);
    assert.equal(updated.version, 2);
    assert.deepEqual(beforeManifestWrites, [{ version: 1, suspended: true }], 'Suspended v1 survives until final pointer PUT');
    assert.ok((await object(fixture.artifacts.versionKey)).bytes.equals(versionV1.bytes), 'v1 JSON remains immutable');
    const versionV2 = await object(artifactsV2.versionKey);
    assert.deepEqual(JSON.parse(versionV2.bytes.toString()), updated.config);
    assert.ok(writes.at(-1)?.endsWith('/campaign.json')); assert.ok(writes.at(-2)?.endsWith('/versions/v2.json'));
    assert.deepEqual(await (await get(`/campaigns/${fixture.identity.slug}/campaign.json`)).json(), { version: 2, suspended: true });
    assert.deepEqual((await campaignState()).suspendedAt, suspendedV1.suspendedAt);
    const beforeReactivation = await campaignState();
    rejectManifest = true;
    await assert.rejects(() => access(false));
    assert.deepEqual(await campaignState(), beforeReactivation);
    rejectManifest = false;
    await access(false, 'reactivate-fixture-admin');
    assert.equal((await campaignState()).suspendedAt, null);
    assert.equal((await campaignState()).suspendedBy, 'reactivate-fixture-admin');
    assert.deepEqual(await (await get(`/campaigns/${fixture.identity.slug}/campaign.json`)).json(), { version: 2 });
    assert.deepEqual((await db.select().from(s.campaignPublications).where(eq(s.campaignPublications.campaignId, publishedId)))[0], updated, 'Access never creates or changes versions');
    writes.length = 0;
    assert.deepEqual(await publishCampaign(publishedId, 8, 'other-fixture-admin'), updated);
    assert.equal(writes.length, 0, 'Same delivered config/revision is idempotent');
    for (const material of [...published.config.artworks, ...published.config.stickers]) {
      assert.ok((await object(`public/campaigns/${fixture.identity.slug}/${material.file}`)).bytes.equals(bytes), 'v1 assets retained after v2');
      assert.equal((await get(`/campaigns/${fixture.identity.slug}/${material.file}`)).status, 200);
    }
    const configV3 = { ...configV2, artworks: [{ ...configV2.artworks[0], name: 'Artwork v3' }] };
    const artifactsV3 = publicationArtifacts(configV3, 3);
    keys.add(artifactsV3.versionKey);
    for (const material of [...configV3.artworks, ...configV3.stickers]) keys.add(artifactsV3.assetKey(material.id));
    await db.update(s.campaignEditor).set({ revision: 9, config: configV3 }).where(eq(s.campaignEditor.campaignId, publishedId));
    failureCampaignId = publishedId; rejectManifest = true; beforeManifestWrites.length = 0;
    await assert.rejects(() => publishCampaign(publishedId, 9, 'v3-fixture-admin'));
    assert.ok(committedBeforeManifest);
    const [pendingV3] = await db.select().from(s.campaignPublications).where(eq(s.campaignPublications.campaignId, publishedId));
    assert.equal(pendingV3.editorRevision, 9); assert.equal(pendingV3.deliveredAt, null); assert.deepEqual(pendingV3.config, artifactsV3.event);
    assert.ok(beforeManifestWrites.length > 0); for (const value of beforeManifestWrites) assert.deepEqual(value, { version: 2 });
    assert.equal(pendingV3.version, 3);
    const beforePendingAccess = await campaignState();
    await assert.rejects(() => access(true), (e: unknown) => e instanceof CampaignEditorError && e.status === 409);
    assert.deepEqual(await campaignState(), beforePendingAccess);
    assert.deepEqual(await (await get(`/campaigns/${fixture.identity.slug}/campaign.json`)).json(), { version: 2 }, 'Failed v3 leaves public v2 intact');
    const pendingVersionBytes = (await object(artifactsV3.versionKey)).bytes;
    // Even an externally changed draft cannot replace the pending frozen delivery.
    await db.update(s.campaignEditor).set({ revision: 10, config: { ...configV3, stickers: fixture.config.stickers } }).where(eq(s.campaignEditor.campaignId, publishedId));
    rejectManifest = false;
    const deliveredV3 = await publishCampaign(publishedId, 10, 'retry-fixture-admin');
    assert.equal(deliveredV3.editorRevision, 9); assert.equal(deliveredV3.publishedBy, pendingV3.publishedBy);
    assert.deepEqual(deliveredV3.createdAt, pendingV3.createdAt); assert.deepEqual(deliveredV3.config, pendingV3.config); assert.ok(deliveredV3.deliveredAt);
    assert.equal(deliveredV3.version, 3);
    assert.deepEqual(await (await get(`/campaigns/${fixture.identity.slug}/campaign.json`)).json(), { version: 3 });
    assert.ok((await object(artifactsV3.versionKey)).bytes.equals(pendingVersionBytes), 'Retry does not change frozen JSON');
    assert.ok((await object(artifactsV2.versionKey)).bytes.equals(versionV2.bytes));
    assert.ok((await object(fixture.artifacts.versionKey)).bytes.equals(versionV1.bytes));
    const history = await db.select().from(s.campaignPublicationHistory).where(eq(s.campaignPublicationHistory.campaignId, publishedId));
    assert.deepEqual(history.map(row => row.version).sort((a, b) => a - b), [1, 2]);
    assert.deepEqual(history.find(row => row.editorRevision === 7)?.config, published.config);
    assert.deepEqual(history.find(row => row.editorRevision === 8)?.config, updated.config);
    assert.deepEqual(history.find(row => row.editorRevision === 7)?.authorizedAt, published.createdAt, 'v1 authorization timestamp retained');
    assert.deepEqual(history.find(row => row.editorRevision === 8)?.authorizedAt, updated.createdAt, 'v2 authorization timestamp retained');
    // Reactivation checks delivered snapshot expiry, not the future private draft.
    await access(true);
    await db.update(s.campaignPublications).set({ config: { ...deliveredV3.config, endsAt: '2000-01-01T00:00:00Z' } }).where(eq(s.campaignPublications.campaignId, publishedId));
    const expiredAccessState = await campaignState();
    await assert.rejects(() => access(false), (e: unknown) => e instanceof CampaignEditorError && e.status === 422);
    assert.deepEqual(await campaignState(), expiredAccessState);
    assert.deepEqual(JSON.parse((await object(artifactsV3.manifestKey)).bytes.toString()), { version: 3, suspended: true });
    await access(true); // Suspension remains possible even after expiry.
    await db.update(s.campaignPublications).set({ config: deliveredV3.config }).where(eq(s.campaignPublications.campaignId, publishedId));
    await access(false);
    inspectManifestKey = undefined; failureCampaignId = failureId;
    assert.deepEqual(await financialState(), before);
    // A manifest failure leaves a recoverable frozen DB snapshot, not delivery.
    rejectManifest = true; writes.length = 0;
    await assert.rejects(() => publishCampaign(failureId, 7, 'failure-fixture-admin'));
    assert.ok(committedBeforeManifest);
    const [failed] = await db.select().from(s.campaignPublications).where(eq(s.campaignPublications.campaignId, failureId));
    assert.equal(failed.deliveredAt, null); assert.equal(failed.editorRevision, 7);
    assert.ok(writes[0].includes('/artworks/') && writes[1].includes('/stickers/') && writes[2].endsWith('/versions/v1.json') && writes.slice(3).every(key => key.endsWith('/campaign.json')));
    await missing(fixtures[5].artifacts.manifestKey);
    assert.equal((await get(`/campaigns/${fixtures[5].identity.slug}/campaign.json`)).status, 404);
    rejectManifest = false;
    const retried = await publishCampaign(failureId, 7, 'different-admin');
    assert.equal(retried.publishedBy, failed.publishedBy); assert.deepEqual(retried.createdAt, failed.createdAt); assert.deepEqual(retried.config, failed.config); assert.ok(retried.deliveredAt);
    // Concurrent identical intentions allocate a single next integer, not one per request.
    const concurrentConfig = { ...fixtures[5].config, artworks: fixtures[5].config.artworks.map(item => ({ ...item, name: 'Concurrent v2' })) };
    await db.update(s.campaignEditor).set({ revision: 8, config: concurrentConfig }).where(eq(s.campaignEditor.campaignId, failureId));
    const concurrentArtifacts = publicationArtifacts(concurrentConfig, 2); keys.add(concurrentArtifacts.versionKey);
    const concurrent = await Promise.all(Array.from({ length: 6 }, () => publishCampaign(failureId, 8, 'concurrent-admin')));
    for (const result of concurrent) { assert.equal(result.version, 2); assert.deepEqual(result, concurrent[0]); }
    assert.deepEqual(JSON.parse((await object(concurrentArtifacts.manifestKey)).bytes.toString()), { version: 2 });
    const concurrentHistory = await db.select().from(s.campaignPublicationHistory).where(eq(s.campaignPublicationHistory.campaignId, failureId));
    assert.deepEqual(concurrentHistory.map(row => row.version), [1]);
    await missing(`public/campaigns/${fixtures[5].identity.slug}/versions/v3.json`);
    // Previously delivered full manifests and hash releases remain readable without migration.
    const legacy = fixtures[4];
    const legacyFile = `releases/${legacy.artifacts.revision}/${legacy.asset}.png`;
    const legacyConfig = { ...legacy.config, artworks: [{ ...legacy.config.artworks[0], file: legacyFile }], stickers: [] };
    const legacyKey = `public/campaigns/${legacy.identity.slug}/${legacyFile}`; keys.add(legacyKey);
    await putPublicObject(legacyKey, bytes, 'image/png');
    await putPublicObject(legacy.artifacts.manifestKey, Buffer.from(JSON.stringify(legacyConfig)), 'application/json');
    assert.deepEqual(await (await get(`/campaigns/${legacy.identity.slug}/campaign.json`)).json(), legacyConfig);
    const legacyResponse = await get(`/campaigns/${legacy.identity.slug}/${legacyFile}`);
    assert.equal(legacyResponse.status, 200); assert.ok(Buffer.from(await legacyResponse.arrayBuffer()).equals(bytes));
    assert.deepEqual(parseCampaign(legacyConfig, legacy.identity.slug), legacyConfig);
    const [payment] = await db.insert(s.payments).values({ campaignId: draftId, externalId: randomUUID(), paymentId: randomUUID(), amountCents: 1000, status: 'paid', paidAt: new Date() }).returning();
    await db.insert(s.webhookReceipts).values({ paymentId: payment.paymentId, eventId: receiptEventId });
    const paidBefore = await financialState(); await publishCampaign(draftId, 7, 'fixture-admin');
    // These HTTP requests go to the independent S3-only container (no app or DB network).
    for (const path of ['/', `/${fixture.identity.slug}`, '/campaign-runtime/index.html']) { const response = await get(path); assert.equal(response.status, 200); assert.ok(response.headers.get('content-type')?.includes('text/html')); }
    const manifest = await get(`/campaigns/${fixture.identity.slug}/campaign.json`);
    assert.equal(manifest.status, 200); assert.equal(manifest.headers.get('cache-control'), 'no-store'); assert.equal(manifest.headers.get('x-content-type-options'), 'nosniff'); assert.deepEqual(await manifest.json(), { version: 3 });
    const full = await get(`/campaigns/${fixture.identity.slug}/versions/v3.json`);
    assert.equal(full.status, 200); assert.equal(full.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.deepEqual(await full.json(), deliveredV3.config);
    for (const material of [...published.config.artworks, ...published.config.stickers]) { const response = await get(`/campaigns/${fixture.identity.slug}/${material.file}`); assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/png'); assert.ok(Buffer.from(await response.arrayBuffer()).equals(bytes)); }
    for (const path of [`/campaigns/${fixtures[1].identity.slug}/campaign.json`, `/campaigns/${fixture.identity.slug}/${fixture.outside}.png`, `/campaigns/${fixture.identity.slug}/artworks/${fixture.outside}.png`, `/campaigns/${fixture.identity.slug}/versions/v0.json`, '/private/campaigns/anything', '/admin', '/api', '/campaign-runtime/%2e%2e/package.json']) assert.equal((await get(path)).status, 404);
    assert.deepEqual(await financialState(), paidBefore);
    const { restorePublishedDraft } = await import('../apps/admin/src/lib/publication-restore');
    const restoreId = draftId;
    const [restorePublication] = await db.select().from(s.campaignPublications).where(eq(s.campaignPublications.campaignId, restoreId));
    const restoreHistory = await db.select().from(s.campaignPublicationHistory);
    const restoreFinancial = await financialState();
    const storageBefore = await Promise.all([...keys].map(async key => { try { return [key, (await object(key)).bytes.toString('base64')]; } catch { return [key, null]; } }));
    await db.update(s.campaigns).set({ name: 'Unpublished name', endsAt: new Date('2098-01-01'), notes: 'Keep notes', priceCents: 4567, suspendedAt: new Date('2026-01-01'), suspendedBy: 'fixture-admin' }).where(eq(s.campaigns.id, restoreId));
    await db.update(s.campaignEditor).set({ config: { ...fixtures[4].config, artworks: [], stickers: [] } }).where(eq(s.campaignEditor.campaignId, restoreId));
    const [restoreBefore] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, restoreId));
    await assert.rejects(() => restorePublishedDraft(restoreId, 6, restoreBefore.updatedAt.toISOString(), restorePublication.version), CampaignEditorError);
    await assert.rejects(() => restorePublishedDraft(restoreId, 7, restoreBefore.updatedAt.toISOString(), restorePublication.version + 1), CampaignEditorError);
    await assert.rejects(() => restorePublishedDraft(restoreId, 7, '2000-01-01T00:00:00.000Z', restorePublication.version), CampaignEditorError);
    await db.update(s.campaignPublications).set({ deliveredAt: null }).where(eq(s.campaignPublications.campaignId, restoreId));
    await assert.rejects(() => restorePublishedDraft(restoreId, 7, restoreBefore.updatedAt.toISOString(), restorePublication.version), CampaignEditorError);
    await db.update(s.campaignPublications).set({ deliveredAt: restorePublication.deliveredAt }).where(eq(s.campaignPublications.campaignId, restoreId));
    const restored = await restorePublishedDraft(restoreId, 7, restoreBefore.updatedAt.toISOString(), restorePublication.version);
    const [restoreAfter] = await db.select().from(s.campaigns).where(eq(s.campaigns.id, restoreId));
    const [restoredEditor] = await db.select().from(s.campaignEditor).where(eq(s.campaignEditor.campaignId, restoreId));
    assert.deepEqual(restoreAfter, { ...restoreBefore, name: restorePublication.config.name, endsAt: new Date(restorePublication.config.endsAt), updatedAt: new Date(restored.updatedAt) });
    assert.ok(restoreAfter.updatedAt > restoreBefore.updatedAt);
    assert.equal(restoredEditor.revision, 8);
    assert.equal(restoredEditor.updatedAt.toISOString(), restored.updatedAt);
    assert.deepEqual(restoredEditor.config, { ...restorePublication.config, artworks: restorePublication.config.artworks.map(item => ({ ...item, file: `${item.id}.png` })), stickers: restorePublication.config.stickers.map(item => ({ ...item, file: `${item.id}.png` })) });
    assert.deepEqual((await db.select().from(s.campaignPublications).where(eq(s.campaignPublications.campaignId, restoreId)))[0], restorePublication);
    assert.deepEqual(await db.select().from(s.campaignPublicationHistory), restoreHistory);
    assert.deepEqual(await financialState(), restoreFinancial);
    assert.deepEqual(await Promise.all([...keys].map(async key => { try { return [key, (await object(key)).bytes.toString('base64')]; } catch { return [key, null]; } })), storageBefore);
    await assert.rejects(() => restorePublishedDraft(restoreId, 7, restoreBefore.updatedAt.toISOString(), restorePublication.version), CampaignEditorError);
    // Historical operations are independent: public rollback never adopts draft;
    // draft restore never moves the public pointer. Reuse the isolated v2 fixture.
    const historicalId = failureId;
    const historicalCampaign = async () => (await db.select().from(s.campaigns).where(eq(s.campaigns.id, historicalId)))[0];
    const historicalEditor = async () => (await db.select().from(s.campaignEditor).where(eq(s.campaignEditor.campaignId, historicalId)))[0];
    const historicalCurrent = async () => (await db.select().from(s.campaignPublications).where(eq(s.campaignPublications.campaignId, historicalId)))[0];
    const historicalRows = async () => db.select().from(s.campaignPublicationHistory).where(eq(s.campaignPublicationHistory.campaignId, historicalId));
    const rollback = async (target = 1) => publishHistoricalVersion(historicalId, (await historicalEditor()).revision, 'rollback-admin', (await historicalCampaign()).updatedAt.toISOString(), (await historicalCurrent()).version, target);
    const historicalFinancial = await financialState();
    const draftBeforeRollback = await historicalEditor();
    const campaignBeforeRollback = await historicalCampaign();
    const currentBeforeRollback = await historicalCurrent();
    const [originalV1] = await historicalRows();
    const unchangedRollback = async () => {
      assert.deepEqual(await historicalCurrent(), currentBeforeRollback);
      assert.deepEqual(await historicalEditor(), draftBeforeRollback);
      assert.deepEqual(await historicalCampaign(), campaignBeforeRollback);
      assert.deepEqual(await historicalRows(), [originalV1]);
    };
    const errorStatus = (status: number) => (e: unknown) => e instanceof CampaignEditorError && e.status === status;
    await assert.rejects(() => publishHistoricalVersion(historicalId, 7, 'admin', campaignBeforeRollback.updatedAt.toISOString(), 2, 1), errorStatus(409));
    await assert.rejects(() => publishHistoricalVersion(historicalId, 8, 'admin', '2000-01-01T00:00:00.000Z', 2, 1), errorStatus(409));
    await assert.rejects(() => publishHistoricalVersion(historicalId, 8, 'admin', campaignBeforeRollback.updatedAt.toISOString(), 1, 1), errorStatus(409));
    await assert.rejects(() => rollback(999), errorStatus(404));
    await unchangedRollback();
    await db.update(s.campaignPublications).set({ deliveredAt: null }).where(eq(s.campaignPublications.campaignId, historicalId));
    await assert.rejects(() => rollback(), errorStatus(409));
    await assert.rejects(() => restorePublishedDraft(historicalId, 8, campaignBeforeRollback.updatedAt.toISOString(), 2, 1), errorStatus(409));
    await db.update(s.campaignPublications).set({ deliveredAt: currentBeforeRollback.deliveredAt }).where(eq(s.campaignPublications.campaignId, historicalId));
    for (const [config, status] of [
      [{ ...originalV1.config, endsAt: '2000-01-01T00:00:00Z' }, 422],
      [{ ...originalV1.config, slug: fixture.identity.slug }, 409],
      [{ ...originalV1.config, artworks: [{ ...originalV1.config.artworks[0], id: fixture.asset }] }, 422],
    ] satisfies [typeof originalV1.config, number][]) {
      await db.update(s.campaignPublicationHistory).set({ config }).where(eq(s.campaignPublicationHistory.id, originalV1.id));
      await assert.rejects(() => rollback(), errorStatus(status));
    }
    await db.update(s.campaignPublicationHistory).set({ config: originalV1.config }).where(eq(s.campaignPublicationHistory.id, originalV1.id));
    rejectManifest = true;
    await assert.rejects(() => rollback());
    rejectManifest = false;
    await unchangedRollback();
    const rolledBack = await rollback();
    assert.deepEqual(rolledBack, { ...currentBeforeRollback, version: 1, config: originalV1.config, editorRevision: originalV1.editorRevision, publishedBy: originalV1.publishedBy, createdAt: originalV1.authorizedAt, deliveredAt: rolledBack.deliveredAt });
    assert.ok(rolledBack.deliveredAt && rolledBack.deliveredAt > currentBeforeRollback.deliveredAt! && rolledBack.deliveredAt > originalV1.deliveredAt, 'Historical activation has a monotonic latest-delivery timestamp');
    assert.deepEqual(await historicalEditor(), draftBeforeRollback, 'Rollback leaves every editor field intact');
    const campaignAfterRollback = await historicalCampaign();
    assert.ok(campaignAfterRollback.updatedAt > campaignBeforeRollback.updatedAt);
    assert.deepEqual(campaignAfterRollback, { ...campaignBeforeRollback, updatedAt: campaignAfterRollback.updatedAt });
    assert.deepEqual((await historicalRows()).map(row => row.version), [2]);
    assert.deepEqual(await (await get(`/campaigns/${fixtures[5].identity.slug}/campaign.json`)).json(), { version: 1 });
    const publicBeforeHistoricalRestore = (await object(concurrentArtifacts.manifestKey)).bytes;
    const historyBeforeHistoricalRestore = await historicalRows();
    await assert.rejects(() => restorePublishedDraft(historicalId, 8, campaignAfterRollback.updatedAt.toISOString(), 2, 2), errorStatus(409));
    await assert.rejects(() => restorePublishedDraft(historicalId, 8, campaignAfterRollback.updatedAt.toISOString(), 1, 999), errorStatus(404));
    await restorePublishedDraft(historicalId, 8, campaignAfterRollback.updatedAt.toISOString(), 1, 2);
    assert.equal((await historicalEditor()).revision, 9);
    assert.deepEqual((await historicalEditor()).config, concurrentConfig);
    assert.deepEqual(await historicalCurrent(), rolledBack);
    assert.deepEqual(await historicalRows(), historyBeforeHistoricalRestore);
    assert.ok((await object(concurrentArtifacts.manifestKey)).bytes.equals(publicBeforeHistoricalRestore));
    failureCampaignId = historicalId;
    rejectManifest = true;
    await assert.rejects(async () => publishCampaign(historicalId, 9, 'next-admin', (await historicalCampaign()).updatedAt.toISOString()));
    const pendingHistory = await historicalRows();
    assert.equal(pendingHistory.sort((a, b) => b.deliveredAt.getTime() - a.deliveredAt.getTime())[0].version, 1, 'Pending fallback selects last actually public version after rollback, not highest N');
    assert.deepEqual(await (await get(`/campaigns/${fixtures[5].identity.slug}/campaign.json`)).json(), { version: 1 });
    rejectManifest = false;
    const afterRollbackPublication = await publishCampaign(historicalId, 9, 'next-admin', (await historicalCampaign()).updatedAt.toISOString());
    assert.equal(afterRollbackPublication.version, 3, 'Allocation uses max(current, history), not current + 1');
    keys.add(publicationArtifacts(concurrentConfig, 3).versionKey);
    assert.deepEqual((await historicalRows()).map(row => row.version).sort(), [1, 2]);
    assert.deepEqual(await financialState(), historicalFinancial);
    console.log('PASS historical: public v2→v1 preserves draft/identity/authorship; historical draft restore preserves public; next publication v3; stale/pending/unknown/scope/ownership/expiry/storage failure rejected');
    console.log('PASS restore: names/deadline/config/private filenames; monotonic timestamps/revision; stale rejected; campaign metadata/financial/publication/history/storage preserved');
    console.log('PASS publication: unpaid; v1→private save v2→public update; manifest-last; old assets retained; v3 manifest failure preserves v2; frozen retry v3; integer numbering/concurrent idempotency/history/audit/revision; immutable version JSON; legacy full manifest/release read; empty/expired/stale rejection; financial state unchanged');
    console.log('PASS access: storage failure preserves DB/pointer; stale timestamp; suspend v1→publish v2 suspended→reactivate same v2; repair retry; audit; pending blocked; expired public reactivation rejected with future draft; suspension after expiry');
    console.log('PASS independent HTTP: marketing /, slug shell, runtime, S3 JSON and exact PNG; privacy/scope/404; host isolated from app and DB networks');
  } finally {
    rejectManifest = false;
    try {
      if (ownsFixtures) {
        for (const Key of keys) await client.send(new DeleteObjectCommand({ Bucket, Key }));
        await db.delete(s.webhookReceipts).where(eq(s.webhookReceipts.eventId, receiptEventId));
        await db.delete(s.payments).where(inArray(s.payments.campaignId, ids));
        await db.delete(s.campaignPublicationHistory).where(inArray(s.campaignPublicationHistory.campaignId, ids));
        await db.delete(s.campaignPublications).where(inArray(s.campaignPublications.campaignId, ids));
        await db.delete(s.campaigns).where(inArray(s.campaigns.id, ids));
        const residual = await pool.query('SELECT (SELECT count(*) FROM campaigns)::int + (SELECT count(*) FROM campaign_publications)::int + (SELECT count(*) FROM campaign_publication_history)::int + (SELECT count(*) FROM payments)::int + (SELECT count(*) FROM campaign_assets)::int + (SELECT count(*) FROM campaign_editor)::int + (SELECT count(*) FROM webhook_receipts)::int AS total');
        assert.equal(residual.rows[0].total, 0);
        assert.equal((await client.send(new ListObjectsV2Command({ Bucket }))).KeyCount, 0);
        console.log('PASS cleanup: dedicated DB fixtures and all owned S3 objects removed; bucket empty');
      }
    } finally { process.env.S3_ENDPOINT = endpoint.href; client.destroy(); await new Promise<void>(resolve => proxy.close(() => resolve())); await pool.end(); }
  }
}
main().catch((error: unknown) => {
  const location = error instanceof Error ? error.stack?.match(/(?:test-publication|campaign-publication)\.ts:\d+:\d+/)?.[0] : undefined;
  console.error('FAIL publication integration', error instanceof Error ? error.name : 'UnknownError', location ?? '(details suppressed for privacy)'); process.exitCode = 1;
});
