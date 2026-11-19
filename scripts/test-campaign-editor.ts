import { openStudio, closeStudio } from './studio-navigation';
import { auditAdminVisuals } from './admin-visual-audit';
import { expectEditorReference, setEditorReference } from "./editor-reference-helper";
// Container-only integration runner. Never point this at the normal application/database.
import assert from 'node:assert/strict';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { chromium, expect, request as playwrightRequest } from '@playwright/test';
import { hashPassword } from 'better-auth/crypto';
import { Pool } from 'pg';
import { PNG } from 'pngjs';
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { testEditorGallery } from './editor-gallery-scenario';
import { testEditorRuntime } from './editor-runtime-scenario';

const base = 'http://namarca-editor-test:3000';
const email = 'editor-test@namarca.test';
const database = new URL(process.env.DATABASE_URL!);
assert.match(database.pathname, /_editor_test$/, 'Only disposable *_editor_test databases are allowed');
assert.equal(process.env.BETTER_AUTH_URL, base);
assert.equal(process.env.ADMIN_EMAIL, email);
const pool = new Pool({ connectionString: database.href });
const id = randomUUID();
const password = randomBytes(30).toString('base64url');
let campaignId = '';
const clientIds: string[] = [];
let secondCampaignId = '';
let stage = 'fixture safety';
const privateKeys: string[] = [];
const s3 = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION, forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! } });

