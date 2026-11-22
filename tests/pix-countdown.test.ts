import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPixCountdown, pixRemainingSeconds } from '../apps/admin/src/lib/pix-countdown';

test('contagem usa expiração absoluta, arredonda segundos e não fica negativa', () => {
  const expiry = '2026-11-20T12:00:00Z';
  const end = Date.parse(expiry);
  assert.equal(pixRemainingSeconds(expiry, end - 61500), 62);
  assert.equal(pixRemainingSeconds(expiry, end), 0);
  assert.equal(pixRemainingSeconds(expiry, end + 1000), 0);
  assert.equal(pixRemainingSeconds('inválido', end), null);
  assert.equal(formatPixCountdown(62), '01:02');
  assert.equal(formatPixCountdown(3601), '1:00:01');
  assert.equal(formatPixCountdown(0), '00:00');
});
