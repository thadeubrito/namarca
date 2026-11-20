import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('falha permite retry explícito sem consultas automáticas nem liberação administrativa', async () => {
  const domain = await readFile('src/lib/checkout.ts', 'utf8');
  assert.ok(!domain.includes('recoverCheckoutAttempt'));
  assert.ok(!domain.includes('releaseCheckoutRetry'));
  assert.ok(!domain.includes('findMockPayment'));
  assert.ok(domain.includes("set({ state: 'unknown' })"));
  assert.ok(domain.includes("a.state === 'creating' && Date.now() - a.createdAt.getTime() < 15000"));
  const page = await readFile('src/app/checkout/[token]/page.tsx', 'utf8');
  assert.ok(page.includes('Não foi possível gerar o Pix'));
  assert.ok(page.includes('const retry = !generating'));
  const action = await readFile('src/app/admin/campanhas/[id]/billing-actions.ts', 'utf8');
  assert.ok(!action.includes("operation === 'release'"));
});
test('pagamentos ativos e callbacks tardios continuam protegidos', async () => {
  const domain = await readFile('src/lib/checkout.ts', 'utf8');
  assert.ok(domain.includes("history.some(p => !['expired', 'cancelled'].includes(p.status))"));
  assert.ok(domain.includes('export async function registerCheckoutPayment'));
  assert.ok(!domain.includes('tx.delete'));
  const page = await readFile('src/app/checkout/[token]/page.tsx', 'utf8');
  assert.ok(page.includes("history.find(payment => payment.status === 'paid')"));
});
