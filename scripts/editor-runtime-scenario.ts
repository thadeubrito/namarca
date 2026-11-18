import assert from 'node:assert/strict';
import { expect, type BrowserContext, type Download, type Locator, type Page, type Route } from '@playwright/test';
import { PNG } from 'pngjs';
import type { EventConfig } from '../packages/editor/src/events/events';

type Props = {
  page: Page;
  context: BrowserContext;
  base: string;
  campaignId: string;
  event: EventConfig;
  photo: Buffer;
};

/**
 * Fixtures sintéticas; não publica nem envia fotos. O caller já tem foto e sticker na
 * prévia live. Compara contrato PNG/dimensões e ordem de grandeza, NÃO pixels ou
 * igualdade de bytes (o público começa sem sticker). Não cobre CDN/publicação,
 * touch físico, compartilhamento nativo ou materiais reais.
 * evaluate é usado apenas para inspeção e injeção de mensagens na fronteira do
 * protocolo, nunca para clicar, carregar foto ou exportar. O caso de origem
 * inválida usa MessageEvent sintético, não uma navegação cross-origin real.
 */
export async function testEditorRuntime({ page, context, base, campaignId, event, photo }: Props) {
  const origin = new URL(base).origin;
  const root = base.replace(/\/$/, '');
  const slug = `runtime-${crypto.randomUUID()}`;
  const endedSlug = `${slug}-ended`;
  const manifest: EventConfig = { ...event, slug, endsAt: '2099-12-31T23:59:59Z' };
  assert.ok(manifest.artworks.length, 'O cenário exige ao menos uma arte');
  const ended: EventConfig = { ...manifest, slug: endedSlug, endsAt: '2000-01-01T00:00:00Z' };
  const ownedRoutes: { url: string; handler: (route: Route) => Promise<void> }[] = [];
  const opened: Page[] = [];
  const mutations: string[] = [];
  const assetsRead = new Set<string>();
  const watchRequest = (request: import('@playwright/test').Request) => {
    if (opened.includes(request.frame().page()) && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      mutations.push(`${request.method()} ${new URL(request.url()).pathname}`);
    }
  };
  const route = async (url: string, handler: (route: Route) => Promise<void>) => {
    await context.route(url, handler);
    ownedRoutes.push({ url, handler });
  };
  const pngDownload = async (owner: Page, button: Locator) => {
    const pending = owner.waitForEvent('download');
    await button.click();
    const download: Download = await pending;
    assert.equal(await download.failure(), null);
    assert.match(download.suggestedFilename(), /\.png$/i);
    const stream = await download.createReadStream();
    assert.ok(stream);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const bytes = Buffer.concat(chunks);
    assert.ok(bytes.length > 100, 'PNG não pode ser vazio');
    const decoded = PNG.sync.read(bytes, { checkCRC: true });
    assert.ok(decoded.data.some((value, index) => index % 4 === 3 && value > 0), 'PNG deve conter pixels visíveis');
    return { bytes: bytes.length, width: decoded.width, height: decoded.height };
  };
  const styles = (button: Locator) => button.evaluate(element => {
    const css = getComputedStyle(element);
    return Object.fromEntries([
      'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
      'border-top-width', 'border-top-style', 'border-top-color', 'border-radius',
      'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'background-color', 'color', 'transform', 'box-shadow', 'opacity',
    ].map(property => [property, css.getPropertyValue(property)]));
  });
  try {
    // Chromium treats fulfilled top-level fixture HTML as an unknown address space.
    // Fulfill its static subresources too; bytes still come from the actual build.
    await route(`${origin}/event-runtime/**`, async intercepted => {
      const response = await context.request.get(intercepted.request().url());
      await intercepted.fulfill({ response });
    });
    for (const config of [manifest, ended]) {
      await route(`${origin}/${config.slug}`, async intercepted => {
        const response = await context.request.get(`${root}/event-runtime/index.html`);
        assert.equal(response.status(), 200, 'Runtime público estático deve existir');
        await intercepted.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: await response.body() });
      });
      await route(`${origin}/events/${config.slug}/event.json`, async intercepted => {
        await intercepted.fulfill({ json: config });
      });
      for (const material of [...config.artworks, ...config.stickers]) {
        const id = material.file.replace(/\.png$/i, '');
        assert.match(id, /^[0-9a-f-]{36}$/i, 'Materiais devem ser UUIDs privados, sem caminhos');
        await route(`${origin}/events/${config.slug}/${material.file}`, async intercepted => {
          // API privada recebe UUID SEM .png. Apenas GET de materiais existentes.
          const response = await context.request.get(`${root}/api/campaigns/${campaignId}/assets/${id}`);
          assert.equal(response.status(), 200);
          assetsRead.add(material.file);
          await intercepted.fulfill({ status: 200, contentType: 'image/png', body: await response.body() });
        });
      }
    }
    const publicPage = await context.newPage();
    opened.push(publicPage);
    context.on('request', watchRequest);
    await publicPage.setViewportSize({ width: 390, height: 844 });
    const runtimeErrors: string[] = [];
    publicPage.on('pageerror', error => runtimeErrors.push(error.message));
    await publicPage.goto(`${origin}/${slug}`);
    const iframe = page.locator('iframe[title="Prévia real do editor da campanha"]');
    await expect(iframe).toBeVisible();
    const frame = await (await iframe.elementHandle())!.contentFrame();
    assert.ok(frame);
    await expect(frame.getByRole('region', { name: 'Editor de composição' })).toBeVisible({ timeout: 30_000 });
    try { await expect(publicPage.getByRole('region', { name: 'Editor de composição' })).toBeVisible({ timeout: 30_000 }); }
    catch { throw new Error(`Static runtime did not mount: ${JSON.stringify({ errors: runtimeErrors, body: await publicPage.locator('body').innerText(), url: publicPage.url() })}`) }
    assert.ok(await frame.evaluate(() => innerWidth) <= 390, 'Viewport da prévia deve ser de celular');
    const isolated = await frame.evaluate(() => ({
      styles: Array.from(document.styleSheets, sheet => sheet.href || ''),
      resources: performance.getEntriesByType('resource').map(entry => entry.name),
    }));
    assert.ok(isolated.styles.some(url => /event-runtime\/.*\.css/.test(url)), 'Prévia usa CSS estático do editor');
    for (const url of [...isolated.styles, ...isolated.resources]) {
      assert.doesNotMatch(url, /\/_next(?:\/|\?)|globals(?:\.[^/]*)?\.css/i, 'Sem CSS/JS administrativo na prévia');
    }
    const composition = frame.getByRole('img', { name: /^Composição com a arte / });
    const initialLabel = await composition.getAttribute('aria-label');
    assert.ok(initialLabel?.endsWith(' e sua foto'), 'Caller deve fornecer prévia com foto');
    const artwork = event.artworks.find(art => initialLabel === `Composição com a arte ${art.name} e sua foto`);
    assert.ok(artwork, 'Arte selecionada deve pertencer ao manifesto fornecido');
    if (artwork.id !== manifest.artworks[0].id) {
      await publicPage.getByRole('button', { name: 'Artes', exact: true }).click();
      await publicPage.getByRole('button', { name: `Arte ${artwork.name} ${artwork.width} × ${artwork.height} px`, exact: true }).click();
      await publicPage.keyboard.press('Escape');
    }
    await expect(publicPage.getByRole('button', { name: 'Foto', exact: true })).toBeEnabled({ timeout: 30_000 });
    await expect(publicPage.getByRole('img', { name: `Composição com a arte ${artwork.name}, sem foto`, exact: true })).toBeVisible({ timeout: 30_000 });
    await publicPage.getByLabel('Escolher ou substituir foto', { exact: true }).setInputFiles({ name: 'foto-sintetica.png', mimeType: 'image/png', buffer: photo });
    await expect(publicPage.getByRole('img', { name: `Composição com a arte ${artwork.name} e sua foto`, exact: true })).toBeVisible();
    // Fecha eventual painel do caller por teclado, sem substituir sua composição.
    await frame.getByRole('button', { name: 'Artes', exact: true }).focus();
    await page.keyboard.press('Escape');
    for (const name of ['Foto', 'Artes', 'Stickers', 'Salvar']) {
      const privateButton = frame.getByRole('button', { name, exact: true });
      const publicButton = publicPage.getByRole('button', { name, exact: true });
      // Mesmo foco nos dois documentos; depois compara repouso e hover.
      await privateButton.focus();
      await publicButton.focus();
      await page.mouse.move(0, 0);
      await publicPage.mouse.move(0, 0);
      await expect.poll(async () => styles(privateButton)).toEqual(await styles(publicButton));
      await privateButton.hover();
      await publicButton.hover();
      await expect.poll(async () => styles(privateButton)).toEqual(await styles(publicButton));
    }
    // Um evento válido seria observável pelo nome da campanha no painel Ajuda.
    const marker = `mensagem-rejeitada-${slug}`;
    const payload = { type: 'namarca:preview', campaignId, event: { ...event, name: marker, color: '#ff00ff' } };
    await page.evaluate(({ payload, origin }) => {
      const target = document.querySelector<HTMLIFrameElement>('iframe[title="Prévia real do editor da campanha"]')!.contentWindow!;
      target.postMessage({ ...payload, campaignId: 'campanha-errada' }, origin);
    }, { payload, origin });
    await frame.evaluate(({ payload, origin }) => {
      // Origem correta, source incorreto: a própria janela, não seu parent.
      window.postMessage(payload, origin);
      window.dispatchEvent(new MessageEvent('message', { data: payload, origin: 'https://invalid.example', source: window.parent }));
    }, { payload, origin });
    await publicPage.evaluate(payload => window.postMessage(payload, window.location.origin), payload);
    // Round-trip de tarefas message: evita assert antes de o navegador entregar as mensagens.
    for (const target of [frame, publicPage]) {
      await target.evaluate(() => new Promise<void>(resolve => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => { channel.port1.close(); channel.port2.close(); resolve(); };
        channel.port2.postMessage('barrier');
      }));
      await target.getByRole('button', { name: 'Ajuda', exact: true }).click();
      await expect(target.locator('.help-tools strong')).toHaveText(event.name);
      await expect(target.getByText(marker, { exact: true })).toHaveCount(0);
      await target.getByRole('button', { name: 'Fechar painel', exact: true }).click();
    }
    await expect(composition).toHaveAttribute('aria-label', initialLabel!);
    await page.getByRole('button', { name: 'Ampliar prévia', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Recolher prévia', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await expect(composition).toHaveAttribute('aria-label', initialLabel!);
    await page.getByRole('button', { name: 'Recolher prévia', exact: true }).click();
    await expect(composition).toHaveAttribute('aria-label', initialLabel!);
    await iframe.evaluate(el => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 100));
    const privatePNG = await pngDownload(page, frame.getByRole('button', { name: 'Salvar', exact: true }));
    const publicPNG = await pngDownload(publicPage, publicPage.getByRole('button', { name: 'Salvar', exact: true }));
    for (const png of [privatePNG, publicPNG]) {
      assert.equal(png.width, artwork.width);
      assert.equal(png.height, artwork.height);
    }
    assert.deepEqual(runtimeErrors, [], 'Runtime público não deve lançar erros de JavaScript');
    if (process.env.EDITOR_RUNTIME_SHOTS === '1') {
      await iframe.screenshot({ path: '/tmp/namarca-runtime-preview.png' });
      await publicPage.screenshot({ path: '/tmp/namarca-runtime-public.png' });
    }
    const originalViewport = page.viewportSize();
    try {
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Estúdio sem overflow horizontal em 390px');
      assert.ok(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Prévia sem overflow horizontal em 390px');
      await expect(composition).toHaveAttribute('aria-label', initialLabel!);
    } finally { if (originalViewport) await page.setViewportSize(originalViewport) }
    assert.ok(assetsRead.has(artwork.file), 'Público leu a arte pelo caminho público simulado');
    const endedPage = await context.newPage();
    opened.push(endedPage);
    await endedPage.goto(`${origin}/${endedSlug}`);
    await expect(endedPage.getByRole('heading', { name: 'Ativação encerrada', exact: true })).toBeVisible();
    await expect(endedPage.getByRole('region', { name: 'Editor de composição' })).toHaveCount(0);
    await expect(endedPage.locator('input[type=file]')).toHaveCount(0);
    assert.deepEqual(mutations, [], 'Foto/composição/exportação não devem gerar mutações de rede');
  } finally {
    context.off('request', watchRequest);
    try {
      await Promise.all(opened.map(openedPage => openedPage.close()));
    } finally {
      // Remove apenas handlers registrados aqui, preservando outros cenários.
      for (const { url, handler } of ownedRoutes.reverse()) await context.unroute(url, handler);
    }
  }
}
