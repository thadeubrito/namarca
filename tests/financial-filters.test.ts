import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { financialDateBounds, financialFilterQuery, financialFiltersSchema } from '../src/lib/financial-filters';
import { financialCsv } from '../src/lib/financial-report';

test('filtros financeiros aceitam vazios e rejeitam status, campanha, datas e intervalos inválidos', () => {
  assert.deepEqual(financialFiltersSchema.parse({ campaign: '', status: '', from: '', to: '' }), { campaign: undefined, status: undefined, from: undefined, to: undefined });
  for (const invalid of [{ campaign: 'x' }, { status: 'completed' }, { status: ['paid', 'pending'] }, { from: '2026-02-30' }, { from: '2026-12-02', to: '2026-12-01' }]) {
    assert.equal(financialFiltersSchema.safeParse(invalid).success, false);
  }
});
test('período financeiro inclui dias completos de criação em São Paulo', () => {
  const bounds = financialDateBounds({ from: '2026-11-01', to: '2026-11-01' });
  assert.equal(bounds.from?.toISOString(), '2026-11-01T03:00:00.000Z');
  assert.equal(bounds.until?.toISOString(), '2026-11-02T03:00:00.000Z');
  assert.deepEqual(financialDateBounds({}), { from: undefined, until: undefined });
  assert.equal(financialFilterQuery({ status: 'paid', from: '2026-11-01' }), 'status=paid&from=2026-11-01');
});
test('página e CSV global exigem admin antes de consultar e não acionam gateway', async () => {
  for (const path of ['src/app/admin/(workspace)/financeiro/page.tsx', 'src/app/api/financial-report/route.ts']) {
    const source = await readFile(path, 'utf8');
    assert.ok(source.includes('await requireAdmin('));
    assert.ok(source.indexOf('await requireAdmin(') < source.indexOf('await globalFinancialRows('));
    assert.ok(!/reconcilePayment|createPayment|pixgoClient/.test(source));
  }
});
test('CSV global inclui campanha e neutraliza fórmula sem exportar campos extras', () => {
  const row = { externalId: 'ref', status: 'paid' as const, amountCents: 1234, createdAt: new Date('2026-11-01T03:00:00Z'), updatedAt: new Date('2026-11-01T03:00:00Z'), paidAt: null, token: 'private-token' };
  const csv = financialCsv([row], () => '=HYPERLINK("example")');
  assert.ok(csv.startsWith('\uFEFF"Campanha";"Referência";'));
  assert.ok(csv.includes('"\'=HYPERLINK(""example"")";"ref";"Pago";"12,34"'));
  assert.ok(!csv.includes('private-token'));
});
