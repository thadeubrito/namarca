import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';
import type { Pool } from 'pg';
import { campaignSections, openStudio } from './studio-navigation';

/** Independent from the legacy dirty-submit scenario; never issues a checkout. */
export async function testUnifiedTabs(page: Page, campaignId: string, pool: Pool) {
  const sections = campaignSections(page);
  const tab = (name: string) => sections.getByRole('tab', { name, exact: true });
  const original = (await pool.query('select name, notes, price_cents from campaigns where id=$1', [campaignId])).rows[0];
  await expect(sections.getByRole('tab')).toHaveText(['Detalhes', 'Artes', 'Figurinhas', 'Cores', 'Cobrança']);
  await expect(page.getByRole('tablist')).toHaveCount(1);
  await expect(tab('Detalhes')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Salvar detalhes', exact: true })).toBeVisible();
  // Keyboard navigation also switches the externally controlled studio section.
  await tab('Detalhes').focus();
  for (const [key, name] of [['ArrowRight', 'Artes'], ['ArrowRight', 'Figurinhas'], ['ArrowRight', 'Cores'], ['End', 'Cobrança'], ['Home', 'Detalhes']] as const) {
    await page.keyboard.press(key);
    await expect(tab(name)).toBeFocused();
    await expect(tab(name)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    const panelId = await tab(name).getAttribute('aria-controls');
    assert.equal(await page.getByRole('tabpanel').getAttribute('id'), panelId);
    assert.equal(await page.getByRole('tabpanel').getAttribute('aria-labelledby'), await tab(name).getAttribute('id'));
  }
  await page.getByLabel('Nome do evento', { exact: true }).fill('Detalhes locais recuperáveis');
  await page.getByRole('textbox', { name: /^Observações do combinado/ }).fill('Observações locais recuperáveis');
  await expect(tab('Detalhes')).toHaveAccessibleDescription('Alterações não salvas');
  const drafts = () => page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('namarca:form-draft:v1:')).map(key => ({ key, draft: JSON.parse(sessionStorage.getItem(key)!) })));
  await expect.poll(async () => (await drafts()).some(row => row.draft.values.name === 'Detalhes locais recuperáveis')).toBe(true);
  await tab('Cobrança').click();
  await page.locator('input[name=amount]').fill('234,56');
  await expect(tab('Cobrança')).toHaveAccessibleDescription('Alterações não salvas');
  await expect.poll(async () => (await drafts()).some(row => row.draft.values.amount === '234,56')).toBe(true);
  for (const { draft } of await drafts()) {
    assert.equal(draft.version, 1);
    assert.ok(Object.keys(draft.values).every(field => ['name', 'slug', 'endsAt', 'clientId', 'clientName', 'clientContact', 'notes', 'amount'].includes(field)), 'Draft storage contains only allow-listed fields');
  }
  await openStudio(page);
  const iframe = page.locator('iframe[title="Prévia real do editor da campanha"]');
  await expect(iframe).toHaveCount(1);
  const identity = await iframe.elementHandle();
  for (const name of ['Cores', 'Figurinhas', 'Detalhes', 'Artes']) {
    await tab(name).click();
    await expect(tab(name)).toHaveAttribute('aria-selected', 'true');
    assert.ok(await identity!.evaluate(el => el === document.querySelector('iframe[title="Prévia real do editor da campanha"]')), 'Unified sections preserve iframe identity');
    if (name === 'Detalhes') await expect(iframe).toBeHidden();
    else await expect(iframe).toBeVisible();
  }
  await tab('Detalhes').click();
  await expect(page.getByLabel('Nome do evento', { exact: true })).toHaveValue('Detalhes locais recuperáveis');
  page.once('dialog', dialog => { void dialog.accept(); });
  await page.reload();
  // One campaign-level decision restores every section, including hidden forms.
  const allRecoveries = page.getByRole('alertdialog', { name: 'Recuperar rascunho neste navegador?', exact: true, includeHidden: true });
  await expect(allRecoveries).toHaveCount(1);
  const recovery = page.getByRole('alertdialog', { name: 'Recuperar rascunho neste navegador?', exact: true });
  await expect(recovery).toBeVisible();
  await recovery.getByRole('button', { name: 'Recuperar rascunho', exact: true }).click();
  await expect(allRecoveries).toHaveCount(0);
  await tab('Detalhes').click();
  await expect(page.getByLabel('Nome do evento', { exact: true })).toHaveValue('Detalhes locais recuperáveis');
  await expect(page.getByRole('textbox', { name: /^Observações do combinado/ })).toHaveValue('Observações locais recuperáveis');
  await expect(tab('Detalhes')).toHaveAccessibleDescription('Alterações não salvas');
  await tab('Cobrança').click();
  await expect(page.locator('input[name=amount]')).toHaveValue('234,56');
  await expect(tab('Cobrança')).toHaveAccessibleDescription('Alterações não salvas');
  assert.deepEqual((await pool.query('select name, notes, price_cents from campaigns where id=$1', [campaignId])).rows[0], original, 'Recovery never persists details or billing');
  assert.equal((await pool.query('select count(*)::int as n from checkout_links where campaign_id=$1', [campaignId])).rows[0].n, 0);
  // No details draft: billing must still be offered immediately on initial Detalhes.
  await page.evaluate(() => {
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('namarca:form-draft:v1:dados:')) sessionStorage.removeItem(key);
  });
  page.once('dialog', dialog => { void dialog.accept(); });
  await page.reload();
  await expect(tab('Detalhes')).toHaveAttribute('aria-selected', 'true');
  await expect(recovery).toBeVisible();
  await recovery.getByRole('button', { name: 'Recuperar rascunho', exact: true }).click();
  await tab('Cobrança').click();
  await expect(page.locator('input[name=amount]')).toHaveValue('234,56');
  await expect(allRecoveries).toHaveCount(0);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ['Detalhes', 'Artes', 'Figurinhas', 'Cores', 'Cobrança']) {
      await tab(name).click();
      await expect(page.getByRole('tablist')).toHaveCount(1);
      await expect(page.getByRole('tabpanel')).toHaveCount(1);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const tops = await sections.getByRole('tab').evaluateAll(tabs => tabs.map(element => Math.round(element.getBoundingClientRect().top)));
      assert.equal(new Set(tops).size, 1, 'Campaign tabs remain on a single horizontal row');
      if (name !== 'Detalhes' && name !== 'Cobrança') {
        await expect(page.getByRole('button', { name: `Salvar ${name.toLowerCase()}`, exact: true })).toBeVisible();
      }
    }
    await page.screenshot({ path: `/tmp/namarca-unified-tabs-${width}.png` });
  }
  console.info('PASS UNIFIED_TABS_ONLY: unique horizontal sections at 1440/390px, keyboard/ARIA, scoped save controls, local allow-list drafts, refresh recovery, unchanged DB and retained iframe identity.');
}
