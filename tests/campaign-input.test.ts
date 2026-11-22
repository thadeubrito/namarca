import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignInput } from '../apps/admin/src/lib/campaign-input';
const input = { name: 'Corrida Horizonte', slug: 'corrida-horizonte', endsAt: '2099-01-01' };
test('cliente é opcional; novo exige nome, contato opcional e limites', () => {
  const empty = campaignInput.parse(input);
  assert.equal(empty.clientId, ''); assert.equal(empty.notes, '');
  const filled = campaignInput.parse({ ...input, clientId: 'new', clientName: ' Cliente ', clientContact: ' WhatsApp ', notes: ' Combinado ' });
  assert.equal(filled.clientName, 'Cliente'); assert.equal(filled.clientContact, 'WhatsApp'); assert.equal(filled.notes, 'Combinado');
  assert.equal(campaignInput.safeParse({ ...input, clientId: 'new', clientName: 'Cliente' }).success, true);
  for (const extra of [{ clientId: 'new', clientName: '' }, { clientId: 'invalido' }, { clientName: 'a'.repeat(161) }, { clientContact: 'a'.repeat(255) }, { notes: 'a'.repeat(3001) }]) assert.equal(campaignInput.safeParse({ ...input, ...extra }).success, false);
});
test('dados da campanha não aceitam alteração de preço', () => {
  assert.equal('price' in campaignInput.parse({ ...input, price: '395,50' }), false);
});
test('rejeita slug inválido', () => { assert.equal(campaignInput.safeParse({ ...input, slug: '../evento' }).success, false); });
test('rejeita data passada e data impossível', () => { for (const endsAt of ['2020-01-01', '2099-02-31']) assert.equal(campaignInput.safeParse({ ...input, endsAt }).success, false); });
