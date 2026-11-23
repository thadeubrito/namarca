import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('laboratório Astro é isolado, estático, sem adapter/SSR', () => {
  const config = read('apps/site-lab/astro.config.mjs');
  assert.match(config, /output: 'static'/);
  assert.doesNotMatch(config, /adapter|output: 'server'/);
  assert.match(read('apps/site-lab/src/pages/index.astro'), /client:load/);
  assert.match(read('apps/site-lab/src/pages/index.astro'), /artes prontas do hero público/);
  assert.match(read('apps/site-lab/components.json'), /@\/components\/ui/);
  assert.match(read('apps/site-lab/tsconfig.json'), /astro\/tsconfigs\/strict/);
  assert.match(read('compose.site-lab.yaml'), /127.0.0.1:3002:3002/);
  assert.doesNotMatch(read('compose.site-lab.yaml'), /env_file|node_modules|astro preview/);
});

test('renderer preserva geometria, shaders, fallbacks e crédito fornecidos', () => {
  const code = read('apps/site-lab/src/components/ui/warp-carousel.tsx');
  for (const marker of ['Louis Studios', 'FOCAL = 734.103', 'function poseAt', 'function spinN', 'function paintMesh', 'function drawFallback', 'sampler2DArray', 'float lensH', 'requestAnimationFrame', 'prefers-reduced-motion']) assert.ok(code.includes(marker), marker);
  assert.match(code, /!p.reduced/);
  assert.match(code, /canvas.dataset.renderer/);
  assert.doesNotMatch(code, /outline: "none"/);
  const pkg = JSON.parse(read('apps/site-lab/package.json'));
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), ['@astrojs/react', 'astro', 'react', 'react-dom']);
});

test('galeria usa somente quatro artes autorizadas, sem números sobre fotos', () => {
  const data = read('apps/site-lab/src/components/campaign-cards.ts');
  assert.equal((data.match(/imageSrc:/g) || []).length, 4);
  assert.doesNotMatch(data, /corrida-horizonte|pulso-festival|vertice-21k/);
  assert.match(read('apps/site-lab/src/components/warp-demo.tsx'), /step=\{1\}/);
  const code = read('apps/site-lab/src/components/ui/warp-carousel.tsx');
  assert.match(code, /CH = CW \* 853 \/ 480/);
  assert.match(code, /if \(card.imageSrc\)/);
  assert.match(code, /images.get\(card.imageSrc\)/);
});

test('build, quando presente, tem HTML útil e assets locais sem servidor', () => {
  const dir = new URL('../apps/site-lab/dist/', import.meta.url);
  try { statSync(dir); } catch { return; }
  const html = read('apps/site-lab/dist/index.html');
  assert.match(html, /As campanhas/);
  assert.match(html, /orbita-26\.webp/);
  assert.match(html, /_astro\//);
  assert.doesNotMatch(html, /localhost|https:\/\/fonts|\/src\/.*\.tsx/);
  assert.ok(readdirSync(new URL('_astro/', dir)).some(name => name.endsWith('.js')));
});
