import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { suggestCampaignSlug } from '../src/lib/campaign-slug';

test('creation suggests normalized bounded addresses without changing server validation', () => {
  assert.equal(suggestCampaignSlug('  Corrida São João — 2027! '), 'corrida-sao-joao-2027');
  assert.equal(suggestCampaignSlug('🎉'), '');
  assert.equal(suggestCampaignSlug('a'.repeat(79) + ' teste'), 'a'.repeat(79));
});

test('dialog and standalone route share the basic form and keep editing separate', async () => {
  const form = await readFile('src/components/admin-workspace/campaign-create-form.tsx', 'utf8');
  const dialog = await readFile('src/components/admin-workspace/campaign-create-dialog.tsx', 'utf8');
  const route = await readFile('src/app/admin/(workspace)/campanhas/nova/page.tsx', 'utf8');
  const list = await readFile('src/app/admin/(workspace)/page.tsx', 'utf8');
  assert.match(list, /action=\{<CampaignCreateDialog \/>\}/);
  for (const source of [route, dialog]) assert.match(source, /<CampaignCreateForm/);
  for (const field of ['name', 'slug', 'endsAt']) assert.ok(form.includes(`name="${field}"`));
  assert.doesNotMatch(form, /name="(?:clientId|clientName|clientContact|notes)"/);
  assert.match(form, /if \(!customSlug\) setSlug/);
  assert.match(form, /<fieldset disabled=\{pending\}/);
  assert.match(form, /role="alert"/);
  assert.match(dialog, /if \(!pending\) setOpen/);
  assert.match(dialog, /onInteractOutside=\{event => event.preventDefault\(\)\}/);
});
