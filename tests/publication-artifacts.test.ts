import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultCampaignEvent } from '../apps/admin/src/lib/campaign-editor';
import { publicationArtifacts } from '../apps/admin/src/lib/publication-artifacts';
import { assertPublicKey } from '../apps/admin/src/lib/storage';
import { publicSiteUrl } from '../apps/admin/src/lib/public-site';

test('numbered JSON uses stable artwork/sticker paths across versions and JSONB order', () => {
  const identity = { name: 'Evento', slug: 'evento', endsAt: new Date('2099-01-01') };
  const id = '10000000-0000-4000-8000-000000000001';
  const config = { ...defaultCampaignEvent(identity), artworks: [{ id, name: 'Arte', file: `${id}.png`, width: 2, height: 2, reference: { x: 0, y: 0, width: 2, height: 2 } }] };
  const result = publicationArtifacts(config);
  const reversed = Object.fromEntries(Object.entries(config).reverse());
  assert.equal(publicationArtifacts(reversed as typeof config).revision, result.revision);
  assert.equal(result.event.artworks[0].file, `artworks/${id}.png`);
  assert.equal(result.version, 1);
  assert.equal(result.versionKey, 'public/events/evento/versions/v1.json');
  const v2 = publicationArtifacts(config, 2);
  assert.equal(v2.versionKey, 'public/events/evento/versions/v2.json');
  assert.deepEqual(v2.event, result.event);
  assert.equal(v2.assetKey(id), result.assetKey(id));
  assert.throws(() => result.assetKey('unknown'));
  for (const invalid of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => publicationArtifacts(config, invalid));
  const stickerId = '20000000-0000-4000-8000-000000000002';
  const withSticker = publicationArtifacts({ ...config, stickers: [{ id: stickerId, name: 'Figurinha', file: `${stickerId}.png` }] }, 3);
  assert.equal(withSticker.event.stickers[0].file, `stickers/${stickerId}.png`);
  assertPublicKey(withSticker.assetKey(stickerId));
  assertPublicKey(v2.versionKey);
  assert.equal(config.artworks[0].file, `${id}.png`);
  assertPublicKey(result.assetKey(id));
  assertPublicKey(result.manifestKey);
  assert.equal(result.manifestKey, 'public/events/evento/event.json');
});

test('public storage never accepts private keys, traversal or arbitrary objects', () => {
  for (const key of ['private/campaigns/a.png', 'public/events/../event.json', 'public/events/evento/notes.json', 'public/events/evento/a.png', 'public/events/evento/versions/v0.json', 'public/events/evento/versions/v01.json', 'public/events/evento/versions/v1.5.json', 'public/events/evento/artworks/../a.png']) assert.throws(() => assertPublicKey(key));
});

test('public campaign URLs point to separate host', () => {
  const old = process.env.PUBLIC_SITE_URL;
  try {
    process.env.PUBLIC_SITE_URL = 'https://public.namarca.test';
    assert.equal(publicSiteUrl('evento'), 'https://public.namarca.test/evento');
    process.env.PUBLIC_SITE_URL = 'https://example.test/admin';
    assert.throws(() => publicSiteUrl('evento'));
  } finally { if (old === undefined) delete process.env.PUBLIC_SITE_URL; else process.env.PUBLIC_SITE_URL = old; }
});
