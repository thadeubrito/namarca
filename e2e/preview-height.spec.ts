import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const studio = readFileSync('src/components/admin-workspace/studio.css', 'utf8');
const editor = readFileSync('src/editor/isolated.css', 'utf8');

// CSS-only regression fixture, no authentication, campaign data or storage.
for (const order of ['studio-first', 'editor-first']) {
  for (const theme of ['light', 'dark']) {
    test(`preview keeps its height: ${order}, ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const styles = order === 'studio-first' ? [studio, editor] : [editor, studio];
      await page.setContent(`<!doctype html><html><head><style>
        html,body { margin:0; } .fixture { width:380px; padding:20px; box-sizing:border-box; }
        ${styles.join('\n')}
        </style></head><body><div class="fixture ws-studio-root" style="--line:#aaa;--surface:#fff">
        <div class="ws-studio-preview-content"><div class="ws-studio-device">
        <div class="campaign-editor-scope editor-preview"><div class="editor-page" data-admin-theme="${theme}">
        <section class="dedicated-editor"><header class="editor-header">Histórico</header>
        <div class="workspace-stage"><div class="preview-empty-artwork" role="img" aria-label="Composição"></div></div>
        <footer class="editor-footer"><button>Foto</button></footer></section>
        </div></div></div></div></div></body></html>`);
      const dimensions = () => page.locator('.ws-studio-device').evaluate(device => {
        const preview = device.querySelector('.editor-preview')!;
        const content = device.querySelector('.editor-page')!;
        return [device, preview, content].map(el => el.getBoundingClientRect().height);
      });
      for (const height of (await dimensions())) expect(height).toBeGreaterThan(600);
      await expect(page.getByRole('button', { name: 'Foto' })).toBeInViewport();
      await page.locator('.ws-studio-preview-content').evaluate(el => { (el as HTMLElement).hidden = true; });
      await expect(page.getByRole('button', { name: 'Foto' })).toBeHidden();
      await page.locator('.ws-studio-preview-content').evaluate(el => { (el as HTMLElement).hidden = false; });
      for (const height of (await dimensions())) expect(height).toBeGreaterThan(600);
      await page.setViewportSize({ width: 390, height: 640 });
      for (const height of (await dimensions())) {
        expect(height).toBeGreaterThanOrEqual(358);
        expect(height).toBeLessThanOrEqual(360);
      }
      await expect(page.getByRole('button', { name: 'Foto' })).toBeInViewport();
    });
  }
}
