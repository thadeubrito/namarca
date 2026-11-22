import assert from 'node:assert/strict';
import { test } from 'node:test';
import { uploadFailureMessage } from '../apps/admin/src/lib/upload-feedback';

test('upload explica transparência e PNG inválido sem mudar a política de validação', async () => {
  assert.match(await uploadFailureMessage(Response.json({ error: 'PNG deve conter pixels transparentes e opacos' }, { status: 422 })), /totalmente transparente.*totalmente opaco/);
  assert.match(await uploadFailureMessage(Response.json({ error: 'PNG inválido' }, { status: 422 })), /Exporte novamente/);
});

test('upload trata tamanho, sessão e respostas não JSON com mensagens seguras', async () => {
  assert.match(await uploadFailureMessage(new Response('', { status: 413 })), /25 MiB.*40 milhões/);
  assert.match(await uploadFailureMessage(new Response('', { status: 403 })), /Entre novamente/);
  assert.match(await uploadFailureMessage(new Response('<html>internal detail</html>', { status: 422 })), /Não foi possível/);
});

test('upload nunca ecoa detalhes arbitrários ou payload de erros internos', async () => {
  for (const status of [422, 503]) {
    const message = await uploadFailureMessage(Response.json({ error: 'private-object-key synthetic-secret' }, { status }));
    assert.doesNotMatch(message, /private-object|synthetic-secret/);
  }
  assert.equal(await uploadFailureMessage(Response.json({ error: 'Nome de arquivo inválido' }, { status: 422 })), 'Nome de arquivo inválido.');
});