function totp(uri: string) {
  const secret = new URL(uri).searchParams.get('secret')!;
  const bits = [...secret.replace(/=+$/, '').toUpperCase()].map(c => {
    const value = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c);
    assert.ok(value >= 0); return value.toString(2).padStart(5, '0');
  }).join('');
  const key = Buffer.from(bits.match(/.{8}/g)!.map(b => parseInt(b, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac('sha1', key).update(counter).digest();
  return ((digest.readUInt32BE(digest[digest.length - 1] & 15) & 0x7fffffff) % 1000000).toString().padStart(6, '0');
}
function png(size: number, kind: 'artwork' | 'sticker' | 'photo') {
  const image = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    image.data[i] = kind === 'photo' ? 221 : 40;
    image.data[i + 1] = kind === 'photo' ? 106 : 190;
    image.data[i + 2] = 80;
    image.data[i + 3] = kind === 'photo' || (kind === 'artwork' ? x < 40 || y < 40 || x >= size - 40 || y >= size - 40 : Math.hypot(x - size / 2, y - size / 2) < size / 3) ? 255 : 0;
  }
  return PNG.sync.write(image);
}
async function main() {
  assert.equal((await pool.query('select count(*)::int as n from auth_user')).rows[0].n, 0, 'Fixture DB must have no accounts');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 1400 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  try {
    stage = 'provision isolated account';
    await pool.query('insert into auth_user (id,name,email,email_verified,created_at,updated_at) values ($1,$2,$3,true,now(),now())', [id, 'Editor integration', email]);
    await pool.query('insert into auth_account (id,account_id,provider_id,user_id,password,created_at,updated_at) values ($1,$2,$3,$2,$4,now(),now())', [randomUUID(), id, 'credential', await hashPassword(password)]);
    stage = 'client directory rejects anonymous access';
    for (const path of ['/admin/clientes', '/admin/clientes/novo', `/admin/clientes/${randomUUID()}`]) {
      const response = await context.request.get(`${base}${path}`, { maxRedirects: 0 });
      assert.ok([302, 303, 307, 308, 401, 403].includes(response.status()));
    }
    stage = 'browser password login';
    await page.goto(`${base}/login`);
    if (process.env.ADMIN_UI_SHOTS === '1') {
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.screenshot({ path: `/tmp/namarca-login-light-${width}.png` });
        await page.getByRole('button', { name: 'Ativar tema escuro', exact: true }).click();
        await expect(page.locator('input[name=email]')).toHaveCSS('color', 'rgb(250, 250, 250)');
        await page.screenshot({ path: `/tmp/namarca-login-dark-${width}.png` });
        await page.getByRole('button', { name: 'Ativar tema claro', exact: true }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      }
      await page.setViewportSize({ width: 1440, height: 1400 });
    }
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar no administrativo' }).click();
    await page.waitForURL('**/seguranca');
    stage = 'financial report rejects enrollment-only session';
    assert.equal((await context.request.get(`${base}/api/campaigns/${randomUUID()}/financial-report`)).status(), 403);
    assert.equal((await context.request.get(`${base}/api/campaigns/invalid/financial-report`)).status(), 403);
    stage = 'client directory rejects enrollment-only session';
    const enrollmentClients = await context.request.get(`${base}/admin/clientes`, { maxRedirects: 0 });
    assert.ok([302, 303, 307, 308, 401, 403].includes(enrollmentClients.status()));
    stage = 'browser TOTP enrollment';
    await page.getByLabel('Confirme sua senha').fill(password);
    await page.getByRole('button', { name: 'Configurar autenticador' }).click();
    await page.getByText('Configurar manualmente', { exact: true }).click();
    const uri = await page.locator('details code').innerText();
    await page.getByRole('checkbox').check();
    await page.getByLabel('Código de seis dígitos').fill(totp(uri));
    await page.getByRole('button', { name: 'Verificar código' }).click();
    await page.waitForURL('**/admin');
    stage = 'client directory create, search, edit and reload';
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Clientes', exact: true }).click();
    await expect(page.getByText('Nenhum cliente cadastrado.', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Novo cliente', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Novo cliente', exact: true })).toBeVisible();
    await expect(page.getByLabel('Nome do cliente', { exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Novo cliente', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Novo cliente', exact: true }).click();
    await page.getByLabel('Nome do cliente', { exact: true }).fill('Cliente diretório sintético');
    await page.getByRole('textbox', { name: /^Contato/ }).fill('diretorio@example.test');
    await page.getByRole('button', { name: 'Cadastrar cliente', exact: true }).click();
    await page.waitForURL(/\/admin\/clientes\/[0-9a-f-]+\?salvo=1$/);
    const directoryId = new URL(page.url()).pathname.split('/').pop()!;
    clientIds.push(directoryId);
    await expect(page.getByRole('status')).toHaveText('Cliente salvo.');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Clientes', exact: true }).click();
    await page.getByLabel('Buscar por nome ou contato').fill('diretorio@example.test');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await page.getByRole('link', { name: 'Cliente diretório sintético', exact: true }).click();
    await page.getByLabel('Nome do cliente', { exact: true }).fill('Cliente diretório atualizado');
    await page.getByRole('textbox', { name: /^Contato/ }).fill('');
    await page.getByRole('button', { name: 'Salvar cliente', exact: true }).click();
    await expect.poll(async () => (await pool.query('select name,contact from clients where id=$1', [directoryId])).rows[0]).toEqual({ name: 'Cliente diretório atualizado', contact: '' });
    await page.reload();
    await expect(page.getByLabel('Nome do cliente', { exact: true })).toHaveValue('Cliente diretório atualizado');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Clientes', exact: true }).click();
    await page.getByLabel('Buscar por nome ou contato').fill('diretório atualizado');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Cliente diretório atualizado', exact: true })).toBeVisible();
    await page.getByLabel('Buscar por nome ou contato').fill('sem-resultado-sintetico');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByText('Nenhum cliente encontrado.', { exact: false })).toBeVisible();
    stage = 'create campaign through UI';
    await page.goto(`${base}/admin/campanhas/nova`);
    if (process.env.CAMPAIGN_SECTIONS_ONLY === '1') {
      await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click();
      await expect(page.getByLabel('Nome do evento')).toBeFocused();
      assert.equal(new URL(page.url()).pathname, '/admin/campanhas/nova');
    }
    await page.getByLabel('Nome do evento').fill('Integração editor isolada');
    await page.getByLabel('Endereço da campanha').fill(`editor-test-${randomBytes(5).toString('hex')}`);
    await page.getByLabel('Data de encerramento').fill('2099-12-31');
    await page.getByRole('button', { name: 'Salvar rascunho' }).click();
    await page.waitForURL(/\/admin\/campanhas\/[0-9a-f-]+$/);
    campaignId = new URL(page.url()).pathname.split('/').pop()!;
    stage = 'client directory linked campaigns and inherited options';
    await closeStudio(page);
    await page.getByRole('tab', { name: 'Dados da campanha', exact: true }).click();
    await page.getByLabel('Cliente', { exact: true }).selectOption(directoryId);
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await expect.poll(async () => (await pool.query('select client_id from campaigns where id=$1', [campaignId])).rows[0].client_id).toBe(directoryId);
    await page.goto(`${base}/admin/clientes/${directoryId}`);
    await expect(page.getByRole('region', { name: 'Campanhas do cliente' }).getByRole('link', { name: 'Integração editor isolada' })).toHaveAttribute('href', `/admin/campanhas/${campaignId}`);
    await page.getByRole('region', { name: 'Campanhas do cliente' }).getByRole('link').click();
    await closeStudio(page);
    await page.getByRole('tab', { name: 'Dados da campanha', exact: true }).click();
    await expect(page.getByLabel('Cliente', { exact: true })).toHaveValue(directoryId);
    await page.goto(`${base}/admin/clientes/${directoryId}`);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Client details must fit mobile viewport');
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Clientes', exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Client directory must fit mobile viewport');
    await page.setViewportSize({ width: 1440, height: 1400 });
    await page.goto(`${base}/admin/campanhas/${campaignId}`);
    console.info('PASS client directory: anonymous/enrollment blocked, create/edit/reload, search name/contact and empty result, linked campaign, mobile overflow checks.');
    if (process.env.CAMPAIGN_SECTIONS_ONLY === '1') {
      stage = 'campaign sections visibility, keyboard and draft retention';
      const labels = ['Dados da campanha', 'Aprovação visual', 'Cobrança'];
      await expect(page.getByRole('tab', { name: 'Estúdio', exact: true })).toHaveCount(0);
      for (const name of labels) {
        await page.getByRole('tab', { name, exact: true }).click();
        await openStudio(page);
        await closeStudio(page);
        await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
      }
      console.info('PASS campaign sections: no studio tab, independent launch returns to selected section.');
      return;
    }
    if (process.env.CLIENT_DIRECTORY_ONLY === '1') return;
    stage = 'studio loads only on demand';
    await expect(page.getByRole('button', { name: 'Abrir estúdio', exact: true })).toBeVisible();
    await expect(page.locator('iframe[title="Prévia real do editor da campanha"]')).toHaveCount(0);
    await expect(page.locator('.ws-studio-root')).toHaveCount(0);
    stage = 'upload validation feedback preserves empty draft';
    await openStudio(page);
    const uploadStudio = page.getByRole('region', { name: 'Estúdio da campanha' });
    await expect(uploadStudio.getByLabel('Adicionar arte PNG')).toBeEnabled();
    await uploadStudio.getByLabel('Adicionar arte PNG').setInputFiles({ name: 'opaque-synthetic.png', mimeType: 'image/png', buffer: png(80, 'photo') });
    await expect(uploadStudio.getByRole('status')).toContainText('totalmente transparente e um totalmente opaco', { timeout: 60_000 });
    await uploadStudio.getByLabel('Adicionar arte PNG').setInputFiles({ name: 'invalid-synthetic.png', mimeType: 'image/png', buffer: Buffer.from('synthetic invalid PNG') });
    await expect(uploadStudio.getByRole('status')).toContainText('Exporte novamente como PNG', { timeout: 60_000 });
    assert.equal((await pool.query('select count(*)::int as n from campaign_assets where campaign_id=$1', [campaignId])).rows[0].n, 0);
    if (process.env.UPLOAD_FEEDBACK_ONLY === '1') return;
    stage = 'dirty studio blocks cancelled base-data submit and permits confirmed submit';
    await page.getByRole('tab', { name: 'Cores', exact: true }).click();
    const studio = page.getByRole('region', { name: 'Estúdio da campanha' });
    const color = studio.getByLabel('Cor da campanha', { exact: true });
    await expect(color).toBeVisible();
    const original = (await pool.query('select name,price_cents from campaigns where id=$1', [campaignId])).rows[0];
    const originalEditor = await (await context.request.get(`${base}/api/campaigns/${campaignId}/editor`)).json();
    assert.equal(originalEditor.event.artworks.length, 0);
    const dirtyColor = (await color.inputValue()) === '#123456' ? '#654321' : '#123456';
    // Playwright fill on color inputs triggers React's real change path.
    await color.fill(dirtyColor);
    await expect(studio.getByRole('status')).toHaveText('Alterações não salvas.');
    await closeStudio(page);
    await page.getByRole('tab', { name: 'Dados da campanha', exact: true }).click();
    await page.getByLabel('Nome do evento', { exact: true }).fill('Dados base confirmados');
    await page.locator('input[name=price]').fill('123,45');
    const submitBase = async (accept: boolean) => {
      const dialogHandled = page.waitForEvent('dialog').then(async dialog => {
        assert.equal(dialog.type(), 'confirm');
        assert.match(dialog.message(), /Salvar os dados da campanha pode descartá-las/);
        if (accept) await dialog.accept(); else await dialog.dismiss();
      });
      await Promise.all([dialogHandled, page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()]);
    };
    const baseMutations: string[] = [];
    const trackBaseMutation = (req: import('@playwright/test').Request) => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method())) baseMutations.push(req.url());
    };
    page.on('request', trackBaseMutation);
    try {
      await submitBase(false);
      await openStudio(page);
      await expect(color).toHaveValue(dirtyColor);
      await expect(studio.getByRole('status')).toContainText('Alterações não salvas');
      assert.deepEqual((await pool.query('select name,price_cents from campaigns where id=$1', [campaignId])).rows[0], original);
      assert.equal(baseMutations.length, 0, 'Dismiss must prevent the real form mutation');
      await closeStudio(page);
    await page.getByRole('tab', { name: 'Dados da campanha', exact: true }).click();
      await submitBase(true);
      await page.getByText('Dados da campanha salvos.', { exact: true }).waitFor();
      await expect.poll(async () => (await pool.query('select name,price_cents from campaigns where id=$1', [campaignId])).rows[0]).toEqual({ name: 'Dados base confirmados', price_cents: 12345 });
      assert.ok(baseMutations.length > 0, 'Accept must allow the real form mutation');
      await page.reload();
      await closeStudio(page);
    await page.getByRole('tab', { name: 'Dados da campanha', exact: true }).click();
      await expect(page.getByLabel('Nome do evento', { exact: true })).toHaveValue('Dados base confirmados');
      await expect(page.locator('input[name=price]')).toHaveValue('123,45');
      const unchangedEditor = await (await context.request.get(`${base}/api/campaigns/${campaignId}/editor`)).json();
      assert.equal(unchangedEditor.revision, originalEditor.revision);
      assert.equal(unchangedEditor.event.color, originalEditor.event.color, 'Base-data submit must not save the dirty studio');
    } finally { page.off('request', trackBaseMutation); }
    console.info('PASS dirty guard: real base-data submit dismissed with no mutation, DB name/price intact and dirty color preserved; second submit confirmed, DB and reload verified; studio not saved.');
    if (process.env.DIRTY_GUARD_ONLY === '1') {
      assert.equal(await page.locator('form[data-campaign-approval=true]').count(), 0);
      console.info('LIMITATION: empty-draft focused run has no approval form; dirty approval alert not exercised.');
      return;
    }
    if (process.env.ADMIN_UI_SHOTS === '1') {
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.screenshot({ path: `/tmp/namarca-admin-light-${width}.png` });
        await page.getByRole('button', { name: 'Ativar tema escuro', exact: true }).click();
        await expect(page.locator('.admin-shell')).toHaveClass(/dark/);
        await expect(page.locator('input[name=name]')).toHaveCSS('color', 'rgb(250, 250, 250)');
        await page.screenshot({ path: `/tmp/namarca-admin-dark-${width}.png` });
        await page.reload();
        await expect(page.locator('.admin-shell')).toHaveClass(/dark/);
        await page.getByRole('button', { name: 'Ativar tema claro', exact: true }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      }
      await page.setViewportSize({ width: 1440, height: 1400 });
    }
    stage = 'admin issues checkout by real submit and copies link/message';
    await closeStudio(page);
    await page.getByRole('tab', { name: 'Cobrança', exact: true }).click();
    await page.getByRole('button', { name: 'Emitir link de cobrança', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Abrir checkout', exact: true })).toBeVisible({ timeout: 60_000 });
    const issued = (await pool.query('select token,amount_cents,campaign_name from checkout_links where campaign_id=$1', [campaignId])).rows[0];
    assert.equal(issued.amount_cents, 12345);
    assert.equal(issued.campaign_name, 'Dados base confirmados');
    // HTTP container origin has no OS clipboard: capture the browser API boundary explicitly.
    await page.evaluate("Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { document.documentElement.dataset.testClipboard = text; } } })");
    await page.getByRole('button', { name: 'Copiar link', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Link copiado.' })).toBeVisible();
    assert.equal(await page.locator('html').getAttribute('data-test-clipboard'), `${base}/checkout/${issued.token}`);
    await page.getByRole('button', { name: 'Copiar mensagem', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Mensagem copiada.' })).toBeVisible();
    assert.match((await page.locator('html').getAttribute('data-test-clipboard'))!, /Confira o nome, o valor e as orientações/);
    assert.ok((await page.locator('html').getAttribute('data-test-clipboard'))!.endsWith(`${base}/checkout/${issued.token}`));
    await page.evaluate("Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Synthetic permission denial'); } } })");
    await page.getByRole('button', { name: 'Copiar link', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível copiar.' })).toHaveText('Não foi possível copiar. Abra o checkout e copie o endereço.');
    await expect(page.getByRole('status').filter({ hasText: /Link copiado|Mensagem copiada/ })).toHaveCount(0);
    // No payment was created. Remove only this isolated link before financial fixtures.
    await pool.query('delete from checkout_links where campaign_id=$1', [campaignId]);
    if (process.env.BILLING_UI_ONLY === '1') return;
    stage = 'financial report guards, empty summary and synthetic payments';
    const reportEndpoint = `${base}/api/campaigns/${campaignId}/financial-report`;
    const reportUrl = `${base}/admin/campanhas/${campaignId}/financeiro`;
    const anonymousReport = await playwrightRequest.newContext();
    try {
      for (const key of [campaignId, 'invalid']) {
        assert.equal((await anonymousReport.get(`${base}/api/campaigns/${key}/financial-report`)).status(), 403, 'Auth must precede UUID validation');
      }
      const deniedPage = await anonymousReport.get(reportUrl, { maxRedirects: 0 });
      assert.ok([302, 303, 307, 308, 401, 403].includes(deniedPage.status()));
      assert.ok(!(await deniedPage.text()).includes('Tentativas registradas'));
    } finally { await anonymousReport.dispose(); }
    assert.equal((await context.request.get(`${base}/api/campaigns/invalid/financial-report`)).status(), 404);
    assert.equal((await context.request.get(`${base}/api/campaigns/${randomUUID()}/financial-report`)).status(), 404);
    await page.goto(reportUrl);
    await expect(page.getByText('Nenhuma tentativa registrada.', { exact: false })).toBeVisible();
    for (const label of ['Pendente', 'Pago', 'Expirado', 'Cancelado', 'Reembolsado']) {
      const region = page.getByRole('region', { name: label, exact: true });
      await expect(region.getByRole('heading')).toHaveText(/R\$\s*0,00/);
      await expect(region.getByText('0 tentativas', { exact: true })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: 'Baixar CSV' })).toHaveCount(0);
    const csvHeader = '\uFEFF"Referência";"Situação";"Valor (BRL)";"Criada em (UTC)";"Confirmação registrada em (UTC)";"Atualizada em (UTC)"\r\n';
    assert.equal(await (await context.request.get(reportEndpoint)).text(), csvHeader);
    // Direct DB fixtures: no payer, no remote API or real gateway is involved.
    const token = randomBytes(32).toString('hex');
    const checkoutId = randomUUID();
    await pool.query('insert into checkout_links (id,campaign_id,token,campaign_name,amount_cents) values ($1,$2,$3,$4,4321)', [checkoutId, campaignId, token, 'Snapshot sintético']);
    const records = [
      { reference: '=synthetic-formula', status: 'pending', label: 'Pendente', cents: 1234, amount: '12,34', paid: null },
      { reference: `paid-${randomUUID()}`, status: 'paid', label: 'Pago', cents: 5678, amount: '56,78', paid: '2026-01-02T12:00:00.000Z' },
      { reference: `refunded-${randomUUID()}`, status: 'refunded', label: 'Reembolsado', cents: 9000, amount: '90,00', paid: '2026-01-02T12:00:00.000Z' },
    ];
    const gatewayIds: string[] = [];
    for (const row of records) {
      const gatewayId = `synthetic-private-${randomUUID()}`; gatewayIds.push(gatewayId);
      await pool.query('insert into payments (campaign_id,checkout_id,external_id,payment_id,qr_code,amount_cents,status,paid_at,created_at,updated_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [campaignId, checkoutId, row.reference, gatewayId, 'synthetic-private-qr', row.cents, row.status, row.paid, '2026-01-01T12:00:00.000Z', '2026-01-03T12:00:00.000Z']);
    }
    await page.reload();
    for (const row of records) {
      const region = page.getByRole('region', { name: row.label, exact: true });
      await expect(region.getByRole('heading')).toHaveText(new RegExp(`R\\$\\s*${row.amount}`));
      await expect(region.getByText('1 tentativa', { exact: true })).toBeVisible();
      const tableRow = page.getByRole('row').filter({ hasText: row.reference });
      await expect(tableRow).toContainText(row.label);
      await expect(tableRow).toContainText(row.amount);
    }
    const csvResponse = await context.request.get(reportEndpoint);
    assert.equal(csvResponse.status(), 200);
    assert.equal(csvResponse.headers()['content-type'], 'text/csv; charset=utf-8');
    assert.equal(csvResponse.headers()['content-disposition'], `attachment; filename="financeiro-${campaignId}.csv"`);
    assert.equal(csvResponse.headers()['cache-control'], 'private, no-store');
    assert.equal(csvResponse.headers()['x-content-type-options'], 'nosniff');
    const csv = await csvResponse.text();
    assert.ok(csv.startsWith(csvHeader));
    assert.equal(csv.split('\r\n').filter(Boolean).length, 4);
    for (const row of records) {
      const safeReference = row.reference.startsWith('=') ? `'${row.reference}` : row.reference;
      assert.ok(csv.includes(`"${safeReference}";"${row.label}";"${row.amount}";"2026-01-01T12:00:00.000Z";"${row.paid ?? ''}";"2026-01-03T12:00:00.000Z"\r\n`));
    }
    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: 'Baixar CSV', exact: true }).click(),
    ]);
    assert.equal(csvDownload.suggestedFilename(), `financeiro-${campaignId}.csv`);
    const csvStream = await csvDownload.createReadStream(); assert.ok(csvStream);
    const csvChunks: Buffer[] = []; for await (const chunk of csvStream) csvChunks.push(Buffer.from(chunk));
    assert.equal(Buffer.concat(csvChunks).toString('utf8'), csv);
    const reportHtml = await page.content();
    for (const output of [csv, reportHtml]) {
      for (const secret of [token, 'synthetic-private-qr', ...gatewayIds]) assert.ok(!output.includes(secret), 'Private checkout/gateway data must not leak');
      assert.ok(!/cpf|receiver_cpf|payerCpf/i.test(output), 'Report must not include payer identity fields');
    }
    await pool.query('delete from payments where campaign_id=$1', [campaignId]);
    await pool.query('delete from checkout_links where campaign_id=$1', [campaignId]);
    console.info('PASS financial report: anonymous and enrollment-only 403/auth-first; admin empty and pending/paid/refunded summaries; CSV download/content/headers/formula protection; no token/CPF/gateway fields. Synthetic DB only.');
    // Focused financial run still exercises real password/TOTP and the shared finally cleanup.
    if (process.env.FINANCIAL_REPORT_ONLY === '1') return;
    await page.goto(`${base}/admin/campanhas/${campaignId}`);
    const endpoint = `${base}/api/campaigns/${campaignId}/editor`;
    await openStudio(page);
    const editor = page.getByRole('region', { name: 'Estúdio da campanha' });
    await testEditorGallery(page, endpoint, png, value => { stage = value; });
    if (process.env.GALLERY_ONLY === '1') return;
    stage = 'upload artwork and sticker through UI';
    await page.getByRole('tab', { name: 'Artes', exact: true }).click();
    await editor.locator('input[type=file]').nth(0).setInputFiles({ name: 'frame.png', mimeType: 'image/png', buffer: png(400, 'artwork') });
    await page.getByLabel('Nome da arte 1', { exact: true }).waitFor();
    await page.getByRole('tab', { name: 'Stickers', exact: true }).click();
    await expect(editor.locator('input[type=file]').nth(1)).toBeEnabled();
    await editor.locator('input[type=file]').nth(1).setInputFiles({ name: 'sticker.png', mimeType: 'image/png', buffer: png(128, 'sticker') });
    await page.getByLabel('Nome do sticker 1', { exact: true }).waitFor();
    stage = 'reference width after uploads';
    await page.getByRole('tab', { name: 'Artes', exact: true }).click();
    await setEditorReference(page, editor, { x: 40, y: 40, width: 320, height: 320 });
    await page.getByLabel('Nome da arte 1', { exact: true }).fill('Moldura teste');
    await page.getByRole('button', { name: 'Salvar configuração', exact: true }).click();
    await expect(editor.getByRole('status')).toHaveText('Configuração salva. A campanha não foi publicada.');
    stage = 'reload and assert persistence';
    await page.reload();
    await openStudio(page);
    await page.getByLabel('Nome da arte 1', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Nome da arte 1', { exact: true }).inputValue(), 'Moldura teste');
    await expectEditorReference(editor, { x: 40, y: 40, width: 320, height: 320 });
    const savedResponse = await context.request.get(endpoint); assert.equal(savedResponse.status(), 200);
    const saved = await savedResponse.json();
    await auditAdminVisuals(page, base, campaignId);
    assert.equal(saved.event.artworks.length, 1); assert.equal(saved.event.stickers.length, 1);
    assert.deepEqual(saved.event.artworks[0].reference, { x: 40, y: 40, width: 320, height: 320 });
    stage = 'API authorization, CSRF, kind and revision guards';
    const anon = await playwrightRequest.newContext();
    try {
      assert.ok([401, 403].includes((await anon.get(endpoint)).status()));
      assert.ok([401, 403].includes((await anon.put(endpoint, { data: saved, headers: { origin: base } })).status()));
    } finally { await anon.dispose(); }
    assert.equal((await context.request.put(endpoint, { data: saved, headers: { origin: 'https://untrusted.invalid' } })).status(), 403);
    assert.equal((await context.request.post(`${base}/api/campaigns/${campaignId}/assets?kind=photo`, { data: png(128, 'photo'), headers: { origin: base, 'content-type': 'image/png' } })).status(), 422);
    assert.equal((await context.request.put(endpoint, { data: { ...saved, revision: saved.revision - 1 }, headers: { origin: base } })).status(), 409);
    stage = 'local photo preview and PNG export';
    const uploads: string[] = [];
    page.on('request', req => { if (['POST', 'PUT', 'PATCH'].includes(req.method())) uploads.push(req.url()); });
    const preview = page.frameLocator('iframe[title="Prévia real do editor da campanha"]');
    await expect(preview.getByRole('img', { name: 'Composição com a arte Moldura teste, sem foto', exact: true })).toBeVisible();
    await preview.locator('input[type=file]').setInputFiles({ name: 'local-participant.png', mimeType: 'image/png', buffer: png(600, 'photo') });
    await expect(preview.getByRole('button', { name: 'Salvar', exact: true })).toBeEnabled();
    await preview.getByRole('img', { name: /Composição com a arte .* e sua foto/ }).waitFor();
    // Keep the entire sticky iframe inside the outer viewport. Scrolling an
    // inner button alone can push the sticky iframe beyond the outer viewport.
    await page.locator('iframe[title="Prévia real do editor da campanha"]').evaluate(el => { window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 100); });
    await preview.getByRole('button', { name: 'Stickers', exact: true }).click();
    await preview.getByRole('button', { name: 'Adicionar sticker sticker', exact: true }).click();
    await expect(preview.getByRole('button', { name: 'Salvar', exact: true })).toBeEnabled();
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15_000 }),
      preview.getByRole('button', { name: 'Salvar', exact: true }).click({ timeout: 10_000 }),
    ]);
    const stream = await download.createReadStream(); assert.ok(stream);
    const chunks: Buffer[] = []; for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const exported = PNG.sync.read(Buffer.concat(chunks));
    assert.equal(exported.width, 400); assert.equal(exported.height, 400);
    const pixel = (x: number, y: number) => [...exported.data.subarray((y * 400 + x) * 4, (y * 400 + x) * 4 + 4)];
    assert.deepEqual(pixel(10, 10), [40, 190, 80, 255], 'Frame must be present');
    assert.deepEqual(pixel(80, 80), [221, 106, 80, 255], 'Local photo must be present');
    assert.deepEqual(pixel(200, 200), [40, 190, 80, 255], 'Sticker must be composited over photo');
    assert.equal(uploads.length, 0, 'Local participant photo/export must not trigger any mutation request');
    const campaign = (await pool.query('select preparation_status, publication_status from campaigns where id=$1', [campaignId])).rows[0];
    assert.equal(campaign.preparation_status, 'draft');
    assert.equal(campaign.publication_status, 'unpublished');
    stage = 'static public runtime and preview parity';
    await testEditorRuntime({ page, context, base, campaignId, event: saved.event, photo: png(600, 'photo') });
    console.info('PASS static runtime: shared CSS, isolated preview, public fetch/PNG, rejected bridge messages and ended manifest.');
    if (process.env.EDITOR_RUNTIME_ONLY === '1') return;
    stage = 'register visual approval v1 through UI';
    await closeStudio(page);
    await page.getByRole('tab', { name: 'Aprovação visual', exact: true }).click();
    const approval = page.getByRole('region', { name: 'Aprovação visual', exact: true });
    const approvalDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const fillApproval = async (target: typeof page) => {
      await target.getByRole('tab', { name: 'Aprovação visual', exact: true }).click();
      const region = target.getByRole('region', { name: 'Aprovação visual', exact: true });
      await region.getByLabel('Responsável pela aprovação', { exact: true }).fill('Aprovador sintético');
      await region.locator('select[name=channel]').selectOption('whatsapp');
      await region.getByLabel('Data da aprovação', { exact: true }).fill(approvalDate);
      await region.getByRole('checkbox', { name: 'Confirmo a autorização de uso dos materiais e a aprovação desta versão.', exact: true }).check();
    };
    const packages = async () => (await pool.query('select * from campaign_packages where campaign_id=$1 order by version', [campaignId])).rows;
    await expect(approval.locator('input[name=revision]')).toHaveValue(String(saved.revision));
    const identity = await approval.locator('input[name=identity]').inputValue();
    assert.ok(identity.length > 0);
    const stalePage = await context.newPage();
    await stalePage.goto(`${base}/admin/campanhas/${campaignId}`);
    await fillApproval(stalePage);
    await fillApproval(page);
    stage = 'dirty studio blocks approval of previously saved package';
    await openStudio(page);
    await page.getByLabel('Nome da arte 1', { exact: true }).fill('Rascunho não aprovado');
    await expect(editor.getByRole('status')).toContainText('Alterações não salvas');
    const approvalAlert = page.waitForEvent('dialog').then(async dialog => {
      assert.equal(dialog.type(), 'alert');
      assert.match(dialog.message(), /Salve as alterações do estúdio e recarregue/);
      await dialog.dismiss();
    });
    await closeStudio(page);
    await page.getByRole('tab', { name: 'Aprovação visual', exact: true }).click();
    await Promise.all([approvalAlert, approval.getByRole('button', { name: 'Registrar aprovação do pacote', exact: true }).click()]);
    assert.equal((await packages()).length, 0, 'Dirty preview must not approve the older saved package');
    await openStudio(page);
    await expect(page.getByLabel('Nome da arte 1', { exact: true })).toHaveValue('Rascunho não aprovado');
    await page.getByLabel('Nome da arte 1', { exact: true }).fill('Moldura teste');
    await expect(editor.getByRole('status')).toHaveText('Configuração salva.');
    console.info('PASS dirty approval guard: real submit raises alert, no package created and dirty artwork preserved.');
    stage = 'register visual approval v1 through UI';
    await closeStudio(page);
    await page.getByRole('tab', { name: 'Aprovação visual', exact: true }).click();
    await approval.getByRole('button', { name: 'Registrar aprovação do pacote', exact: true }).click();
    await expect.poll(async () => {
      const error = approval.getByRole('alert');
      if (await error.count()) throw new Error(await error.innerText());
      return (await packages()).length;
    }, { timeout: 30_000 }).toBe(1);
    const v1 = (await packages())[0];
    assert.ok(v1); assert.equal((await packages()).length, 1);
    assert.equal(v1.version, 1); assert.equal(v1.editor_revision, saved.revision);
    assert.equal(v1.approved_by, 'Aprovador sintético'); assert.equal(v1.channel, 'whatsapp');
    assert.equal(v1.recorded_by, id);
    assert.equal(new Date(v1.approved_at).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }), approvalDate);
    assert.deepEqual(v1.config, saved.event);
    const snapshotV1 = structuredClone(v1);
    stage = 'duplicate visual approval is rejected';
    await stalePage.getByRole('region', { name: 'Aprovação visual', exact: true }).getByRole('button', { name: 'Registrar aprovação do pacote', exact: true }).click();
    await stalePage.getByText('Este pacote já tem aprovação registrada.', { exact: true }).waitFor();
    assert.equal((await packages()).length, 1);
    try {
      stage = 'editor save preserves approved snapshot';
      await openStudio(page);
      await page.getByLabel('Nome da arte 1', { exact: true }).fill('Moldura revisada v2');
      await page.getByRole('button', { name: 'Salvar configuração', exact: true }).click();
      await expect(editor.getByRole('status')).toHaveText('Configuração salva. A campanha não foi publicada.');
      const changed = await (await context.request.get(endpoint)).json();
      assert.ok(changed.revision > saved.revision);
      assert.equal(changed.event.artworks[0].name, 'Moldura revisada v2');
      assert.deepEqual(await packages(), [snapshotV1], 'Saving the draft must not mutate or create approval snapshots');
      stage = 'stale visual approval revision is rejected';
      // React resets uncontrolled fields after the previous server action.
      // Refill the approval details without reloading the obsolete revision.
      await fillApproval(stalePage);
      await stalePage.getByRole('region', { name: 'Aprovação visual', exact: true }).getByRole('button', { name: 'Registrar aprovação do pacote', exact: true }).click();
      await stalePage.getByText('O pacote mudou. Recarregue a página e revise antes de aprovar.', { exact: true }).waitFor();
      assert.deepEqual(await packages(), [snapshotV1]);
      stage = 'register revised visual approval v2';
      await page.reload();
      await closeStudio(page);
    await page.getByRole('tab', { name: 'Aprovação visual', exact: true }).click();
      await expect(approval.locator('input[name=revision]')).toHaveValue(String(changed.revision));
      await expect(approval.locator('input[name=identity]')).toHaveValue(identity);
      await fillApproval(page);
      await approval.getByRole('button', { name: 'Registrar aprovação do pacote', exact: true }).click();
      await expect.poll(async () => (await packages()).length).toBe(2);
      const versions = await packages();
      assert.equal(versions.length, 2); assert.deepEqual(versions[0], snapshotV1);
      assert.equal(versions[1].version, 2); assert.equal(versions[1].editor_revision, changed.revision);
      assert.deepEqual(versions[1].config, changed.event);
      assert.equal(versions[0].config.artworks[0].name, 'Moldura teste');
      stage = 'approved snapshot remains private and unpublished';
      const privateUrl = `${base}/admin/campanhas/${campaignId}/pacotes/${v1.id}`;
      const anonymous = await playwrightRequest.newContext();
      try {
        const snapshotEndpoint = `${base}/api/campaigns/${campaignId}/packages/${v1.id}/preview`;
        assert.equal((await anonymous.get(snapshotEndpoint)).status(), 403);
        assert.equal((await context.request.get(`${base}/api/campaigns/${randomUUID()}/packages/${v1.id}/preview`)).status(), 404);
        const response = await anonymous.get(privateUrl, { maxRedirects: 0 });
        assert.ok([302, 303, 307, 308, 401, 403].includes(response.status()));
        assert.ok(!(await response.text()).includes('Moldura teste'), 'Anonymous response must not expose the approved configuration');
      } finally { await anonymous.dispose(); }
      await stalePage.goto(privateUrl);
      await stalePage.getByText('Prévia privada · pacote aprovado v1. Esta versão não é uma publicação pública.', { exact: true }).waitFor();
      const snapshotFrame = stalePage.frameLocator('iframe[title="Prévia do pacote aprovado"]');
      await expect(snapshotFrame.getByRole('img', { name: 'Composição com a arte Moldura teste, sem foto', exact: true })).toBeVisible({ timeout: 30_000 });
      await snapshotFrame.locator('input[type=file]').setInputFiles({ name: 'snapshot-local.png', mimeType: 'image/png', buffer: png(600, 'photo') });
      const snapshotImage = snapshotFrame.getByRole('img', { name: /Composição com a arte Moldura teste e sua foto/ });
      await expect(snapshotImage).toBeVisible({ timeout: 30_000 });
      await stalePage.locator('iframe').evaluate((el, { campaignId, event }) => (el as HTMLIFrameElement).contentWindow!.postMessage({ type: 'namarca:preview', campaignId, event }, window.location.origin), { campaignId, event: changed.event });
      await expect(snapshotImage).toBeVisible();
      assert.equal(await snapshotFrame.getByRole('img', { name: /Composição com a arte Moldura revisada v2 e sua foto/ }).count(), 0, 'Snapshot preview must ignore the live draft bridge');
      assert.equal((await pool.query('select count(*)::int as n from publication_tasks where campaign_id=$1', [campaignId])).rows[0].n, 0);
      const unpublished = (await pool.query('select preparation_status,publication_status from campaigns where id=$1', [campaignId])).rows[0];
      assert.deepEqual(unpublished, { preparation_status: 'draft', publication_status: 'unpublished' });
    } finally { await stalePage.close(); }
    stage = 'inline client registration and campaign link';
    await page.goto(`${base}/admin/campanhas/${campaignId}`);
    await closeStudio(page);
    await page.getByRole('tab', { name: 'Dados da campanha', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: 'Contratação', exact: true }).count(), 0);
    assert.equal(await page.locator('input[name=price]').count(), 1);
    await page.getByLabel('Cliente', { exact: true }).selectOption('new');
    await page.locator('input[name=clientName]').fill('Organizador teste');
    await page.locator('input[name=clientContact]').fill('contato@example.test');
    await page.locator('textarea[name=notes]').fill('Uma rodada extra combinada.');
    await page.locator('input[name=price]').fill('395,00');
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await page.getByText('Dados da campanha salvos.', { exact: true }).waitFor();
    const linked = (await pool.query('select client_id from campaigns where id=$1', [campaignId])).rows[0].client_id;
    assert.ok(linked); clientIds.push(linked);
    await page.reload();
    await closeStudio(page);
    await page.getByRole('tab', { name: 'Dados da campanha', exact: true }).click();
    await expect(page.getByLabel('Cliente', { exact: true })).toHaveValue(linked);
    await expect(page.locator('textarea[name=notes]')).toHaveValue('Uma rodada extra combinada.');
    await expect(page.locator('input[name=price]')).toHaveValue('395,00');
    stage = 'reuse client in another campaign';
    await page.goto(`${base}/admin/campanhas/nova`);
    await page.getByLabel('Nome do evento').fill('Segunda campanha mesmo cliente');
    await page.getByLabel('Endereço da campanha').fill(`client-test-${randomBytes(5).toString('hex')}`);
    await page.getByLabel('Data de encerramento').fill('2099-12-31');
    await page.getByLabel('Cliente', { exact: true }).selectOption(linked);
    await page.getByRole('button', { name: 'Salvar rascunho' }).click();
    await page.waitForURL(/\/admin\/campanhas\/[0-9a-f-]+$/);
    secondCampaignId = new URL(page.url()).pathname.split('/').pop()!;
    assert.equal((await pool.query('select client_id from campaigns where id=$1', [secondCampaignId])).rows[0].client_id, linked);
    assert.equal((await pool.query('select count(*)::int as n from clients where id=$1', [linked])).rows[0].n, 1);
    stage = 'unlink client without deleting reusable record';
    await page.goto(`${base}/admin/campanhas/${campaignId}`);
    await closeStudio(page);
    await page.getByRole('tab', { name: 'Dados da campanha', exact: true }).click();
    await page.getByLabel('Cliente', { exact: true }).selectOption('');
    await page.locator('textarea[name=notes]').fill('');
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await page.getByText('Dados da campanha salvos.', { exact: true }).waitFor();
    await page.reload();
    await closeStudio(page);
    await page.getByRole('tab', { name: 'Dados da campanha', exact: true }).click();
    await expect(page.getByLabel('Cliente', { exact: true })).toHaveValue('');
    const afterEdit = (await pool.query('select client_id,price_cents,preparation_status,publication_status from campaigns where id=$1', [campaignId])).rows[0];
    assert.equal(afterEdit.client_id, null); assert.equal(afterEdit.price_cents, 39500);
    assert.equal(afterEdit.preparation_status, 'draft'); assert.equal(afterEdit.publication_status, 'unpublished');
    console.info('PASS editor + visual approval + clients: real password/TOTP; editor regression/local export; approval v1, duplicate and stale revision rejected, editor save preserves v1, explicit v2, private snapshot and no publication tasks; client creation/reload/reuse/unlink; draft/unpublished.');
  } finally {
    // Browser shutdown failures must not skip isolated DB/S3 fixture cleanup.
    await context.close().catch(() => {}); await browser.close().catch(() => {});
    if (campaignId) {
      const assets = await pool.query('select key from campaign_assets where campaign_id=$1', [campaignId]);
      privateKeys.push(...assets.rows.map((row: { key: string }) => row.key));
      if (privateKeys.length) await s3.send(new DeleteObjectsCommand({ Bucket: process.env.S3_BUCKET!, Delete: { Objects: privateKeys.map(Key => ({ Key })) } }));
      await pool.query('delete from payments where campaign_id=$1', [campaignId]);
      await pool.query('delete from checkout_links where campaign_id=$1', [campaignId]);
      await pool.query('delete from campaign_packages where campaign_id=$1', [campaignId]);
      await pool.query('delete from campaigns where id=$1', [campaignId]);
    }
    if (secondCampaignId) await pool.query('delete from campaigns where id=$1', [secondCampaignId]);
    for (const clientId of clientIds) await pool.query('delete from clients where id=$1', [clientId]);
    await pool.query('delete from auth_user where id=$1', [id]);
    for (const table of ['auth_user', 'campaigns', 'payments', 'checkout_links', 'campaign_assets', 'campaign_packages']) {
      assert.equal((await pool.query(`select count(*)::int as n from ${table}`)).rows[0].n, 0, 'Disposable fixtures must be removed');
    }
    console.info('CLEANUP: disposable accounts, campaigns, payments, checkout links, assets and packages verified empty.');
  }
}
main().catch((error: unknown) => {
  if (stage !== 'browser password login' && stage !== 'browser TOTP enrollment' && error instanceof Error) console.error(error.message.replace(/Call log:[\s\S]*/, '').slice(0, 500));
  // Never dump Playwright call logs: password/TOTP inputs and cookies are confidential.
  console.error(`FAIL editor integration at: ${stage}. No credentials or participant data logged.`);
  process.exitCode = 1;
}).finally(async () => { s3.destroy(); await pool.end(); });
