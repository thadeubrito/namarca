import { expect, type Page } from '@playwright/test';

export function campaignSections(page: Page, includeHidden = false) {
  return page.getByRole('tablist', { name: 'Seções da campanha', exact: true, includeHidden });
}

export async function openStudio(page: Page) {
  const tab = campaignSections(page, true).getByRole('tab', { name: 'Artes', exact: true, includeHidden: true });
  if (await tab.getAttribute('aria-selected') !== 'true') await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('region', { name: 'Estúdio da campanha', exact: true, includeHidden: true })).toBeVisible();
  // The dynamic bundle and authenticated configuration can compile on the first visit.
  await expect(page.locator('.ws-studio-controls .ws-studio-library-panel')).toBeVisible({ timeout: 30_000 });
}

// Compatibility helper for domain scenarios: leave the visual sections via Detalhes.
export async function closeStudio(page: Page) {
  await campaignSections(page).getByRole('tab', { name: 'Detalhes', exact: true }).click();
}

export async function expectCollapsedStudioPreview(page: Page) {
  const preview = page.locator('.ws-studio-columns > .ws-studio-preview');
  await expect(preview).toBeVisible();
  const toggle = preview.getByRole('button', { name: 'Mostrar prévia', exact: true });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const contentId = await toggle.getAttribute('aria-controls');
  expect(contentId).toBeTruthy();
  const wrapper = page.locator(`[id="${contentId}"]`);
  await expect(wrapper).toHaveAttribute('hidden', '');
  await expect(wrapper.locator('iframe')).toHaveCount(1);
  await expect(wrapper.locator('iframe')).toBeHidden();
  if (page.viewportSize()!.width > 900) {
    const bounds = await preview.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(65);
    expect(bounds!.width).toBeGreaterThan(0);
  }
}

export async function expectStudioLayout(page: Page) {
  await expect(page.locator('.ws-studio-controls .ws-studio-library-panel')).toBeVisible();
  await expect(page.locator('.local-reference-canvas')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Editar área da foto', exact: true })).toHaveCount(0);
  const columns = page.locator('.ws-studio-columns');
  await expect(columns).toHaveCount(1);
  await expect(columns.locator(':scope > .ws-studio-controls')).toHaveCount(1);
  await expect(columns.locator(':scope > .ws-studio-preview')).toHaveCount(1);
  expect(await columns.evaluate(el => getComputedStyle(el).columnGap)).toBe('0px');
  await expect(page.locator('.ws-studio-preview')).toBeVisible();
  const controls = await page.locator('.ws-studio-controls').boundingBox();
  const preview = await page.locator('.ws-studio-preview').boundingBox();
  expect(controls).not.toBeNull();
  expect(preview).not.toBeNull();
  if (page.viewportSize()!.width > 900) {
    expect(Math.abs(controls!.x + controls!.width - preview!.x)).toBeLessThanOrEqual(1);
    expect(await page.locator('.ws-studio-preview').evaluate(el => getComputedStyle(el).borderLeftWidth)).toBe('1px');
    expect(Math.abs(controls!.y - preview!.y)).toBeLessThanOrEqual(2);
  } else {
    expect(Math.abs(preview!.y - controls!.y - controls!.height)).toBeLessThanOrEqual(1);
    expect(await page.locator('.ws-studio-preview').evaluate(el => getComputedStyle(el).borderTopWidth)).toBe('1px');
  }
  await expect(page.locator('.admin-shell')).toBeVisible();
  await expect(page.locator('.ws-studio-root')).not.toHaveAttribute('data-fullscreen', 'true');
  await expect(page.getByRole('navigation', { name: 'Áreas do estúdio' })).toHaveCount(0);
  for (const name of ['Abrir estúdio', 'Voltar à campanha', 'Ampliar prévia', 'Recolher prévia']) {
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
}
