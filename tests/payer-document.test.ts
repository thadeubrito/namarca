import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentSchema, isValidCnpj, isValidPayerDocument, normalizePayerDocument } from '../apps/admin/src/lib/pixgo';

test('documento do pagador aceita CPF e CNPJ numérico/alfanumérico com dígitos válidos', () => {
  for (const value of ['52998224725', '11222333000181', '12ABC34501DE35']) {
    assert.equal(isValidPayerDocument(value), true);
    assert.equal(createPaymentSchema.safeParse({ externalId: 'fixture', amountCents: 1000, payerCpf: value }).success, true);
  }
  assert.equal(normalizePayerDocument('12.abc.345/01de-35'), '12ABC34501DE35');
  assert.equal(normalizePayerDocument('529.982.247-25'), '52998224725');
  for (const value of ['', '00000000000000', '11222333000182', '12ABC34501DE36', 'ABCDEFGHIJKLMN']) assert.equal(isValidCnpj(value), false);
});
