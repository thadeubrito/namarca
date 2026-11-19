import assert from 'node:assert/strict';
import { expect, type Page, type Request } from '@playwright/test';
import type { Pool } from 'pg';
import { openStudio } from './studio-navigation';
import { saveStudioSection, studioTabName } from './editor-section-save-helper';
import type { StudioDraft } from '../src/lib/studio-draft';

export async function testEditorSectionSave(page: Page, endpoint: string, pool: Pool, image: (size: number, kind: 'artwork' | 'photo') => Buffer, stage: (s: string) => void) {
  const studio = page.getByRole('region', { name: 'Estúdio da campanha' });
  const assets = endpoint.replace(/\/editor$/, '/assets');
  const campaign = new URL(endpoint).pathname.split('/')[3];
  const posts: Request[] = [], puts: Request[] = [];
  const observe = (r: Request) => {
    if (r.method() === 'POST' && r.url().startsWith(`${assets}?`)) posts.push(r);
    if (r.method() === 'PUT' && r.url() === endpoint) puts.push(r);
  };
  const server = async () => { const r = await page.request.get(endpoint); assert.equal(r.status(), 200); return r.json(); };
  const local = async () => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('namarca-studio-drafts', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    try { return await new Promise<StudioDraft[]>((resolve, reject) => { const r = db.transaction('drafts').objectStore('drafts').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); } finally { db.close(); }
  });
  const tab = (label: string) => studio.getByRole('tab', { name: studioTabName(label) });
  const pending = async (label: string, value: boolean) => {
    if (value) await expect(tab(label)).toHaveAccessibleDescription('Alterações não salvas');
    else await expect(tab(label)).not.toHaveAccessibleDescription('Alterações não salvas');
  };
  const shots = async (suffix: string) => {
    if (process.env.SECTION_SAVE_SHOTS !== '1') return;
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const label of ['Artes', 'Figurinhas', 'Cores']) {
        await tab(label).click();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.waitForTimeout(450); // Capture the settled tab entrance, not its initial opacity frame.
        await page.screenshot({ path: `/tmp/namarca-section-save-${suffix}-${label}-${width}.png`, fullPage: true });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1400 });
  };
  page.on('request', observe);
  try {
    stage('section save: three pending sections without uploads');
    await openStudio(page);
    const initial = await server();
    await studio.getByLabel('Adicionar arte PNG').setInputFiles({ name: 'Arte parcial.png', mimeType: 'image/png', buffer: image(400, 'artwork') });
    await expect(studio.getByLabel('Nome da arte 1', { exact: true })).toHaveValue('Arte parcial');
    await tab('Figurinhas').click();
    await studio.getByLabel('Adicionar sticker PNG').setInputFiles({ name: 'Figurinha parcial.png', mimeType: 'image/png', buffer: image(128, 'artwork') });
    await expect(studio.getByLabel('Nome do sticker 1', { exact: true })).toHaveValue('Figurinha parcial');
    await tab('Cores').click();
    await studio.getByLabel('Destaque', { exact: true }).fill('#123456');
    await studio.getByLabel('Destaque', { exact: true }).blur();
    for (const label of ['Artes', 'Figurinhas', 'Cores']) await pending(label, true);
    await expect.poll(async () => (await local())[0]?.materials.length).toBe(2);
    const before = (await local())[0];
    assert.equal(posts.length, 0); assert.equal(puts.length, 0); assert.deepEqual(await server(), initial);
    await shots('pending');

    stage('section save: colors persist alone, both material drafts remain');
    await saveStudioSection(studio, 'cores');
    const colors = await server();
    assert.equal(colors.revision, initial.revision + 1);
    assert.equal(colors.event.theme.accent, '#123456');
    assert.deepEqual(colors.event.artworks, initial.event.artworks); assert.deepEqual(colors.event.stickers, initial.event.stickers);
    assert.equal(posts.length, 0); assert.equal(puts[0].postDataJSON().scope, 'theme');
    await pending('Cores', false); await pending('Artes', true); await pending('Figurinhas', true);
    await expect.poll(async () => (await local())[0]?.revision).toBe(colors.revision);
    assert.deepEqual((await local())[0].event.artworks, before.event.artworks);
    assert.deepEqual((await local())[0].event.stickers, before.event.stickers);
    assert.equal((await local())[0].materials.length, 2);

    stage('section save: artwork upload excludes sticker and rebases draft');
    await saveStudioSection(studio, 'artes');
    const art = await server();
    assert.equal(art.revision, colors.revision + 1); assert.equal(art.event.artworks.length, 1);
    assert.deepEqual(art.event.stickers, initial.event.stickers); assert.deepEqual(art.event.theme, colors.event.theme);
    assert.equal(posts.length, 1); assert.equal(new URL(posts[0].url()).searchParams.get('kind'), 'artwork');
    assert.equal(puts[1].postDataJSON().scope, 'artworks');
    await pending('Artes', false); await pending('Figurinhas', true);
    await expect.poll(async () => (await local())[0]?.revision).toBe(art.revision);
    assert.equal((await local())[0].materials.length, 1);

    stage('section save: refresh recovers sticker on new revision without conflict');
    page.once('dialog', d => { void d.accept(); });
    await page.reload(); await openStudio(page);
    const recovery = page.getByRole('alertdialog');
    await expect(recovery).toBeVisible();
    await recovery.getByRole('button', { name: 'Recuperar rascunho', exact: true }).click();
    await expect(studio.getByRole('button', { name: 'Recarregar versão salva', exact: true })).toHaveCount(0);
    await tab('Figurinhas').click();
    await expect(studio.getByLabel('Nome do sticker 1', { exact: true })).toHaveValue('Figurinha parcial');
    await expect.poll(async () => (await local())[0]?.revision).toBe(art.revision);
    assert.deepEqual((await local())[0].event.artworks, art.event.artworks, 'Recovered artwork must equal saved artwork structurally');
    await pending('Figurinhas', true); await pending('Artes', false); await pending('Cores', false);
    await shots('recovered');
    await saveStudioSection(studio, 'figurinhas');
    const complete = await server();
    assert.equal(complete.revision, art.revision + 1); assert.equal(complete.event.stickers.length, 1);
    assert.deepEqual(complete.event.artworks, art.event.artworks); assert.deepEqual(complete.event.theme, colors.event.theme);
    assert.equal(posts.length, 2); assert.equal(new URL(posts[1].url()).searchParams.get('kind'), 'sticker');
    assert.equal(puts[2].postDataJSON().scope, 'stickers');
    await expect.poll(async () => (await local()).length).toBe(0);

    stage('section save: partial removal preserves other saved and pending sections');
    await tab('Artes').click(); await studio.getByRole('button', { name: 'Remover Arte parcial', exact: true }).click();
    await tab('Figurinhas').click(); await studio.getByLabel('Nome do sticker 1', { exact: true }).fill('Nome pendente');
    await saveStudioSection(studio, 'artes');
    const removed = await server();
    assert.equal(removed.revision, complete.revision + 1); assert.deepEqual(removed.event.artworks, []);
    assert.deepEqual(removed.event.stickers, complete.event.stickers); assert.deepEqual(removed.event.theme, complete.event.theme);
    assert.equal((await page.request.get(`${assets}/${complete.event.stickers[0].id}`)).status(), 200);
    assert.equal((await page.request.get(`${assets}/${complete.event.artworks[0].id}`)).status(), 404);
    await pending('Figurinhas', true);
    await saveStudioSection(studio, 'figurinhas');
    await tab('Figurinhas').click(); await studio.getByRole('button', { name: 'Remover Nome pendente', exact: true }).click();
    await saveStudioSection(studio, 'figurinhas');
    const empty = await server();
    assert.deepEqual(empty.event.artworks, []); assert.deepEqual(empty.event.stickers, []); assert.deepEqual(empty.event.theme, complete.event.theme);
    assert.equal(posts.length, 2); assert.equal(puts.length, 6);
    for (const label of ['Artes', 'Figurinhas', 'Cores']) await pending(label, false);
    await shots('success');
    assert.equal((await pool.query('select count(*)::int as n from campaign_assets where campaign_id=$1', [campaign])).rows[0].n, 0);
    await expect(studio.getByRole('alert')).toHaveCount(0);
    console.info('PASS SECTION_SAVE_ONLY: scoped uploads/PUT, independent pending indicators, retained drafts, rebased refresh recovery, partial cleanup and no internal revision conflicts.');
  } finally { page.off('request', observe); }
}
