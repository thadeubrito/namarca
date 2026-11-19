import { expect, type Locator, type Page } from '@playwright/test';

export type EditorReference = { x: number; y: number; width: number; height: number };
type Dimensions = { width: number; height: number };
const fixtureDimensions: Dimensions = { width: 400, height: 400 };

/** Read the actual inline percentage rectangle, in source-image pixels (not CSS pixels). */
export async function readEditorReference(scope: Locator, dimensions: Dimensions = fixtureDimensions): Promise<EditorReference> {
  return scope.locator('.local-reference-canvas .local-reference-box').evaluate((element, size) => {
    const style = (element as HTMLElement).style;
    const values = [style.left, style.top, style.width, style.height];
    const extents = [size.width, size.height, size.width, size.height];
    const pixels: number[] = [];
    for (let i = 0; i < values.length; i++) {
      if (!values[i].endsWith('%')) throw new Error('Expected percentage reference style');
      const result = Number.parseFloat(values[i]) * extents[i] / 100;
      if (!Number.isFinite(result)) throw new Error('Invalid reference percentage');
      pixels.push(Math.round(result * 1e6) / 1e6);
    }
    return { x: pixels[0], y: pixels[1], width: pixels[2], height: pixels[3] };
  }, dimensions);
}

export async function expectEditorReference(scope: Locator, reference: EditorReference, dimensions: Dimensions = fixtureDimensions) {
  await expect(scope.locator('.local-reference-canvas')).toBeVisible();
  await expect.poll(() => readEditorReference(scope, dimensions)).toEqual(reference);
}

/** Resize via real pointer input; never write React state, DOM styles or dispatch synthetic events. */
export async function setEditorReference(page: Page, scope: Locator, reference: EditorReference, dimensions: Dimensions = fixtureDimensions) {
  const { x, y, width, height } = reference;
  if (![x, y, width, height, dimensions.width, dimensions.height].every(Number.isInteger)
    || x < 0 || y < 0 || width < 1 || height < 1
    || x + width > dimensions.width || y + height > dimensions.height) {
    throw new Error('Reference must be an integer rectangle inside the source image');
  }
  const canvas = scope.locator('.local-reference-canvas');
  const image = canvas.locator('img');
  await expect(canvas).toBeVisible();
  await expect.poll(() => image.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
  const dragHandle = async (handle: 'nw' | 'se', targetX: number, targetY: number) => {
    const control = canvas.locator(`.local-reference-handle.handle-${handle}`);
    await control.scrollIntoViewIfNeeded();
    await control.hover();
    const start = await control.boundingBox();
    const bounds = await image.boundingBox();
    if (!start || !bounds || !bounds.width || !bounds.height) throw new Error('Reference canvas has no pointer geometry');
    const clientX = start.x + start.width / 2;
    const clientY = start.y + start.height / 2;
    expect(await control.evaluate((el, point) => {
      const hit = document.elementFromPoint(point.x, point.y);
      return hit === el || !!hit && el.contains(hit);
    }, { x: clientX, y: clientY })).toBe(true);
    await page.mouse.move(clientX, clientY);
    await page.mouse.down();
    try {
      const currentBounds = await image.boundingBox();
      if (!currentBounds) throw new Error('Reference image disappeared during pointer gesture');
      await page.mouse.move(currentBounds.x + targetX * currentBounds.width / dimensions.width, currentBounds.y + targetY * currentBounds.height / dimensions.height, { steps: 5 });
      // Hovering clipped edge handles can scroll the overflow-hidden canvas itself.
      // Re-read its real geometry after leaving the edge, while capture is active.
      const settledBounds = await image.boundingBox();
      if (!settledBounds) throw new Error('Reference image disappeared during pointer gesture');
      await page.mouse.move(settledBounds.x + targetX * settledBounds.width / dimensions.width, settledBounds.y + targetY * settledBounds.height / dimensions.height);
    } finally {
      await page.mouse.up();
    }

  };
  // Expand first so moving NW cannot be clamped by the previous right/bottom edges.
  await dragHandle('se', dimensions.width, dimensions.height);
  await dragHandle('nw', x, y);
  await dragHandle('se', x + width, y + height);
  await expectEditorReference(scope, reference, dimensions);
}
