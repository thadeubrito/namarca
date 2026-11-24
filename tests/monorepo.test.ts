import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, access } from 'node:fs/promises';

test('um único Next na raiz sem workspaces e com migrations versionadas', async () => {
  const root = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(root.workspaces, undefined);
  assert.equal(root.scripts.dev, 'next dev --webpack --hostname 0.0.0.0');
  assert.equal(root.dependencies['@namarca/editor'], undefined);
  assert.equal(root.scripts.predev, undefined);
  assert.equal(root.scripts.prebuild, undefined);
  assert.equal(root.scripts['build:public'], undefined);
  assert.equal(root.scripts.build, 'next build');
  await access('src/editor/PhotoEditor.tsx');
  await access('drizzle/meta/_journal.json');
});
test('editor público e prévia são componentes Next sem build ou runtime paralelo', async () => {
  for (const retired of ['src/runtime', 'scripts/build-public.mjs', 'public/campaign-runtime']) {
    await assert.rejects(access(retired), { code: 'ENOENT' });
  }
  await access('src/app/[slug]/page.tsx');
  await access('src/editor/PublicCampaignEditor.tsx');
  await access('src/editor/CampaignPreview.tsx');
  await access('src/proxy.ts');
});
