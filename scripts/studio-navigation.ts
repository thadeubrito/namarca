import { expect, type Page } from '@playwright/test';
export async function openStudio(page: Page) {
  const launch = page.getByRole('button', { name: 'Abrir estúdio', exact: true });
  if (!(await page.locator('.ws-studio-root').count()) || await page.locator('.ws-studio-root').getAttribute('data-fullscreen') !== 'true') {
    await expect(launch).toBeVisible();
    await launch.click();
  }
  await expect(page.locator('.ws-studio-root')).toHaveAttribute('data-fullscreen', 'true');
}
export async function closeStudio(page: Page) {
  const back = page.getByRole('button', { name: 'Voltar à campanha', exact: true });
  if (await back.isVisible()) await back.click();
}
