import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, access } from 'node:fs/promises';

const json = async (file: string) => JSON.parse(await readFile(file, 'utf8'));

test('workspaces declaram aplicações e exports do editor sem aliases para implementação', async () => {
  const root = await json('package.json');
  assert.deepEqual(root.workspaces, ['apps/*', 'packages/*']);
  const admin = await json('apps/admin/package.json');
  const campaign = await json('apps/campaign/package.json');
  const editor = await json('packages/editor/package.json');
  assert.equal(admin.dependencies['@namarca/editor'], '*');
  assert.equal(campaign.dependencies['@namarca/editor'], '*');
  assert.equal(editor.exports['./events'], './src/events/events.ts');
  assert.match(admin.scripts.prebuild, /build:preview/);
  assert.equal((await json('apps/admin/tsconfig.json')).compilerOptions.paths['@namarca/editor/events'], undefined);
  await access('apps/admin/drizzle/meta/_journal.json');
});

test('artefato público é independente do Next e a prévia mantém contrato publicado', async () => {
  const build = await readFile('apps/campaign/build.mjs', 'utf8');
  const copy = await readFile('apps/admin/scripts/copy-preview.mjs', 'utf8');
  const host = await readFile('services/public-site/server.mjs', 'utf8');
  assert.match(build, /apps\/campaign\/dist/);
  assert.doesNotMatch(build, /apps\/admin/);
  assert.match(copy, /campaign\/dist/);
  assert.match(copy, /public\/event-runtime/);
  assert.match(host, /runtimeDir = resolve\(root, 'apps\/campaign\/dist'\)/);
  assert.match(host, /\/event-runtime\//);
});
