import { openStudio, closeStudio } from './studio-navigation';
import { expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

/** Synthetic fixture screenshots only; never call while displaying setup codes. */
export async function auditAdminVisuals(page: Page, base: string, campaignId: string) {
  if (process.env.ADMIN_VISUAL_AUDIT !== '1') return;
  await mkdir('/tmp/namarca-visual-audit', { recursive: true });
  const results = [];
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['light', 'dark']) {
      await page.goto(`${base}/admin`);
      const toggle = page.getByRole('button', { name: theme === 'dark' ? 'Ativar tema escuro' : 'Ativar tema claro', exact: true });
      await expect(page.getByRole('button', { name: /Ativar tema (claro|escuro)/ })).toBeEnabled();
      if (await toggle.count()) await toggle.click();
      await expect(page.locator('.admin-shell')).toHaveClass(theme === 'dark' ? /\bdark\b/ : /^(?!.*\bdark\b)/);
      await page.getByRole('button', { name: 'Minha conta', exact: true }).click();
      await expect(page.getByRole('menuitem', { name: 'Segurança da conta' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Minha conta', exact: true })).toBeFocused();
      const views = [
        { name: 'new-campaign', url: `${base}/admin/campanhas/nova` },
        { name: 'new-client', url: `${base}/admin/clientes/novo` },
        { name: 'campaigns', url: `${base}/admin` },
        { name: 'clients', url: `${base}/admin/clientes` },
        { name: 'studio', url: `${base}/admin/campanhas/${campaignId}`, tab: undefined },
        { name: 'data', url: `${base}/admin/campanhas/${campaignId}`, tab: 'Dados da campanha' },
        { name: 'approval', url: `${base}/admin/campanhas/${campaignId}`, tab: 'Aprovação visual' },
        { name: 'billing', url: `${base}/admin/campanhas/${campaignId}`, tab: 'Cobrança' },
      ];
      for (const view of views) {
        await page.goto(view.url);
        await expect(page.locator('.admin-shell')).toHaveClass(theme === 'dark' ? /\bdark\b/ : /^(?!.*\bdark\b)/);
        if (view.name === 'campaigns') {
          await page.getByLabel('Buscar campanhas', { exact: true }).fill('nenhuma-campanha-sintetica');
          await expect(page.getByRole('heading', { name: 'Nenhuma campanha nesta seleção' })).toBeVisible();
          await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
          await page.getByRole('button', { name: /^Aprovadas/ }).click();
          await expect(page.getByRole('button', { name: /^Aprovadas/ })).toHaveAttribute('aria-pressed', 'true');
          await page.getByRole('button', { name: /^Todas/ }).click();
        }
        if (view.tab) await page.getByRole('tab', { name: view.tab, exact: true }).click();
        if (view.name === 'studio') {
          await openStudio(page);
          await page.frameLocator('iframe[title="Prévia real do editor da campanha"]').getByRole('img', { name: 'Composição com a arte Moldura teste, sem foto', exact: true }).waitFor();
        }
        await page.locator('.admin-shell').evaluate(async el => {
          await document.fonts.ready;
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
          return el.className;
        });
        await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running' || animation.effect?.getTiming().iterations === Infinity));
        await page.screenshot({ path: `/tmp/namarca-visual-audit/${view.name}-${theme}-${width}.png`, fullPage: true });
        if (view.name === 'studio') {
          await openStudio(page);
          if (width === 390 || width === 768) {
            if (width === 390) await page.getByRole('navigation', { name: 'Áreas do estúdio' }).getByRole('button', { name: 'Área da foto', exact: true }).click();
          }
          await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running' || animation.effect?.getTiming().iterations === Infinity));
          await page.screenshot({ path: `/tmp/namarca-visual-audit/studio-fullscreen-${theme}-${width}.png` });
          await closeStudio(page);
        }
        const metrics = await page.evaluate(() => {
          const scope = document.querySelector('.admin-shell')!;
          const elements = Array.from(scope.querySelectorAll('input:not([type=hidden]), button, .ws-surface, .ws-studio-preview, .ws-studio-thumbnail'));
          return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, elements: elements.filter(el => el.getBoundingClientRect().width > 0).map(el => {
            const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
            return { tag: el.tagName, slot: el.getAttribute('data-slot'), text: el.getAttribute('aria-label') || el.textContent?.slice(0, 60), width: Math.round(r.width), height: Math.round(r.height), font: s.fontSize, color: s.color, background: s.backgroundColor, border: s.borderWidth, display: s.display, grid: s.gridTemplateColumns };
          }) };
        });
        expect(metrics.scrollWidth, `${view.name} ${theme} ${width}: horizontal overflow`).toBeLessThanOrEqual(width);
        results.push({ view: view.name, theme, width, ...metrics });
      }
    }
  }
  await writeFile('/tmp/namarca-visual-audit/metrics.json', JSON.stringify(results, null, 2));
  await page.setViewportSize({ width: 1440, height: 1400 });
  await page.goto(`${base}/admin/campanhas/${campaignId}`);
  await openStudio(page);
}
