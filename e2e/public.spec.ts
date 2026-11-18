import { test, expect } from '@playwright/test';
for (const width of [1440, 390]) {
  test(`login acessível e sem overflow em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Entre na sua conta' })).toBeVisible();
    await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar no administrativo' })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/login-${width}.png`, fullPage: true });
  });
}
test('admin e configuração exigem login', async ({ page }) => {
  await page.goto('/admin'); await expect(page).toHaveURL(/\/login$/);
  await page.goto('/seguranca'); await expect(page).toHaveURL(/\/login$/);
});
test('signup indisponível e webhook sem assinatura rejeitado', async ({ request }) => {
  const signup = await request.post('/api/auth/sign-up/email', { data: { email: 'attacker@namarca.test', password: 'not-a-real-account-12345', name: 'Attacker' }, headers: { origin: 'http://localhost:3000' } });
  expect(signup.ok()).toBe(false);
  const webhook = await request.post('/api/webhooks/pixgo', { data: { event: 'payment.completed' } });
  expect(webhook.status()).toBe(401);
});
