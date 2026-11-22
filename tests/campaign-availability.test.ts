import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignAvailability } from '../apps/admin/src/lib/campaign-availability';

test('disponibilidade distingue rascunho, ativa, suspensa e encerrada sem confundir versões', () => {
  const now = Date.parse('2026-11-20T12:00:00Z');
  const future = '2026-11-21T12:00:00Z';
  assert.equal(campaignAvailability({ published: false, suspended: false }, now), 'Rascunho');
  assert.equal(campaignAvailability({ published: false, suspended: false, pending: true }, now), 'Publicação pendente');
  assert.equal(campaignAvailability({ published: true, suspended: false, endsAt: future }, now), 'Ativa');
  assert.equal(campaignAvailability({ published: true, suspended: true, endsAt: future, pending: true }, now), 'Suspensa');
  assert.equal(campaignAvailability({ published: true, suspended: true, endsAt: '2026-11-20T12:00:00Z' }, now), 'Encerrada');
});
