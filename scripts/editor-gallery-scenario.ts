import assert from 'node:assert/strict';
import { expect, type Page } from '@playwright/test';

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
    await studio.getByRole('button', { name: 'Salvar configuração', exact: true }).click();
    await expect(studio.getByRole('status')).toHaveText('Configuração salva. A campanha não foi publicada.');
  };
  const section = async (kind: 'arte' | 'sticker') => { await studio.getByRole('tab', { name: kind === 'arte' ? 'Artes e área da foto' : 'Stickers', exact: true }).click(); };
  const names = async (kind: 'arte' | 'sticker') => {
    await section(kind);
    return studio.getByRole('textbox', { name: new RegExp(`^Nome ${kind === 'arte' ? 'da arte' : 'do sticker'} \\d+$`) }).evaluateAll(inputs => inputs.map(input => (input as HTMLInputElement).value));
  };
  const reference = async (x: number, y: number, width: number, height: number) => {
    // Shrink before moving: every input change clamps to the image bounds.
    for (const [label, value] of [['Largura', width], ['Altura', height], ['X', x], ['Y', y]] as const) {
      await studio.getByLabel(label, { exact: true }).fill(String(value));
      await expect(studio.getByLabel(label, { exact: true })).toHaveValue(String(value));
    }
  };
  const positionPreview = async () => {
    await page.locator('iframe[title="Prévia real do editor da campanha"]').evaluate(el => window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 100));
  };
  const initial = await saved();
  assert.equal(initial.event.artworks.length, 0);
  assert.equal(initial.event.stickers.length, 0);
  setStage('gallery: upload and rename three artworks and stickers');
  await page.getByRole('tab', { name: 'Estúdio', exact: true }).click();
  for (const kind of ['artwork', 'sticker'] as const) {
    await section(kind === 'artwork' ? 'arte' : 'sticker');
    for (let n = 1; n <= 3; n++) {
      const upload = studio.locator('input[type=file]').nth(kind === 'artwork' ? 0 : 1);
      await expect(upload).toBeEnabled();
      await upload.setInputFiles({ name: `${kind}-${n}.png`, mimeType: 'image/png', buffer: image(kind === 'artwork' ? 400 : 128, kind) });
      const input = studio.getByLabel(`Nome ${kind === 'artwork' ? 'da arte' : 'do sticker'} ${n}`, { exact: true });
      await expect(input).toBeEnabled();
      await input.fill(`${kind === 'artwork' ? 'Arte' : 'Sticker'} ${n}`);
      if (kind === 'artwork') await reference(n * 10, n * 10, 200 + n * 10, 200 + n * 10);
    }
  }
  assert.deepEqual(await names('arte'), ['Arte 1', 'Arte 2', 'Arte 3']);
  assert.deepEqual(await names('sticker'), ['Sticker 1', 'Sticker 2', 'Sticker 3']);
  // Uploads and local edits have not persisted a gallery yet.
  assert.deepEqual(await saved(), initial);
  setStage('gallery: select independent reference and reorder both galleries');
  await section('arte');
  await studio.getByRole('button', { name: 'Editar área da foto: Arte 2', exact: true }).click();
  await expect(studio.getByRole('heading', { name: 'Área da foto · Arte 2', exact: true })).toBeVisible();
  await expect(studio.getByLabel('X', { exact: true })).toHaveValue('20');
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
  await expect(studio.getByRole('heading', { name: 'Área da foto · Arte 2', exact: true })).toBeVisible();
  await expect(studio.getByLabel('X', { exact: true })).toHaveValue('25');
  await save();
  const multiple = await saved();
  assert.equal(multiple.revision, initial.revision + 1);
  assert.deepEqual(multiple.event.artworks.map((art: { name: string }) => art.name), ['Arte 2', 'Arte 3', 'Arte 1']);
  assert.deepEqual(multiple.event.stickers.map((item: { name: string }) => item.name), ['Sticker 2', 'Sticker 3', 'Sticker 1']);
  assert.deepEqual(multiple.event.artworks.map((art: { reference: unknown }) => art.reference), [
    { x: 25, y: 30, width: 250, height: 260 },
    { x: 30, y: 30, width: 230, height: 230 },
    { x: 10, y: 10, width: 210, height: 210 },
  ]);
  setStage('gallery: reload order and switch preview artwork');
  await page.reload();
  await expect(studio.getByLabel('Nome da arte 1', { exact: true })).toHaveValue('Arte 2');
  assert.deepEqual(await names('arte'), ['Arte 2', 'Arte 3', 'Arte 1']);
  assert.deepEqual(await names('sticker'), ['Sticker 2', 'Sticker 3', 'Sticker 1']);
  await section('arte');
  await expect(studio.getByLabel('X', { exact: true })).toHaveValue('25');
  await expect(preview.getByRole('img', { name: 'Composição com a arte Arte 2, sem foto', exact: true })).toBeVisible();
  await positionPreview();
  await preview.getByRole('button', { name: 'Artes', exact: true }).click();
  const choices = preview.getByRole('button', { name: /^Arte Arte \d 400 × 400 px$/ });
  await expect(choices).toHaveCount(3);
  assert.deepEqual(await choices.evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label'))), ['Arte Arte 2 400 × 400 px', 'Arte Arte 3 400 × 400 px', 'Arte Arte 1 400 × 400 px']);
  await preview.getByRole('button', { name: 'Arte Arte 1 400 × 400 px', exact: true }).click();
  await expect(preview.getByRole('img', { name: 'Composição com a arte Arte 1, sem foto', exact: true })).toBeVisible();
  // Trying another art inside the participant UI does not mutate the studio.
  await expect(studio.getByRole('heading', { name: 'Área da foto · Arte 2', exact: true })).toBeVisible();
  // Selecting in the studio does synchronize the live participant preview.
  await studio.getByRole('button', { name: 'Editar área da foto: Arte 3', exact: true }).click();
  await expect(preview.getByRole('img', { name: 'Composição com a arte Arte 3, sem foto', exact: true })).toBeVisible();
  await studio.getByRole('button', { name: 'Editar área da foto: Arte 2', exact: true }).click();
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
  await expect(studio.getByRole('heading', { name: 'Área da foto · Arte 3', exact: true })).toBeVisible();
  await expect(studio.getByLabel('X', { exact: true })).toHaveValue('30');
  await expect(preview.getByRole('button', { name: 'Adicionar sticker Sticker 2', exact: true })).toHaveCount(0);
  await save();
  const removed = await saved();
  assert.deepEqual(removed.event.artworks, multiple.event.artworks.slice(1));
  assert.deepEqual(removed.event.stickers, multiple.event.stickers.slice(1));
  // Removing gallery entries must not delete the private objects (snapshots may use them).
  const assets = endpoint.replace(/\/editor$/, '/assets');
  for (const material of [multiple.event.artworks[0], multiple.event.stickers[0]]) {
    const response = await page.request.get(`${assets}/${material.file.replace(/\.png$/, '')}`);
    assert.equal(response.status(), 200);
    assert.equal(response.headers()['content-type'], 'image/png');
    assert.ok((await response.body()).length > 0);
  }
  await page.reload();
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
  await expect(studio.getByText('Rascunho sem artes. Adicione um PNG para liberar a prévia.', { exact: true })).toBeVisible();
  await section('sticker');
  await expect(studio.getByText('Nenhum sticker adicionado.', { exact: true })).toBeVisible();
  await section('arte');
  await expect(studio.getByRole('heading', { name: /^Área da foto/ })).toHaveCount(0);
  await expect(preview.getByText('Adicione uma arte PNG para experimentar o editor.', { exact: true })).toBeVisible();
  await save();
  const empty = await saved();
  assert.deepEqual(empty.event.artworks, []);
  assert.deepEqual(empty.event.stickers, []);
  await page.reload();
  await section('sticker');
  await expect(studio.getByText('Nenhum sticker adicionado.', { exact: true })).toBeVisible();
  await section('arte');
  await expect(preview.getByText('Adicione uma arte PNG para experimentar o editor.', { exact: true })).toBeVisible();
  console.info('PASS gallery: 3 artworks + 3 stickers; names/order/reference selection; preview switching; removal fallback; save/reload/API; removed private PNGs retained; empty draft. Synthetic desktop Chromium only.');
}
