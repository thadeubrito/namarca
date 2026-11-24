import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicationPointer, validatePublicationAccess } from '../src/lib/publication-access';

const updatedAt = new Date('2026-01-01T00:00:00.000Z');
const campaign = { updatedAt, publicationStatus: 'published' };
const delivered = { deliveredAt: updatedAt, config: { endsAt: '2099-01-01T00:00:00Z' } };
const validate = (publication = delivered, suspended = true, expected = updatedAt.toISOString()) => validatePublicationAccess(campaign, publication, suspended, 'admin', expected);

test('ponteiro omite suspended quando ativo e nunca mistura configuração privada', () => {
  assert.deepEqual(publicationPointer(2, true), { version: 2, suspended: true });
  assert.deepEqual(publicationPointer(2, false), { version: 2 });
  for (const n of [0, -1, 1.5, NaN]) assert.throws(() => publicationPointer(n, true));
});
test('acesso exige entrega, timestamp esperado e ator; expiração usa versão pública', () => {
  assert.doesNotThrow(() => validate());
  assert.throws(() => validate(delivered, true, '2025-01-01T00:00:00.000Z'), /mudou/);
  assert.throws(() => validatePublicationAccess(campaign, undefined, true, 'admin', updatedAt.toISOString()), /Publique/);
  assert.throws(() => validatePublicationAccess(campaign, { ...delivered, deliveredAt: null }, true, 'admin', updatedAt.toISOString()), /pendente/);
  assert.throws(() => validatePublicationAccess(campaign, delivered, true, '', updatedAt.toISOString()), /inválida/);
  for (const endsAt of ['2000-01-01', 'invalid']) {
    const expired = { ...delivered, config: { endsAt } };
    assert.throws(() => validate(expired, false), /encerrada/);
    assert.doesNotThrow(() => validate(expired, true));
  }
});
test('action de acesso exige admin, boolean estrito, timestamp e revalidação', async () => {
  const action = await readFile('src/app/admin/(workspace)/campanhas/[id]/publication-actions.ts', 'utf8');
  const access = action.slice(action.indexOf('export async function changeCampaignAccess'), action.indexOf('export type PublicationState'));
  assert.match(access, /await requireAdmin\(\)/);
  assert.match(access, /values\.length !== 1/);
  assert.match(access, /suspended !== 'yes' && suspended !== 'no'/);
  assert.match(access, /timestamps\.length !== 1/);
  assert.match(access, /setCampaignSuspended\(id, suspended === 'yes', session\.user\.id, updatedAt\)/);
  assert.match(access, /revalidatePath\('\/admin'\)/);
});
