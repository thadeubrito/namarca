import assert from 'node:assert/strict';
import test from 'node:test';
import { maskBRL, displayBRL } from '../apps/admin/src/lib/currency-input';
import { billingAmountInput } from '../apps/admin/src/lib/billing-input';

test('máscara BRL usa centavos, milhar e mantém vazio', () => {
  assert.equal(maskBRL(''), '');
  assert.equal(maskBRL('1'), '0,01');
  assert.equal(maskBRL('39500'), '395,00');
  assert.equal(maskBRL('R$ 6.000,00'), '6.000,00');
  assert.equal(maskBRL('abc'), '');
  assert.equal(displayBRL('395'), '395,00');
  assert.equal(displayBRL('395.50'), '395,50');
  assert.equal(displayBRL('6.000,00'), '6.000,00');
});

test('servidor aceita máscara e formato anterior sem mudar limites', () => {
  for (const value of ['6000', '6000.00', '6000,00', '6.000,00']) assert.equal(billingAmountInput.parse(value), 600000);
  for (const value of ['6.001,00', '9,99', 'abc', '1.2.34,00', '6.000', '1,000.00']) assert.equal(billingAmountInput.safeParse(value).success, false);
});
