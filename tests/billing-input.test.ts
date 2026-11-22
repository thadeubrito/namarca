import assert from 'node:assert/strict';
import test from 'node:test';
import { billingAmountInput, billingDescriptionInput } from '../apps/admin/src/lib/billing-input';

test('valor da cobrança converte reais para centavos, com ponto ou vírgula', () => {
  for (const value of ['395,50', '395.50']) assert.equal(billingAmountInput.parse(value), 39550);
  assert.equal(billingAmountInput.parse('10'), 1000);
  assert.equal(billingAmountInput.parse('6000,00'), 600000);
});
test('descrição de cobrança é obrigatória, normalizada e limitada', () => {
  assert.equal(billingDescriptionInput.parse('  Alteração adicional  '), 'Alteração adicional');
  for (const value of ['', '   ', 'x'.repeat(121), null]) assert.equal(billingDescriptionInput.safeParse(value).success, false);
});
test('valor da cobrança rejeita vazio, formatos inválidos e valores fora dos limites', () => {
  for (const value of ['', '9,99', '6000,01', '-10', '1e3', '10,001', '1.00,00', 'NaN']) {
    assert.equal(billingAmountInput.safeParse(value).success, false, value);
  }
});
