import assert from 'node:assert/strict';
import test from 'node:test';
import { checkoutTokenValid, requireMockCheckout } from '../src/lib/checkout';
test('checkout exige token opaco completo, sem IDs enumeráveis', () => {
  assert.equal(checkoutTokenValid('a'.repeat(64)), true);
  for (const token of ['', 'a'.repeat(63), 'A'.repeat(64), '../checkout', 'b'.repeat(65)]) assert.equal(checkoutTokenValid(token), false);
});
test('checkout rejeita modo live e destino diferente do mock local', () => {
  const old = { ...process.env };
  try {
    Object.assign(process.env, { DATABASE_URL: 'postgresql://postgres/test', S3_ACCESS_KEY_ID: 'test', S3_SECRET_ACCESS_KEY: 'test', PIXGO_API_KEY: 'test', PIXGO_WEBHOOK_SECRET: 's'.repeat(32), PIXGO_MODE: 'mock', PIXGO_BASE_URL: 'http://pixgo-mock:4010/api/v1' });
    assert.doesNotThrow(requireMockCheckout);
    process.env.PIXGO_BASE_URL = 'https://example.test/api';
    assert.throws(requireMockCheckout);
    process.env.PIXGO_MODE = 'live'; process.env.PIXGO_LIVE_AUTHORIZED = 'true';
    assert.throws(requireMockCheckout);
  } finally { process.env = old; }
});
