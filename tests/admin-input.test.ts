import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePasswordInput, PasswordInputError } from '../scripts/create-admin';

test('senha curta informa requisito sem expor o conteúdo', () => {
  const secret = 'short';
  assert.throws(() => validatePasswordInput(secret), error => error instanceof PasswordInputError && error.message.includes('8 e 128') && !error.message.includes(secret));
});
test('limites e confirmação de senha', () => {
  assert.throws(() => validatePasswordInput('a'.repeat(7)), PasswordInputError);
  assert.doesNotThrow(() => validatePasswordInput('a'.repeat(8), 'a'.repeat(8)));
  assert.doesNotThrow(() => validatePasswordInput('a'.repeat(128)));
  assert.throws(() => validatePasswordInput('a'.repeat(129)), PasswordInputError);
  assert.throws(() => validatePasswordInput('a'.repeat(8), 'b'.repeat(8)), /não coincidem/);
});
