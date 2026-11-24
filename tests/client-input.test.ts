import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clientInput, clientSearchPattern } from '../src/lib/client-input';

test('cliente independente exige nome, normaliza campos e mantém contato opcional', () => {
  assert.deepEqual(clientInput.parse({ name: '  Cliente teste  ', contact: '  ' }), { name: 'Cliente teste', contact: '' });
  for (const input of [{ name: ' ', contact: '' }, { name: 'x'.repeat(161), contact: '' }, { name: 'Cliente', contact: 'x'.repeat(255) }]) assert.equal(clientInput.safeParse(input).success, false);
});
test('busca literal escapa wildcard e barra sem interpolar SQL', () => {
  assert.equal(clientSearchPattern('100%_\\'), '%100\\%\\_\\\\%');
  assert.equal(clientSearchPattern("O'Nome"), "%O'Nome%");
});
