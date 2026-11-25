import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { bootstrapKeyConfigured, bootstrapKeyMatches, validBootstrapInput } from '../src/lib/admin-bootstrap-input';

test('bootstrap key format, digest comparison and password confirmation', () => {
  const key = 'a'.repeat(43);
  assert.equal(bootstrapKeyConfigured(undefined), false);
  assert.equal(bootstrapKeyConfigured('a'.repeat(42)), false);
  assert.equal(bootstrapKeyConfigured(`${key}=`), false);
  assert.equal(bootstrapKeyConfigured(key), true);
  assert.equal(bootstrapKeyMatches(key, key), true);
  assert.equal(bootstrapKeyMatches('short', key), false);
  assert.equal(bootstrapKeyMatches('b'.repeat(43), key), false);
  const input = { key, password: 'abcdefgh', passwordConfirmation: 'abcdefgh' };
  assert.equal(validBootstrapInput(input), true);
  for (const invalid of [null, [], {}, { ...input, email: 'not-accepted' }, { ...input, passwordConfirmation: 'different' }, { ...input, password: 'short' }, { ...input, password: 'x'.repeat(129) }]) {
    assert.equal(validBootstrapInput(invalid), false);
  }
});
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('bootstrap reserves global persistent slot before key comparison and password hashing', () => {
  const source = read('src/lib/admin-bootstrap.ts');
  assert.ok(source.indexOf('if (!await reserveAttempt())') < source.indexOf('!bootstrapKeyMatches(input.key'));
  assert.match(source, /ON CONFLICT \(id\) DO UPDATE/);
  assert.match(source, /clock_timestamp\(\) - interval '15 minutes'/);
  assert.match(source, /attempts < 5/);
  assert.match(read('src/lib/admin-bootstrap-input.ts'), /timingSafeEqual\(digest\(candidate\), digest\(expected\)\)/);
  assert.match(source, /\.for\("update"\)/);
  assert.match(source, /lower\(\$\{user.email\}\)/);
  assert.ok(source.indexOf('if (!state || state.consumedAt)') < source.indexOf('await hashPassword(input.password)'));
  assert.doesNotMatch(source, /update\(user\)|update\(account\)|insert\(session\)/);
});
test('bootstrap browser form fails closed before hydration and uses no email input', () => {
  const source = read('src/components/auth-panel.tsx');
  assert.match(source, /method="post" action="\/api\/auth\/form-unavailable"/);
  assert.match(source, /disabled=\{!ready \|\| busy/);
  assert.match(source, /mode === 'bootstrap'.*name="passwordConfirmation"/);
  assert.match(source, /autoComplete="new-password"/);
  assert.match(source, /href="\/login" prefetch=\{false\}>Ir para o login/);
});
test('bootstrap migration has singleton seed, constraints and versioned journal', () => {
  const source = read('drizzle/0017_boring_khan.sql');
  assert.match(source, /INSERT INTO "auth_bootstrap" \("id"\) VALUES \(1\)/);
  assert.match(source, /CHECK \("auth_bootstrap"\."id" = 1\)/);
  assert.match(source, /between 1 and 5/);
  const journal = JSON.parse(read('drizzle/meta/_journal.json'));
  assert.equal(journal.entries.at(-1).tag, '0017_boring_khan');
});
