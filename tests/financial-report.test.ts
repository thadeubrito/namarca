import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, financialCsv, summarizePayments, type ReportPayment } from '../src/lib/financial-report';
const row = (status: ReportPayment['status'], amountCents = 4321): ReportPayment => ({ status, amountCents, externalId: 'test-reference', createdAt: new Date('2026-01-01T12:00:00Z'), updatedAt: new Date('2026-01-02T12:00:00Z'), paidAt: status === 'paid' || status === 'refunded' ? new Date('2026-01-01T13:00:00Z') : null });
test('totais separam estados sem contar reembolso como pago ou tentativa como venda', () => {
  const totals = summarizePayments([row('paid'), row('paid', 1000), row('refunded'), row('pending'), row('expired'), row('cancelled')]);
  assert.deepEqual(totals.paid, { count: 2, amountCents: 5321 });
  for (const status of ['refunded', 'pending', 'expired', 'cancelled'] as const) assert.deepEqual(totals[status], { count: 1, amountCents: 4321 });
  assert.deepEqual(summarizePayments([]).paid, { count: 0, amountCents: 0 });
  assert.throws(() => summarizePayments([row('paid', 1.5)]));
  assert.throws(() => summarizePayments([row('paid', Number.MAX_SAFE_INTEGER), row('paid')]));
});
test('CSV usa centavos exatos, UTC e allow-list sem documento ou checkout token', () => {
  const csv = financialCsv([{ ...row('refunded'), payerCpf: 'do-not-export', token: 'private-token' } as ReportPayment]);
  assert.ok(csv.startsWith('\uFEFF"Referência";'));
  assert.ok(csv.includes('"43,21"'));
  assert.ok(csv.includes('"2026-01-01T13:00:00.000Z"'));
  assert.ok(csv.includes('"Reembolsado"'));
  assert.ok(!csv.includes('do-not-export') && !csv.includes('private-token'));
  assert.equal(financialCsv([]).split('\r\n').length, 2);
});
test('CSV neutraliza fórmulas de planilha e escapa delimitadores, aspas e linhas', () => {
  for (const value of ['=SUM(A1)', '+1', '-1', '@x', '  =1', '\t=1', '\rfoo', '\nfoo']) assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('a;"b"\nc'), '"a;""b""\nc"');
});
