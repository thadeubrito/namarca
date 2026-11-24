import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

test('hero config stays identical to authored CSS without runtime style sampling', async () => {
  const base = new URL('../apps/site/estudos/lima/', import.meta.url);
  const css = await readFile(new URL('materials.css', base), 'utf8');
  const script = await readFile(new URL('photo-geometry.js', base), 'utf8');
  const sandbox = { window: {} as { namarcaHeroGeometry?: { geometry: number[]; points: number[][] }[] } };
  runInNewContext(script, sandbox);
  const config = sandbox.window.namarcaHeroGeometry!;
  assert.equal(config.length, 5);
  for (const [i, item] of config.entries()) {
    for (const [j, key] of ['left', 'top', 'width', 'height'].entries()) {
      const authored = Number.parseFloat(css.match(new RegExp(`--perspective-photo-${i}-${key}:([^;]+)`))![1]);
      assert.equal(item.geometry[j], authored);
    }
    const clip = css.match(new RegExp(`photo\\[data-shape='${i}'\\] img\\{[^}]*clip-path:([^}]+)`))![1];
    const points = [...clip.matchAll(/(-?[\d.]+)%\s+(-?[\d.]+)%/g)].map(m => [Number(m[1]), Number(m[2])]);
    assert.equal(JSON.stringify(item.points), JSON.stringify(points));
  }
  const html = await readFile(new URL('index.html', base), 'utf8');
  assert.ok(html.indexOf('photo-geometry.js') < html.indexOf('perspectiva.js'));
  assert.match(html, /data-photo-source="namarcaHeroGeometry"/);
});
