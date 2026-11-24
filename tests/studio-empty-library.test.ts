import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('biblioteca vazia tem ação única contextual sem caixa genérica', async () => {
  const studio = await readFile('src/components/admin-workspace/studio-workspace.tsx', 'utf8');
  const css = await readFile('src/components/admin-workspace/studio.css', 'utf8');
  assert.match(studio, /items.length > 0 && <div className="ws-studio-upload-tools"/);
  assert.match(studio, /!items.length \? <div className="ws-studio-library-empty"/);
  assert.match(studio, /Adicione a primeira arte/);
  assert.match(studio, /Elas são opcionais e ficam disponíveis na composição/);
  assert.match(studio, /Adicionar figurinha PNG/);
  assert.doesNotMatch(studio, /Nenhum sticker adicionado|Sua biblioteca de artes está vazia/);
  assert.match(css, /\.ws-studio-library \.ws-studio-upload input\[type=file\] \{ position:absolute/);
  assert.match(css, /\.ws-studio-library-empty \{[^\n]*align-items:center[^\n]*width:min\(100%,420px\)[^\n]*margin:0 auto[^\n]*text-align:center/);
});
