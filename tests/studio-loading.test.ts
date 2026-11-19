import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('estúdio compartilha skeleton entre bundle e configuração sem esconder erros', async () => {
  const [launcher, workspace, skeleton, css] = await Promise.all([
    'studio.tsx', 'studio-workspace.tsx', 'studio-skeleton.tsx', 'studio.css',
  ].map(file => readFile(`src/components/admin-workspace/${file}`, 'utf8')));
  assert.match(launcher, /loading: \(\) => <StudioSkeleton \/>/);
  assert.match(workspace, /if \(!failure\) return <StudioSkeleton \/>/);
  assert.match(workspace, /role="alert">\{message\}/);
  assert.match(workspace, /Tentar novamente/);
  assert.match(skeleton, /aria-busy="true"/);
  assert.match(skeleton, /role="status">Carregando estúdio/);
  assert.match(skeleton, /aria-hidden="true"/);
  assert.doesNotMatch(skeleton, /<(button|input|iframe)\b/);
  assert.match(css, /prefers-reduced-motion:reduce[\s\S]*animation:none!important/);
});
