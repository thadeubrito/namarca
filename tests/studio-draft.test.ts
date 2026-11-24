import assert from 'node:assert/strict';
import test from 'node:test';
import { sameDraftValue, localMaterialId, draftKey, uploadPool } from '../src/lib/studio-draft';

test('fila limita concorrência a três e aguarda sucessos após falha parcial', async () => {
  let active = 0;
  let max = 0;
  const finished: number[] = [];
  await assert.rejects(uploadPool([1, 2, 3, 4, 5, 6, 7], async item => {
    active++; max = Math.max(max, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--; finished.push(item);
    if (item === 2) throw new Error('falha');
  }));
  assert.equal(max, 3);
  assert.equal(active, 0);
  assert.equal(finished.length, 7);
});

test('fila sequencial mantém ordem, apenas um envio ativo e continua após falha', async () => {
  let active = 0;
  let maximum = 0;
  const finished: number[] = [];
  await assert.rejects(uploadPool([1, 2, 3], async item => {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    finished.push(item);
    if (item === 2) throw new Error('falha');
  }, 1));
  assert.equal(maximum, 1);
  assert.equal(active, 0);
  assert.deepEqual(finished, [1, 2, 3]);
});

test('ID local usa UUIDv4 aleatório sem depender de contexto seguro', () => {
  const values = Array.from({ length: 100 }, localMaterialId);
  assert.equal(new Set(values).size, 100);
  for (const value of values) assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('comparação de rascunho ignora ordem de chaves JSONB mas preserva ordem de galeria', () => {
  assert.equal(sameDraftValue([{ id: 'a', name: 'Arte', reference: { x: 1, y: 2 } }], [{ reference: { y: 2, x: 1 }, name: 'Arte', id: 'a' }]), true);
  assert.equal(sameDraftValue(['a', 'b'], ['b', 'a']), false);
});

test('rascunhos locais são separados por administrador e campanha', () => {
  assert.notEqual(draftKey('a', 'evento'), draftKey('b', 'evento'));
  assert.notEqual(draftKey('a', 'evento'), draftKey('a', 'outro'));
});
