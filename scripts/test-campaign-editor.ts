// Container-only integration runner. Never point this at the normal application/database.
import assert from 'node:assert/strict';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { chromium, expect, request as playwrightRequest } from '@playwright/test';
import { hashPassword } from 'better-auth/crypto';
import { Pool } from 'pg';
import { PNG } from 'pngjs';
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';

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
    stage = 'browser password login';
    await page.goto(`${base}/login`);
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Entrar no administrativo' }).click();
    await page.waitForURL('**/seguranca');
    stage = 'browser TOTP enrollment';
    await page.getByLabel('Confirme sua senha').fill(password);
    await page.getByRole('button', { name: 'Configurar autenticador' }).click();
    await page.getByText('Configurar manualmente', { exact: true }).click();
    const uri = await page.locator('details code').innerText();
    await page.getByRole('checkbox').check();
    await page.getByLabel('Código de seis dígitos').fill(totp(uri));
    await page.getByRole('button', { name: 'Verificar código' }).click();
    await page.waitForURL('**/admin');
    stage = 'create campaign through UI';
    await page.goto(`${base}/admin/campanhas/nova`);
    await page.getByLabel('Nome do evento').fill('Integração editor isolada');
    await page.getByLabel('Endereço da campanha').fill(`editor-test-${randomBytes(5).toString('hex')}`);
    await page.getByLabel('Data de encerramento').fill('2099-12-31');
    await page.getByRole('button', { name: 'Salvar rascunho' }).click();
    await page.waitForURL(/\/admin\/campanhas\/[0-9a-f-]+$/);
    campaignId = new URL(page.url()).pathname.split('/').pop()!;
    const endpoint = `${base}/api/campaigns/${campaignId}/editor`;
    const editor = page.getByRole('region', { name: 'Estúdio da campanha' });
    stage = 'upload artwork and sticker through UI';
    await editor.locator('input[type=file]').nth(0).setInputFiles({ name: 'frame.png', mimeType: 'image/png', buffer: png(400, 'artwork') });
    await page.getByLabel('Nome da arte 1', { exact: true }).waitFor();
    await expect(editor.locator('input[type=file]').nth(1)).toBeEnabled();
    await editor.locator('input[type=file]').nth(1).setInputFiles({ name: 'sticker.png', mimeType: 'image/png', buffer: png(128, 'sticker') });
    await page.getByLabel('Nome do sticker 1', { exact: true }).waitFor();
    stage = 'reference width after uploads';
    await editor.getByLabel('Largura', { exact: true }).fill('320');
    await editor.getByLabel('Altura', { exact: true }).fill('320');
    await editor.getByLabel('X', { exact: true }).fill('40');
    await editor.getByLabel('Y', { exact: true }).fill('40');
    await page.getByLabel('Nome da arte 1', { exact: true }).fill('Moldura teste');
    await page.getByRole('button', { name: 'Salvar configuração', exact: true }).click();
    await page.getByText('Configuração salva. A campanha não foi publicada.', { exact: true }).waitFor();
    stage = 'reload and assert persistence';
    await page.reload();
    await page.getByLabel('Nome da arte 1', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Nome da arte 1', { exact: true }).inputValue(), 'Moldura teste');
    assert.equal(await editor.getByLabel('X', { exact: true }).inputValue(), '40');
    const savedResponse = await context.request.get(endpoint); assert.equal(savedResponse.status(), 200);
    const saved = await savedResponse.json();
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
    stage = 'register visual approval v1 through UI';
    const approval = page.getByRole('region', { name: 'Aprovação visual', exact: true });
    const approvalDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    const fillApproval = async (target: typeof page) => {
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
      await page.getByLabel('Nome da arte 1', { exact: true }).fill('Moldura revisada v2');
      await page.getByRole('button', { name: 'Salvar configuração', exact: true }).click();
      await page.getByText('Configuração salva. A campanha não foi publicada.', { exact: true }).waitFor();
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
        const response = await anonymous.get(privateUrl, { maxRedirects: 0 });
        assert.ok([302, 303, 307, 308, 401, 403].includes(response.status()));
        assert.ok(!(await response.text()).includes('Moldura teste'), 'Anonymous response must not expose the approved configuration');
      } finally { await anonymous.dispose(); }
      await stalePage.goto(privateUrl);
      await stalePage.getByText('Prévia privada · pacote aprovado v1. Esta versão não é uma publicação pública.', { exact: true }).waitFor();
      await expect(stalePage.getByRole('img', { name: 'Composição com a arte Moldura teste, sem foto', exact: true })).toBeVisible({ timeout: 30_000 });
      await stalePage.locator('input[type=file]').setInputFiles({ name: 'snapshot-local.png', mimeType: 'image/png', buffer: png(600, 'photo') });
      const snapshotImage = stalePage.getByRole('img', { name: /Composição com a arte Moldura teste e sua foto/ });
      await expect(snapshotImage).toBeVisible({ timeout: 30_000 });
      await stalePage.evaluate(({ campaignId, event }) => window.postMessage({ type: 'namarca:preview', campaignId, event }, window.location.origin), { campaignId, event: changed.event });
      await expect(snapshotImage).toBeVisible();
      assert.equal(await stalePage.getByRole('img', { name: /Composição com a arte Moldura revisada v2 e sua foto/ }).count(), 0, 'Snapshot preview must ignore the live draft bridge');
      assert.equal((await pool.query('select count(*)::int as n from publication_tasks where campaign_id=$1', [campaignId])).rows[0].n, 0);
      const unpublished = (await pool.query('select preparation_status,publication_status from campaigns where id=$1', [campaignId])).rows[0];
      assert.deepEqual(unpublished, { preparation_status: 'draft', publication_status: 'unpublished' });
    } finally { await stalePage.close(); }
    stage = 'inline client registration and campaign link';
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
    await page.getByLabel('Cliente', { exact: true }).selectOption('');
    await page.locator('textarea[name=notes]').fill('');
    await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
    await page.getByText('Dados da campanha salvos.', { exact: true }).waitFor();
    await page.reload();
    await expect(page.getByLabel('Cliente', { exact: true })).toHaveValue('');
    const afterEdit = (await pool.query('select client_id,price_cents,preparation_status,publication_status from campaigns where id=$1', [campaignId])).rows[0];
    assert.equal(afterEdit.client_id, null); assert.equal(afterEdit.price_cents, 39500);
    assert.equal(afterEdit.preparation_status, 'draft'); assert.equal(afterEdit.publication_status, 'unpublished');
    console.info('PASS editor + visual approval + clients: real password/TOTP; editor regression/local export; approval v1, duplicate and stale revision rejected, editor save preserves v1, explicit v2, private snapshot and no publication tasks; client creation/reload/reuse/unlink; draft/unpublished.');
  } finally {
    await context.close(); await browser.close();
    if (campaignId) {
      const assets = await pool.query('select key from campaign_assets where campaign_id=$1', [campaignId]);
      privateKeys.push(...assets.rows.map((row: { key: string }) => row.key));
      if (privateKeys.length) await s3.send(new DeleteObjectsCommand({ Bucket: process.env.S3_BUCKET!, Delete: { Objects: privateKeys.map(Key => ({ Key })) } }));
      await pool.query('delete from campaign_packages where campaign_id=$1', [campaignId]);
      await pool.query('delete from campaigns where id=$1', [campaignId]);
    }
    if (secondCampaignId) await pool.query('delete from campaigns where id=$1', [secondCampaignId]);
    for (const clientId of clientIds) await pool.query('delete from clients where id=$1', [clientId]);
    await pool.query('delete from auth_user where id=$1', [id]);
  }
}
main().catch((error: unknown) => {
  if (stage !== 'browser password login' && stage !== 'browser TOTP enrollment' && error instanceof Error) console.error(error.message.replace(/Call log:[\s\S]*/, '').slice(0, 500));
  // Never dump Playwright call logs: password/TOTP inputs and cookies are confidential.
  console.error(`FAIL editor integration at: ${stage}. No credentials or participant data logged.`);
  process.exitCode = 1;
}).finally(async () => { s3.destroy(); await pool.end(); });
