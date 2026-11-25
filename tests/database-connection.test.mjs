import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { strictDatabaseConnectionString } from '../src/db/connection-string.mjs';

const base = 'postgresql://synthetic:synthetic@db/test';
test('ambiguous SSL modes become verify-full without changing other parameters', () => {
  for (const mode of ['prefer', 'require', 'verify-ca']) {
    assert.equal(strictDatabaseConnectionString(`${base}?sslmode=${mode}&channel_binding=require`), `${base}?sslmode=verify-full&channel_binding=require`);
  }
});
test('pg receives strict TLS for canonical and encoded modes without identity override', () => {
  for (const query of ['sslmode=require', 'sslmode=%72equire', '%73slmode=require', 'sslmode=require#fragment']) {
    const connectionString = strictDatabaseConnectionString(`${base}?${query}`);
    const client = new pg.Client({ connectionString });
    assert.equal(new URL(connectionString).searchParams.get('sslmode'), 'verify-full');
    assert.notEqual(client.connectionParameters.ssl, false);
    assert.notEqual(client.connectionParameters.ssl.rejectUnauthorized, false);
    assert.equal(client.connectionParameters.ssl.checkServerIdentity, undefined);
  }
  assert.throws(() => strictDatabaseConnectionString(`${base}?sslmode=verify-full&sslmode=require&uselibpqcompat=true`));
});
test('local and explicit strict connections are preserved', () => {
  for (const value of [undefined, base, `${base}?sslmode=verify-full`]) {
    assert.equal(strictDatabaseConnectionString(value), value);
  }
});
test('encoded SSL mode is normalized, duplicates and invalid URLs fail safely', () => {
  assert.equal(new URL(strictDatabaseConnectionString(`${base}?ssl%6dode=re%71uire`)).searchParams.get('sslmode'), 'verify-full');
  assert.throws(() => strictDatabaseConnectionString(`${base}?sslmode=require&sslmode=no-verify`), /Duplicate/);
  assert.throws(() => strictDatabaseConnectionString('synthetic-sensitive-marker'), error => !error.message.includes('synthetic-sensitive-marker'));
});
test('explicit libpq compatibility is rejected rather than silently weakened', () => {
  assert.throws(() => strictDatabaseConnectionString(`${base}?sslmode=require&uselibpqcompat=true`));
});
