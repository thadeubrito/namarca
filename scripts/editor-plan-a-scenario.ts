import assert from 'node:assert/strict';
import { expect, type Page, type Request } from '@playwright/test';
import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { openStudio } from './studio-navigation';
import { setEditorReference } from './editor-reference-helper';
import type { StudioDraft } from '../apps/admin/src/lib/studio-draft';

/** Real browser + HTTP + disposable DB. Only the lost upload response is fault-injected. */
export async function testEditorPlanA(page: Page, endpoint: string, pool: Pool, image: (size: number, kind: 'artwork' | 'photo') => Buffer, stage: (value: string) => void) {
  const assets = endpoint.replace(/\/editor$/, '/assets');
  const campaign = new URL(endpoint).pathname.split('/')[3];
  const origin = new URL(endpoint).origin;
  const studio = page.getByRole('region', { name: 'Estúdio da campanha' });
  const save = studio.getByRole('button', { name: 'Salvar artes', exact: true });
  const posts: Request[] = [];
  const puts: Request[] = [];
  const mutations: Request[] = [];
  const observe = (req: Request) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method())) mutations.push(req);
    if (req.method() === 'POST' && req.url().startsWith(`${assets}?`)) posts.push(req);
    if (req.method() === 'PUT' && req.url() === endpoint) puts.push(req);
  };
  const count = async () => (await pool.query('select count(*)::int as n from campaign_assets where campaign_id=$1', [campaign])).rows[0].n;
  const draft = async () => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('namarca-studio-drafts', 1);
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(new Error('IDB failed'));
    });
    try {
      const tx = db.transaction('drafts', 'readonly');
      const store = tx.objectStore('drafts');
      const keys = await new Promise<IDBValidKey[]>((resolve, reject) => { const r = store.getAllKeys(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(new Error('IDB keys failed')); });
      const values = await new Promise<StudioDraft[]>((resolve, reject) => { const r = store.getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(new Error('IDB values failed')); });
      return { keys: keys.map(String), values: values.map(v => ({ ...v, materials: v.materials.map((m: { id: string; file: Blob & { name?: string }; uploaded: boolean }) => ({ id: m.id, size: m.file.size, name: m.file.name, uploaded: m.uploaded })) })), tab: sessionStorage.getItem('namarca-studio-tab') };
    } finally { db.close(); }
  });
  const reload = async () => {
    page.once('dialog', dialog => { void dialog.accept().catch(() => {}); });
    await page.reload(); await openStudio(page);
  };
  const select = async (names: string[]) => {
    await studio.getByLabel('Adicionar arte PNG').setInputFiles(names.map(name => ({ name: `${name}.png`, mimeType: 'image/png', buffer: image(400, 'artwork') })));
    try { await expect(studio.getByLabel(`Nome da arte ${names.length}`, { exact: true })).toBeEnabled({ timeout: 60_000 }); }
    catch { throw new Error(`Local selection failed: ${await studio.getByRole('status').allTextContents()}; secure=${await page.evaluate(() => window.isSecureContext)}; randomUUID=${await page.evaluate(() => typeof crypto.randomUUID)}`); }
  };
  page.on('request', observe);
  try {
    stage('Plan A: local removal never reaches server');
    await openStudio(page);
    await expect(studio.getByLabel('Adicionar arte PNG')).toHaveAttribute('multiple', '');
    await select(['Descartada']);
    await studio.getByRole('button', { name: 'Remover Descartada', exact: true }).click();
    await expect(save).toBeDisabled();
    assert.equal(posts.length, 0); assert.equal(await count(), 0);

    stage('Plan A: multi-selection, local preview/reference and persisted files');
    await select(['Local 1', 'Local 2', 'Local 3', 'Local 4', 'Local 5']);
    await studio.getByLabel('Nome da arte 1', { exact: true }).fill('Nome recuperado');
    await studio.getByRole('button', { name: 'Selecionar arte: Nome recuperado', exact: true }).click();
    await setEditorReference(page, studio, { x: 40, y: 40, width: 320, height: 320 });
    const thumbnail = studio.getByRole('img', { name: 'Nome recuperado', exact: true });
    await expect(thumbnail).toHaveAttribute('src', new RegExp(`^blob:${origin}`));
    assert.equal(await thumbnail.evaluate(async el => { const r = await fetch((el as HTMLImageElement).src); return r.ok && (await r.blob()).size > 0; }), true);
    const preview = page.frameLocator('iframe[title="Prévia real do editor da campanha"]');
    await expect(preview.getByRole('img', { name: 'Composição com a arte Nome recuperado, sem foto', exact: true })).toBeVisible();
    const owner = (await (await page.request.get(endpoint)).json()).draftOwner;
    await expect.poll(async () => (await draft()).values[0]?.materials.length).toBe(5);
    const before = await draft();
    assert.deepEqual(before.keys, [`${owner}:${campaign}:${before.tab}`]);
    for (const material of before.values[0].materials) {
      assert.match(material.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.ok(material.size > 0); assert.equal(material.uploaded, false);
    }
    assert.equal(posts.length, 0); assert.equal(await count(), 0);
    stage('Plan A: duplicated tab claims a separate token without stealing original draft');
    const popupPromise = page.waitForEvent('popup');
    await page.evaluate(() => { window.open(window.location.href, '_blank'); });
    const duplicate = await popupPromise;
    try {
      await duplicate.waitForLoadState('networkidle');
      // window.open copies sessionStorage; claim happens only when the studio opens.
      assert.equal(await duplicate.evaluate(() => sessionStorage.getItem('namarca-studio-tab')), before.tab);
      await openStudio(duplicate);
      await expect.poll(() => duplicate.evaluate(() => sessionStorage.getItem('namarca-studio-tab'))).not.toBe(before.tab);
      assert.ok(await duplicate.evaluate(() => sessionStorage.getItem('namarca-studio-tab')));
      const otherStudio = duplicate.getByRole('region', { name: 'Estúdio da campanha' });
      await expect(duplicate.getByRole('alertdialog')).toHaveCount(0);
      await expect(otherStudio.getByLabel('Nome da arte 1', { exact: true })).toHaveCount(0);
      assert.deepEqual(await draft(), before);
      assert.equal(await count(), 0);
    } finally { await duplicate.close(); }
    stage('Plan A: original tab refresh recovers its own draft');
    await reload();
    const recovery = page.getByRole('alertdialog');
    const recover = recovery.getByRole('button', { name: 'Recuperar rascunho', exact: true });
    await expect(recovery).toHaveAccessibleName('Continuar de onde parou?');
    await expect(recover).toBeFocused();
    await expect(recovery).toContainText('5 arte(s)');
    await expect(recovery).toContainText('0 figurinha(s)');
    await expect(recovery.locator('time')).toHaveAttribute('datetime', /T/);
    for (const key of ['Tab', 'Tab', 'Shift+Tab', 'Shift+Tab']) {
      await page.keyboard.press(key);
      assert.equal(await recovery.evaluate(el => el.contains(document.activeElement)), true);
    }
    await page.keyboard.press('Escape');
    await expect(recovery).toHaveAccessibleName('Continuar de onde parou?');
    await page.mouse.click(4, 4);
    await expect(recovery).toBeVisible();
    assert.deepEqual(await draft(), before);
    if (process.env.PLAN_A_SHOTS === '1') {
      for (const dark of [false, true]) {
        await page.evaluate(value => { localStorage.setItem('namarca-admin-theme', value ? 'dark' : 'light'); }, dark);
        await reload();
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 900 });
          await expect(recovery).toBeVisible();
          await expect(recovery).toHaveClass(dark ? /dark/ : /ws-recovery-dialog(?!.*dark)/);
          await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          await page.screenshot({ path: `/tmp/namarca-recovery-${dark ? 'dark' : 'light'}-${width}.png` });
        }
      }
      await page.setViewportSize({ width: 1440, height: 1400 });
    }
    await recovery.getByRole('button', { name: 'Descartar', exact: true }).click();
    await expect(recovery).toHaveAccessibleName('Descartar este rascunho?');
    await page.keyboard.press('Escape');
    await expect(recovery).toHaveAccessibleName('Continuar de onde parou?');
    assert.deepEqual(await draft(), before);
    await recover.click();
    await expect(recovery).toHaveCount(0);
    await expect(studio).toBeFocused();
    await expect(studio.getByLabel('Nome da arte 1', { exact: true })).toHaveValue('Nome recuperado');
    const recovered = await draft();
    assert.deepEqual(recovered.values[0].materials, before.values[0].materials);
    assert.deepEqual(recovered.values[0].event.artworks, before.values[0].event.artworks);
    await expect(thumbnail).toHaveAttribute('src', new RegExp(`^blob:${origin}`));
    assert.equal(posts.length, 0);

    stage('Plan A: confirmed discard clears IndexedDB without server mutations');
    await reload();
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>(resolve => { const r = indexedDB.open('namarca-studio-drafts', 1); r.onsuccess = () => resolve(r.result); });
      try {
        const store = db.transaction('drafts', 'readonly').objectStore('drafts');
        const key = await new Promise<IDBValidKey>(resolve => { const r = store.getAllKeys(); r.onsuccess = () => resolve(r.result[0]); });
        const value = await new Promise<StudioDraft>(resolve => { const r = store.get(key); r.onsuccess = () => resolve(r.result); });
        (window as unknown as { recoveryFixture: { key: IDBValidKey; value: StudioDraft } }).recoveryFixture = { key, value };
      } finally { db.close(); }
    });
    await recovery.getByRole('button', { name: 'Descartar', exact: true }).click();
    await recovery.getByRole('button', { name: 'Voltar', exact: true }).click();
    await expect(recovery).toHaveAccessibleName('Continuar de onde parou?');
    await recovery.getByRole('button', { name: 'Descartar', exact: true }).click();
    await page.mouse.click(4, 4);
    await expect(recovery).toHaveAccessibleName('Descartar este rascunho?');
    await recovery.getByRole('button', { name: 'Descartar rascunho', exact: true }).click();
    await expect(recovery).toHaveCount(0);
    await expect(studio).toBeFocused();
    await expect.poll(async () => (await draft()).keys.length).toBe(0);
    assert.equal(posts.length, 0); assert.equal(puts.length, 0); assert.equal(await count(), 0);
    // Restore the exact synthetic fixture so subsequent UUID/idempotency checks keep their meaning.
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('namarca-studio-drafts', 1);
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction('drafts', 'readwrite');
          const cached = (window as unknown as { recoveryFixture: { key: string; value: StudioDraft } }).recoveryFixture;
          tx.objectStore('drafts').put(cached.value, cached.key);
          tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
        });
      } finally { db.close(); }
    });
    await reload();
    await recover.click();
    await expect(studio.getByLabel('Nome da arte 1', { exact: true })).toHaveValue('Nome recuperado');

    stage('Plan A: bounded uploads, lost response, stable UUID retry and PUT ordering');
    let active = 0; let peak = 0; let entered = 0;
    let release!: () => void;
    let ready!: () => void;
    const uploadsPaused = new Promise<void>(resolve => { ready = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    let failedId = '';
    let routeFailure: unknown;
    const completed = new Set<string>();
    await page.route(`${assets}?*`, async route => {
      if (route.request().method() !== 'POST') return route.continue();
      const uploadId = route.request().headers()['x-upload-id'];
      assert.ok(before.values[0].materials.some((m: { id: string }) => m.id === uploadId));
      active++; peak = Math.max(peak, active);
      if (++entered === 3) ready();
      try {
        await gate;
        const response = await route.fetch(); // Always exercise the real upload and DB, even on failure.
        assert.ok(response.ok());
        assert.equal((await response.json()).material.id, uploadId);
        if (!failedId) {
          failedId = uploadId;
          await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
        } else { completed.add(uploadId); await route.fulfill({ response }); }
      } catch (error) {
        routeFailure = error;
        await route.abort().catch(() => {});
      } finally { active--; }
    });
    await save.click();
    try {
      await Promise.race([uploadsPaused, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Three uploads did not reach the gate')), 30_000))]);
      const panel = studio.locator('.ws-save-progress');
      await expect(panel).toHaveAttribute('data-phase', 'uploading');
      await expect(panel).toContainText('Enviando materiais');
      await expect(panel).toContainText('0 de 5 arquivos processados');
      await expect(panel).toContainText('2 na fila.');
      await expect(panel.getByRole('list', { name: 'Arquivos em processamento' }).locator('li[data-state="uploading"]')).toHaveCount(3);
      const bar = panel.getByRole('progressbar', { name: 'Enviando materiais' });
      await expect(bar).toHaveAttribute('aria-valuenow', '0');
      await expect(bar).toHaveAttribute('aria-valuemax', '5');
      assert.equal(await bar.locator(':scope > span').evaluate(el => el.getBoundingClientRect().width), 0);
      assert.equal(posts.length, 3); assert.equal(puts.length, 0); assert.equal(await count(), 0);
      if (process.env.UPLOAD_BITS_SHOTS === '1') {
        for (const dark of [false, true]) {
          const toggle = page.getByRole('button', { name: dark ? 'Ativar tema escuro' : 'Ativar tema claro' });
          if (await toggle.count()) await toggle.click();
          for (const width of [1440, 390]) {
            await page.setViewportSize({ width, height: 900 });
            await panel.scrollIntoViewIfNeeded();
            await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            await expect(panel).toBeInViewport();
            await page.screenshot({ path: `/tmp/namarca-upload-bits-${dark ? 'dark' : 'light'}-${width}.png` });
          }
        }
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForTimeout(300);
        await expect(panel.locator('strong')).toHaveText('Enviando materiais');
        await expect(panel.locator('strong > span')).toHaveCount(0);
        assert.equal(await panel.locator('strong').evaluate(el => getComputedStyle(el).backgroundImage), 'none');
        // Count only RAFs originating in ShinyText, not unrelated Motion/iframe work.
        await page.evaluate(() => {
          const original = window.requestAnimationFrame;
          const probe = { calls: 0, original };
          (window as unknown as { shinyProbe: typeof probe }).shinyProbe = probe;
          window.requestAnimationFrame = callback => {
            if (new Error().stack?.includes('ShinyText')) probe.calls++;
            return original.call(window, callback);
          };
        });
        try {
          await page.waitForTimeout(700);
          await expect(panel.locator('strong > span')).toHaveCount(0);
          assert.equal(await panel.locator('strong').evaluate(el => getComputedStyle(el).backgroundImage), 'none');
          const rafCalls = await page.evaluate(() => (window as unknown as { shinyProbe: { calls: number } }).shinyProbe.calls);
          assert.equal(rafCalls, 0, 'Reduced motion must stop all recurring ShinyText RAF callbacks');
          console.info('PASS UPLOAD BITS reduced-motion dynamic: ShinyText unmounted, gradient absent, recurring RAF=0, CSS spinners stopped.');
          assert.deepEqual(await panel.locator('.ws-save-file-spinner, .ws-save-progress-orbit').evaluateAll(elements => elements.map(el => getComputedStyle(el).animationName)), ['none', 'none', 'none', 'none']);
          await page.screenshot({ path: '/tmp/namarca-upload-bits-reduced-390.png' });
          stage('Plan A: reduced motion passed: no ShinyText gradient or RAF, CSS spinners stopped');
        } finally {
          await page.evaluate(() => { window.requestAnimationFrame = (window as unknown as { shinyProbe: { original: typeof requestAnimationFrame } }).shinyProbe.original; });
          await page.emulateMedia({ reducedMotion: 'no-preference' });
        }
        await page.setViewportSize({ width: 1440, height: 1400 });
      }
    } finally { release(); }
    await expect(studio.getByRole('alert')).toBeVisible();
    await expect(save).toBeEnabled();
    assert.equal(routeFailure, undefined, 'Upload gate handler failed');
    assert.equal(peak, 3); assert.equal(active, 0); assert.equal(posts.length, 5); assert.equal(puts.length, 0);
    assert.equal(await count(), 5); assert.equal(completed.size, 4);
    await page.unroute(`${assets}?*`);
    await save.click();
    await expect(studio.locator('[role="status"].sr-only').filter({ hasText: /^Artes salvas\./ })).toHaveText('Artes salvas. A campanha não foi publicada.');
    assert.equal(posts.length, 6); assert.equal(posts[5].headers()['x-upload-id'], failedId);
    for (const id of completed) assert.equal(posts.filter(r => r.headers()['x-upload-id'] === id).length, 1);
    assert.equal(puts.length, 1); assert.equal(await count(), 5);
    const saved = await (await page.request.get(endpoint)).json();
    assert.deepEqual(saved.event.artworks.map((a: { id: string }) => a.id), before.values[0].materials.map((m: { id: string }) => m.id));
    await expect.poll(async () => (await draft()).keys.length).toBe(0);

    stage('Plan A: participant photo stays local');
    const mark = mutations.length;
    await expect(preview.getByRole('img', { name: 'Composição com a arte Nome recuperado, sem foto', exact: true })).toBeVisible();
    await preview.locator('input[type=file]').setInputFiles({ name: 'participant-local.png', mimeType: 'image/png', buffer: image(600, 'photo') });
    await expect(preview.getByRole('img', { name: /Composição com a arte .* e sua foto/ })).toBeVisible();
    assert.equal(mutations.length, mark);

    stage('Plan A: saved removal deferred until save, cleanup analysis never deletes');
    const removed = saved.event.artworks[0];
    await studio.getByRole('button', { name: 'Remover Nome recuperado', exact: true }).click();
    assert.equal((await page.request.get(`${assets}/${removed.id}`)).status(), 200);
    await save.click();
    await expect(studio.locator('[role="status"].sr-only').filter({ hasText: /^Artes salvas\./ })).toHaveText('Artes salvas. A campanha não foi publicada.');
    assert.equal((await page.request.get(`${assets}/${removed.id}`)).status(), 404);
    const orphan = randomUUID();
    const uploaded = await page.request.post(`${assets}?kind=artwork`, { data: image(400, 'artwork'), headers: { origin, 'content-type': 'image/png', 'x-upload-id': orphan, 'x-asset-name': 'Orphan synthetic' } });
    assert.ok(uploaded.ok());
    const assetRows = await pool.query('select * from campaign_assets where campaign_id=$1 order by id', [campaign]);
    const analysis = await page.request.get(`${assets}/cleanup`);
    assert.equal(analysis.status(), 200);
    assert.deepEqual((await pool.query('select * from campaign_assets where campaign_id=$1 order by id', [campaign])).rows, assetRows.rows);
    for (const asset of [...saved.event.artworks.slice(1), { id: orphan }]) assert.equal((await page.request.get(`${assets}/${asset.id}`)).status(), 200);
    if (process.env.PLAN_A_SHOTS === '1') {
      await studio.locator('.ws-studio-cleanup > summary').click();
      await studio.getByRole('button', { name: 'Analisar', exact: true }).click();
      await expect(studio.locator('.ws-studio-cleanup')).toContainText('Nenhum arquivo não utilizado disponível');
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `/tmp/namarca-plan-a-studio-${width}.png`, fullPage: true });
        await studio.locator('.ws-studio-cleanup').screenshot({ path: `/tmp/namarca-plan-a-cleanup-${width}.png` });
      }
    }
    console.info('PASS Plan A: local multi/UUID/blob/reference, isolated duplicated tab, IDB refresh recovery, 3 concurrent real uploads, lost-response idempotent retry, deferred deletion, non-destructive cleanup analysis and private participant photo.');
  } finally {
    await page.unroute(`${assets}?*`);
    page.off('request', observe);
  }
}
