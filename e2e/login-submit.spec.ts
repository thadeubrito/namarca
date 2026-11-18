import { test, expect } from '@playwright/test';

test('login envia POST via JS e nunca coloca credenciais na URL', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Entrar no administrativo' })).toBeEnabled();
  await page.getByLabel('E-mail', { exact: true }).fill('invalid@namarca.test');
  await page.getByLabel('Senha', { exact: true }).fill('synthetic-invalid-password');
  const responsePromise = page.waitForResponse(response => response.url().includes('/api/auth/sign-in/email'));
  await page.getByRole('button', { name: 'Entrar no administrativo' }).click();
  const response = await responsePromise;
  expect(response.request().method()).toBe('POST');
  await expect(page.locator('.error[role="alert"]')).toContainText('Não foi possível entrar');
  expect(new URL(page.url()).search).toBe('');
  expect(failures).toEqual([]);
});

test('sem JavaScript formulário falha fechado e usa POST', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/login');
    const form = page.locator('form');
    await expect(form).toHaveAttribute('method', 'post');
    await expect(form).toHaveAttribute('action', '/api/auth/form-unavailable');
    await expect(page.getByRole('button')).toBeDisabled();
    await expect(page.getByRole('alert')).toContainText('Ative o JavaScript');
    expect(new URL(page.url()).search).toBe('');
  } finally { await context.close(); }
});
