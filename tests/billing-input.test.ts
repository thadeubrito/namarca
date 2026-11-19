import assert from 'node:assert/strict';
import test from 'node:test';
import { billingAmountInput } from '../src/lib/billing-input';

test('valor da cobrança converte reais para centavos, com ponto ou vírgula', () => {
  for (const value of ['395,50', '395.50']) assert.equal(billingAmountInput.parse(value), 39550);
  assert.equal(billingAmountInput.parse('10'), 1000);
  assert.equal(billingAmountInput.parse('6000,00'), 600000);
});
test('valor da cobrança rejeita vazio, formatos inválidos e valores fora dos limites', () => {
  for (const value of ['', '9,99', '6000,01', '-10', '1e3', '10,001', '1.000,00', 'NaN']) {
    assert.equal(billingAmountInput.safeParse(value).success, false, value);
  }
});
