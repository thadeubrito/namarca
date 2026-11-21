import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('workbench separa contexto e ferramentas sem substituir painéis persistentes por rotas', async () => {
  const sections = await readFile('src/components/admin-workspace/campaign-sections.tsx', 'utf8');
  const tabs = await readFile('src/components/admin-workspace/primitives.tsx', 'utf8');
  const form = await readFile('src/components/admin-workspace/campaign-form.tsx', 'utf8');
  const page = await readFile('src/app/(workspace)/campanhas/[id]/page.tsx', 'utf8');
  assert.ok(page.includes('className="ws-campaign-heading-content"'));
  assert.doesNotMatch(page, /className="ws-campaign-address"|className="ws-campaign-meta"|Publicação indisponível/);
  assert.ok(page.includes('<h1>{campaign.name}</h1>'));
  assert.doesNotMatch(sections, /ws-campaign-context/);
  assert.ok(page.includes('<th>Cobrança / referência</th>'));
  assert.ok(page.includes('className="ws-payment-reference"'));
  assert.ok(sections.includes('layout="workbench"'));
  assert.ok(tabs.includes("aria-orientation={layout === 'workbench' && desktop ? 'vertical' : 'horizontal'}"));
  assert.match(tabs, /ArrowDown: \(index \+ 1\)/);
  assert.match(tabs, /ArrowUp: \(index - 1/);
  assert.ok(tabs.includes('hidden={!selected}'));
  assert.ok(form.includes('className="ws-form-groups"'));
  assert.ok(form.includes('data-campaign-save={defaults ?'));
  const directory = await readFile('src/components/admin-workspace/campaign-directory.tsx', 'utf8');
  assert.ok(directory.includes('className="ws-campaign-directory-row"'));
  assert.doesNotMatch(directory, /c\.priceCents/);
  assert.ok(directory.includes('aria-pressed={filter === value}'));
});

test('financeiro não apresenta totais zerados de filtros inválidos e compartilhamento tem divulgação progressiva', async () => {
  const financial = await readFile('src/app/(workspace)/financeiro/page.tsx', 'utf8');
  const billing = await readFile('src/components/admin-workspace/billing.tsx', 'utf8');
  assert.ok(financial.includes('{parsed.success && <div className="ws-financial-totals"'));
  assert.ok(financial.indexOf('className="ws-financial-totals"') < financial.indexOf('className="ws-financial-filter-panel"'));
  assert.ok(financial.includes('open={Object.values(filters).some(Boolean) || !parsed.success}'));
  assert.ok(financial.includes('method="get"'));
  assert.ok(billing.includes('<DropdownMenu.Portal>'));
  assert.ok(billing.includes('aria-label="Mais opções de compartilhamento"'));
  assert.ok(billing.includes('className="ws-payment-action"'));
  assert.ok(billing.includes('<Feedback error={state.error} />'));
  assert.ok(billing.includes('<span className="sr-only" role="status">{state.success}</span>'));
  assert.ok(billing.includes('await navigator.clipboard.writeText'));
  assert.ok(billing.includes('setCopied(null)'));
});
