import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultCampaignEvent, CampaignEditorError } from '../src/lib/campaign-editor';
import { packageApprovalInput, packageIdentity, packageMatches, validatePackage } from '../src/lib/campaign-package';

const campaign = { name: 'Evento teste', slug: 'evento-teste', endsAt: new Date('2030-01-01T12:00:00Z') };
const now = new Date('2029-01-01T12:00:00Z');
const id = '01234567-89ab-4cde-8fab-0123456789ab';
const asset = { id, width: 400, height: 400, kind: 'artwork' as const };
function event() {
  return { ...defaultCampaignEvent(campaign), artworks: [{ id, name: 'Moldura', file: `${id}.png`, width: 400, height: 400, reference: { x: 40, y: 40, width: 320, height: 320 } }] };
}
const input = { revision: '1', identity: packageIdentity(campaign), approvedBy: '  Responsável teste  ', channel: 'whatsapp', approvedAt: '2029-01-01', rights: 'on' };

test('aprovação exige revisão salva, identidade e autorização explícita; normaliza responsável', () => {
  const parsed = packageApprovalInput.parse(input);
  assert.equal(parsed.revision, 1);
  assert.equal(parsed.approvedBy, 'Responsável teste');
  for (const channel of ['whatsapp', 'email', 'presencial', 'outro']) assert.equal(packageApprovalInput.safeParse({ ...input, channel }).success, true);
  for (const revision of [undefined, '', '0', '-1', '1.5', 'abc']) assert.equal(packageApprovalInput.safeParse({ ...input, revision }).success, false);
  for (const rights of [undefined, false, true, '', 'off']) assert.equal(packageApprovalInput.safeParse({ ...input, rights }).success, false);
  for (const override of [{ approvedBy: '   ' }, { approvedBy: 'x'.repeat(201) }, { channel: 'sms' }, { approvedAt: '01/01/2029' }, { identity: '' }, { identity: 'x'.repeat(2001) }, { unexpected: 'field' }]) {
    assert.equal(packageApprovalInput.safeParse({ ...input, ...override }).success, false);
  }
});

test('identidade inclui nome, slug e instante de encerramento sem ambiguidade', () => {
  assert.equal(packageIdentity(campaign), JSON.stringify(['Evento teste', 'evento-teste', '2030-01-01T12:00:00.000Z']));
  assert.equal(packageIdentity({ ...campaign, endsAt: new Date(campaign.endsAt) }), packageIdentity(campaign));
  for (const override of [{ name: 'Novo nome' }, { slug: 'novo-slug' }, { endsAt: new Date('2030-01-01T12:00:01Z') }]) assert.notEqual(packageIdentity({ ...campaign, ...override }), packageIdentity(campaign));
});

test('pacote válido deriva identidade da campanha e não altera rascunho', () => {
  const draft = { ...event(), name: 'ignorado', slug: 'ignorado', endsAt: 'ignorado' };
  const before = structuredClone(draft);
  const result = validatePackage(draft, campaign, [asset], now);
  assert.equal(result.name, campaign.name);
  assert.equal(result.slug, campaign.slug);
  assert.equal(result.endsAt, '2030-01-01T12:00:00Z');
  assert.deepEqual(result.artworks[0].reference, { x: 40, y: 40, width: 320, height: 320 });
  assert.deepEqual(draft, before);
  const uppercase = event(); uppercase.artworks[0].id = id.toUpperCase();
  assert.equal(validatePackage(uppercase, campaign, [asset], now).artworks[0].id.toLowerCase(), asset.id);
  assert.throws(() => validatePackage(uppercase, campaign, [], now), (error: unknown) => error instanceof CampaignEditorError && error.status === 422);
});

test('pacote aprovado exige encerramento futuro, arte e modo não demonstração', () => {
  for (const endsAt of [now, new Date(now.getTime() - 1)]) assert.throws(() => validatePackage(event(), { ...campaign, endsAt }, [asset], now), /encerramento futuro/);
  assert.throws(() => validatePackage(defaultCampaignEvent(campaign), campaign, [], now), /ao menos uma arte/);
  assert.throws(() => validatePackage({ ...event(), demo: true }, campaign, [asset], now), /demonstração/);
});

test('pacote reutiliza validação de propriedade, dimensões e referência do editor', () => {
  const invalid = (error: unknown) => error instanceof CampaignEditorError && error.status === 422;
  assert.throws(() => validatePackage(event(), campaign, [], now), invalid);
  assert.throws(() => validatePackage(event(), campaign, [{ ...asset, kind: 'sticker' }], now), invalid);
  assert.throws(() => validatePackage(event(), campaign, [{ ...asset, width: 401 }], now), invalid);
  const outside = event(); outside.artworks[0].reference.x = 399;
  assert.throws(() => validatePackage(outside, campaign, [asset], now), invalid);
  assert.throws(() => validatePackage({ ...event(), privateKey: 'forbidden' }, campaign, [asset], now), invalid);
});

test('comparação detecta alterações visuais e de identidade sem mutar snapshot', () => {
  const snapshot = validatePackage(event(), campaign, [asset], now);
  const before = structuredClone(snapshot);
  assert.equal(packageMatches(snapshot, structuredClone(snapshot)), true);
  for (const override of [{ color: '#ffffff' }, { name: 'Outro evento' }, { slug: 'outro-evento' }, { endsAt: '2031-01-01T12:00:00Z' }, { artworks: [{ ...snapshot.artworks[0], name: 'Outra moldura' }] }, { artworks: [{ ...snapshot.artworks[0], reference: { x: 0, y: 0, width: 300, height: 300 } }] }]) {
    assert.equal(packageMatches(snapshot, { ...snapshot, ...override }), false);
  }
  assert.deepEqual(snapshot, before);
});

test('comparação ignora ordem de chaves JSONB mas preserva ordem das artes', () => {
  const snapshot = validatePackage(event(), campaign, [asset], now);
  const reorder = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(reorder);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key, reorder(item)]));
    return value;
  };
  assert.equal(packageMatches(snapshot, reorder(snapshot) as typeof snapshot), true);
  const second = { ...snapshot.artworks[0], id: '11234567-89ab-4cde-8fab-0123456789ab', name: 'Segunda arte' };
  const ordered = { ...snapshot, artworks: [...snapshot.artworks, second] };
  assert.equal(packageMatches(ordered, { ...ordered, artworks: [...ordered.artworks].reverse() }), false);
});
