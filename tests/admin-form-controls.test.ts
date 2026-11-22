import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('controles ativos usam Select e Calendar shadcn sem mudar names dos formulários', async () => {
  const controls = await readFile('apps/admin/src/components/admin-workspace/form-controls.tsx', 'utf8');
  const campaign = await readFile('apps/admin/src/components/admin-workspace/campaign-form.tsx', 'utf8');
  const financial = await readFile('apps/admin/src/app/(workspace)/financeiro/page.tsx', 'utf8');
  assert.ok(controls.includes("from '@/components/ui/select'"));
  assert.ok(controls.includes("from '@/components/ui/calendar'"));
  assert.ok(controls.includes("from '@/components/ui/popover'"));
  assert.ok(controls.includes('locale={ptBR}'));
  assert.ok(controls.includes("new Event('change', { bubbles: true })"));
  assert.ok(controls.includes('required={required} onInvalid='));
  assert.ok(campaign.includes('setEndsAt(values.endsAt'));
  assert.ok(campaign.includes('<DatePickerField name="endsAt"'));
  assert.ok(campaign.includes('<SelectField name="clientId"'));
  assert.doesNotMatch(campaign + financial, /<select\b|type="date"/);
  for (const name of ['campaign', 'status', 'from', 'to']) assert.ok(financial.includes(`name="${name}"`));
  assert.ok(financial.includes('method="get"'));
});
