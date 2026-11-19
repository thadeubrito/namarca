import { saveStudioSection, studioTabName } from './editor-section-save-helper';
import { campaignSections, openStudio } from './studio-navigation';
import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';
import { expectEditorReference, setEditorReference } from './editor-reference-helper';

/** Browser-only gallery operations. Caller supplies synthetic PNGs and isolated fixtures. */
export async function testEditorGallery(page: Page, endpoint: string, image: (size: number, kind: 'artwork' | 'sticker') => Buffer, setStage: (stage: string) => void) {
  const studio = page.getByRole('region', { name: 'Estúdio da campanha' });
  const preview = page.frameLocator('iframe[title="Prévia real do editor da campanha"]');
  const saved = async () => {
    const response = await page.request.get(endpoint);
    assert.equal(response.status(), 200);
    return response.json();
  };
  const save = async () => {
    for (const label of ['artes', 'figurinhas'] as const) await saveStudioSection(studio, label);
  };
  const section = async (kind: 'arte' | 'sticker') => { await campaignSections(page).getByRole('tab', { name: studioTabName(kind === 'arte' ? 'Artes' : 'Figurinhas') }).click(); };
  const names = async (kind: 'arte' | 'sticker') => {
    await section(kind);
    return studio.getByRole('textbox', { name: new RegExp(`^Nome ${kind === 'arte' ? 'da arte' : 'do sticker'} \\d+$`) }).evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value));
  };
  const reference = async (x: number, y: number, width: number, height: number) => {
    await setEditorReference(page, studio, { x, y, width, height });
  };
  const positionPreview = async () => {
    await page.locator('iframe[title="Prévia real do editor da campanha"]').evaluate(el => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 100));
  };
  const initial = await saved();
  assert.equal(initial.event.artworks.length, 0);
  assert.equal(initial.event.stickers.length, 0);
  setStage('gallery: upload and rename three artworks and stickers');
  await openStudio(page);
  // The preceding dirty-guard scenario intentionally leaves a recoverable color draft.
  // Gallery starts from the empty server fixture, not that unrelated local draft.
  const recovery = page.getByRole('alertdialog');
  if (await recovery.isVisible()) {
    await recovery.getByRole('button', { name: 'Descartar', exact: true }).click();
    await expect(recovery).toHaveAccessibleName('Descartar este rascunho?');
    await recovery.getByRole('button', { name: 'Descartar rascunho', exact: true }).click();
    await expect(recovery).toHaveCount(0);
    await expect(studio).toBeFocused();
  }
  for (const kind of ['artwork', 'sticker'] as const) {
    setStage(`gallery: open ${kind} section`);
    await section(kind === 'artwork' ? 'arte' : 'sticker');
    for (let n = 1; n <= 3; n++) {
      setStage(`gallery: select ${kind} ${n}`);
      const upload = studio.locator('input[type=file]').nth(kind === 'artwork' ? 0 : 1);
      await expect(upload).toBeEnabled();
      await upload.setInputFiles({ name: `${kind}-${n}.png`, mimeType: 'image/png', buffer: image(kind === 'artwork' ? 400 : 128, kind) });
      const input = studio.getByLabel(`Nome ${kind === 'artwork' ? 'da arte' : 'do sticker'} ${n}`, { exact: true });
      await expect(input).toBeEnabled();
      await input.fill(`${kind === 'artwork' ? 'Arte' : 'Sticker'} ${n}`);
      if (kind === 'artwork') {
        setStage(`gallery: reference local artwork ${n}`);
        await reference(n * 10, n * 10, 200 + n * 10, 200 + n * 10);
      }
    }
  }
  assert.deepEqual(await names('arte'), ['Arte 1', 'Arte 2', 'Arte 3']);
  assert.deepEqual(await names('sticker'), ['Sticker 1', 'Sticker 2', 'Sticker 3']);
  // Uploads and local edits have not persisted a gallery yet.
  assert.deepEqual(await saved(), initial);
  setStage('gallery: select independent reference and reorder both galleries');
  await section('arte');
  await expect(page.locator('.local-reference-canvas')).toHaveCount(0);
  const editArea = studio.getByRole('button', { name: 'Editar área da foto: Arte 2', exact: true });
  await editArea.click();
  const referenceDialog = page.getByRole('dialog', { name: 'Editar área da foto', exact: true });
  await expect(referenceDialog.locator('.local-reference-canvas')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(referenceDialog).toBeHidden();
  await expect(page.locator('.local-reference-canvas')).toHaveCount(0);
  await expect(editArea).toBeFocused();
  await editArea.click();
  await expect(referenceDialog).toBeVisible();
  const modalBounds = await referenceDialog.boundingBox();
  assert.ok(modalBounds);
  assert.ok(modalBounds.y >= 60, 'Dialog must leave breathing room above');
  assert.ok(modalBounds.y + modalBounds.height <= page.viewportSize()!.height - 60, 'Dialog must leave breathing room below');
  await expect(referenceDialog).toHaveCSS('min-height', '0px');
  await referenceDialog.screenshot({ path: '/tmp/namarca-reference-dialog.png' });
  await page.screenshot({ path: '/tmp/namarca-reference-dialog-viewport.png' });
  const originalViewport = page.viewportSize()!;
  for (const size of [{ width: 1440, height: 900 }, { width: 1440, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    const bounds = await referenceDialog.boundingBox();
    assert.ok(bounds && bounds.y >= 60 && bounds.y + bounds.height <= size.height - 60, 'Real dialog must not fill viewport');
    assert.ok(await referenceDialog.evaluate(el => el.scrollHeight <= el.clientHeight + 1), 'No modal scroll');
    const stage = await referenceDialog.locator('.ws-studio-reference-stage').boundingBox();
    assert.ok(stage && Math.abs(stage.width - stage.height) < 1, 'Artwork box remains square');
    await page.screenshot({ path: `/tmp/namarca-reference-dialog-${size.width}x${size.height}.png` });
  }
  await page.setViewportSize(originalViewport);
  await expectEditorReference(studio, { x: 20, y: 20, width: 220, height: 220 });
  await reference(25, 30, 250, 260);
  for (const kind of ['Arte', 'Sticker']) {
    await section(kind === 'Arte' ? 'arte' : 'sticker');
    await expect(studio.getByRole('button', { name: `Mover ${kind} 1 para cima`, exact: true })).toBeDisabled();
    await expect(studio.getByRole('button', { name: `Mover ${kind} 3 para baixo`, exact: true })).toBeDisabled();
    await studio.getByRole('button', { name: `Mover ${kind} 2 para cima`, exact: true }).click();
    await studio.getByRole('button', { name: `Mover ${kind} 1 para baixo`, exact: true }).click();
  }
  assert.deepEqual(await names('arte'), ['Arte 2', 'Arte 3', 'Arte 1']);
  assert.deepEqual(await names('sticker'), ['Sticker 2', 'Sticker 3', 'Sticker 1']);
  await section('arte');
  await expect(studio.getByRole('button', { name: 'Selecionar arte: Arte 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectEditorReference(studio, { x: 25, y: 30, width: 250, height: 260 });
  await save();
  const multiple = await saved();
  assert.equal(multiple.revision, initial.revision + 2);
  assert.deepEqual(multiple.event.artworks.map((art: { name: string }) => art.name), ['Arte 2', 'Arte 3', 'Arte 1']);
  assert.deepEqual(multiple.event.stickers.map((item: { name: string }) => item.name), ['Sticker 2', 'Sticker 3', 'Sticker 1']);
  assert.deepEqual(multiple.event.artworks.map((art: { reference: unknown }) => art.reference), [
    { x: 25, y: 30, width: 250, height: 260 },
    { x: 30, y: 30, width: 230, height: 230 },
    { x: 10, y: 10, width: 210, height: 210 },
  ]);
  setStage('gallery: reload order and switch preview artwork');
  await page.reload();
    await openStudio(page);
  await expect(studio.getByLabel('Nome da arte 1', { exact: true })).toHaveValue('Arte 2');
  assert.deepEqual(await names('arte'), ['Arte 2', 'Arte 3', 'Arte 1']);
  assert.deepEqual(await names('sticker'), ['Sticker 2', 'Sticker 3', 'Sticker 1']);
  await section('arte');
  await expectEditorReference(studio, { x: 25, y: 30, width: 250, height: 260 });
  await expect(preview.getByRole('img', { name: 'Composição com a arte Arte 2, sem foto', exact: true })).toBeVisible();
  await positionPreview();
  setStage('gallery: open preview artwork picker');
  await preview.getByRole('button', { name: 'Artes', exact: true }).click();
  const choices = preview.getByRole('button', { name: /^Arte Arte \d 400 × 400 px$/ });
  await expect(choices).toHaveCount(3);
  assert.deepEqual(await choices.evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label'))), ['Arte Arte 2 400 × 400 px', 'Arte Arte 3 400 × 400 px', 'Arte Arte 1 400 × 400 px']);
  setStage('gallery: choose preview artwork');
  await preview.getByRole('button', { name: 'Arte Arte 1 400 × 400 px', exact: true }).click();
  await expect(preview.getByRole('img', { name: 'Composição com a arte Arte 1, sem foto', exact: true })).toBeVisible();
  // Trying another art inside the participant UI does not mutate the studio.
  await expect(studio.getByRole('button', { name: 'Selecionar arte: Arte 2', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // Selecting in the studio does synchronize the live participant preview.
  await studio.getByRole('button', { name: 'Selecionar arte: Arte 3', exact: true }).click();
  await expect(preview.getByRole('img', { name: 'Composição com a arte Arte 3, sem foto', exact: true })).toBeVisible();
  await studio.getByRole('button', { name: 'Selecionar arte: Arte 2', exact: true }).click();
  await expect(page.locator('.local-reference-canvas')).toHaveCount(0);
  await expect(preview.getByRole('img', { name: 'Composição com a arte Arte 2, sem foto', exact: true })).toBeVisible();
  await positionPreview();
  await preview.getByRole('button', { name: 'Stickers', exact: true }).click();
  const stickerChoices = preview.getByRole('button', { name: /^Adicionar sticker Sticker \d$/ });
  await expect(stickerChoices).toHaveCount(3);
  assert.deepEqual(await stickerChoices.allTextContents(), ['Sticker 2', 'Sticker 3', 'Sticker 1']);
  setStage('gallery: remove selected artwork and a sticker, persist remaining materials');
  await studio.getByRole('button', { name: 'Remover Arte 2', exact: true }).click();
  await section('sticker');
  await studio.getByRole('button', { name: 'Remover Sticker 2', exact: true }).click();
  await section('arte');
  await expect(studio.getByRole('button', { name: 'Selecionar arte: Arte 3', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expectEditorReference(studio, { x: 30, y: 30, width: 230, height: 230 });
  await expect(preview.getByRole('button', { name: 'Adicionar sticker Sticker 2', exact: true })).toHaveCount(0);
  await save();
  const removed = await saved();
  assert.deepEqual(removed.event.artworks, multiple.event.artworks.slice(1));
  assert.deepEqual(removed.event.stickers, multiple.event.stickers.slice(1));
  // Unreferenced saved materials are deleted only after the new gallery is saved.
  // This fixture has no historical packages referencing these materials.
  const assets = endpoint.replace(/\/editor$/, '/assets');
  for (const material of [multiple.event.artworks[0], multiple.event.stickers[0]]) {
    const response = await page.request.get(`${assets}/${material.file.replace(/\.png$/, '')}`);
    assert.equal(response.status(), 404);
  }
  await page.reload();
    await openStudio(page);
  await expect(studio.getByLabel('Nome da arte 1', { exact: true })).toHaveValue('Arte 3');
  assert.deepEqual(await names('arte'), ['Arte 3', 'Arte 1']);
  assert.deepEqual(await names('sticker'), ['Sticker 3', 'Sticker 1']);
  await expect(preview.getByRole('img', { name: 'Composição com a arte Arte 3, sem foto', exact: true })).toBeVisible();
  setStage('gallery: remove all materials and persist empty draft');
  for (const name of ['Arte 3', 'Arte 1', 'Sticker 3', 'Sticker 1']) {
    await section(name.startsWith('Arte') ? 'arte' : 'sticker');
    await studio.getByRole('button', { name: `Remover ${name}`, exact: true }).click();
  }
  await section('arte');
  await expect(studio.getByText('Adicione uma arte PNG para abrir a prévia.', { exact: true })).toBeVisible();
  await section('sticker');
  await expect(studio.getByText('Nenhum sticker adicionado.', { exact: true })).toBeVisible();
  await section('arte');
  await expect(page.locator('.local-reference-canvas')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Editar área da foto', exact: true })).toHaveCount(0);
  await expect(preview.getByText('Adicione uma arte PNG para experimentar o editor.', { exact: true })).toBeVisible();
  await save();
  const empty = await saved();
  assert.deepEqual(empty.event.artworks, []);
  assert.deepEqual(empty.event.stickers, []);
  await page.reload();
    await openStudio(page);
  await section('sticker');
  await expect(studio.getByText('Nenhum sticker adicionado.', { exact: true })).toBeVisible();
  await section('arte');
  await expect(preview.getByText('Adicione uma arte PNG para experimentar o editor.', { exact: true })).toBeVisible();
  console.info('PASS gallery: 3 artworks + 3 stickers; names/order/reference selection; preview switching; removal fallback; save/reload/API; unreferenced private PNGs deleted after save; empty draft. Synthetic desktop Chromium only.');
}
