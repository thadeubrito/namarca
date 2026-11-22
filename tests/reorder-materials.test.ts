import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { reorderMaterials } from '../apps/admin/src/lib/reorder-materials';

test('material ordering inserts forward/backward while retaining objects and references', () => {
  const items = ['a', 'b', 'c', 'd'].map(id => ({ id, reference: { x: 1 } }));
  const forward = reorderMaterials(items, 0, 3);
  assert.deepEqual(forward.map(item => item.id), ['b', 'c', 'd', 'a']);
  assert.equal(forward[3], items[0]);
  assert.equal(forward[3].reference, items[0].reference);
  assert.deepEqual(reorderMaterials(forward, 3, 0), items);
  assert.deepEqual(items.map(item => item.id), ['a', 'b', 'c', 'd']);
});

test('studio shares accessible pointer handles in both material libraries', async () => {
  const workspace = await readFile('apps/admin/src/components/admin-workspace/studio-workspace.tsx', 'utf8');
  const handle = await readFile('apps/admin/src/components/admin-workspace/sortable-material.tsx', 'utf8');
  const css = await readFile('apps/admin/src/components/admin-workspace/studio.css', 'utf8');
  assert.match(workspace, /<SortableMaterial key=\{item.id\}/);
  assert.doesNotMatch(workspace, /<ArrowUp|<ArrowDown/);
  for (const feature of ['DndContext', 'DragOverlay', 'PointerSensor', 'KeyboardSensor', 'sortableKeyboardCoordinates', 'rectSortingStrategy', 'setActivatorNodeRef']) assert.ok(handle.includes(feature));
  assert.match(workspace, /<TextInput className="ws-studio-asset-name" aria-label=\{`Nome /);
  assert.match(workspace, /value=\{item.name\} disabled=\{busy\} onChange=/);
  assert.match(css, /ws-studio-asset-name \{[^\n]+min-width:0;[^\n]+text-overflow:ellipsis/);
  assert.match(css, /flex:0 0 44px;width:44px/);
  assert.match(workspace, /aria-label=\{`Remover \$\{item.name\}/);
  assert.match(workspace, /alt=\{item.name\}/);
  assert.match(handle, /screenReaderInstructions/);
  assert.match(handle, /onDragCancel/);
  assert.match(css, /ws-studio-drag-handle[^\n]+touch-action:none/);
  // The floating card uses the original renderer: image and footer, no name field.
  assert.match(workspace, /renderMaterial=\{renderMaterial\}/);
  assert.match(workspace, /\{renderMaterial\(item\)\}/);
  assert.match(handle, /\{renderMaterial\(active\)\}/);
  assert.match(handle, /className="ws-studio-asset ws-studio-drag-overlay" aria-hidden="true" inert/);
  assert.doesNotMatch(css, /font:500 13px\/1\.5 system-ui/);
  assert.match(css, /\.ws-studio-thumbnail img \{ display:block/);
  assert.doesNotMatch(css, /scale\(1\.025\)/);
  assert.match(css, /height:160px;min-height:160px;padding:12px/);
  assert.match(css, /data-kind=sticker/);
  assert.match(css, /ws-studio-asset-actions \{[^\n]+border-top:0/);
  assert.match(css, /data-selected=true\] \{ border-color:var\(--brand\);outline:0/);
});

test('invalid, same-position and empty moves preserve order', () => {
  for (const [from, to] of [[-1, 0], [0, 5], [NaN, 1], [0, 0], [0.5, 1]]) {
    assert.deepEqual(reorderMaterials(['a', 'b'], from, to), ['a', 'b']);
  }
  assert.deepEqual(reorderMaterials([], 0, 0), []);
});
