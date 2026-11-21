import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('campaign loading resolves URL tab and offers skeletons for every task without fake controls', async () => {
  const loading = await readFile('src/app/(workspace)/campanhas/[id]/loading.tsx', 'utf8');
  const skeleton = await readFile('src/components/admin-workspace/campaign-skeleton.tsx', 'utf8');
  const studio = await readFile('src/components/admin-workspace/studio-skeleton.tsx', 'utf8');
  const css = await readFile('src/components/admin-workspace/campaign-skeleton.css', 'utf8');
  assert.match(loading, /campaignSection\(searchParams.get\('aba'\), true, true\)/);
  for (const section of ['dados', 'artes', 'stickers', 'cores', 'cobranca', 'publicacao']) assert.ok(skeleton.includes(`'${section}'`));
  assert.match(skeleton, /<StudioSkeleton activeSection=\{section\}/);
  assert.match(studio, /stickers \? 1 : 2/);
  assert.match(studio, /\[0, 1, 2, 3\].map/);
  assert.doesNotMatch(studio, /ws-studio-skeleton-tabs|ws-studio-skeleton-index/);
  for (const source of [skeleton, studio]) {
    assert.match(source, /aria-busy="true"/);
    assert.match(source, /role="status"/);
    assert.match(source, /aria-hidden="true"/);
    assert.doesNotMatch(source, /<(button|input|iframe)\b/);
  }
  assert.match(css, /prefers-reduced-motion:reduce[\s\S]*animation:none/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
});
