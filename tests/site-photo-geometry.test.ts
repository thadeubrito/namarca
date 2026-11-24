import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { heroGeometry } from '../src/components/site/photo-geometry';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Hero } from '../src/components/site/Hero';
import ts from 'typescript';

test('hero config stays identical to authored CSS without runtime style sampling', async () => {
  const base = new URL('../src/components/site/', import.meta.url);
  const css = await readFile(new URL('landing.css', base), 'utf8');
  const config = heroGeometry;
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
  const html = renderToStaticMarkup(createElement(Hero));
  assert.match(html, /data-photo-source="namarcaHeroGeometry"/);
  const renderer = await readFile(new URL('perspective.js', base), 'utf8');
  assert.match(renderer, /import\s*\{\s*heroGeometry\s*\}\s*from\s*['"]\.\/photo-geometry['"]/);
  const tree = ts.createSourceFile('perspective.js', renderer, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let approvedBranch: ts.Statement | undefined;
  function visit(node: ts.Node) {
    if (ts.isIfStatement(node) && ts.isBinaryExpression(node.expression)
      && ts.isIdentifier(node.expression.left) && node.expression.left.text === 'source'
      && ts.isStringLiteral(node.expression.right) && node.expression.right.text === 'namarcaHeroGeometry') {
      approvedBranch = node.thenStatement;
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(approvedBranch, 'Hero seleciona o módulo de geometria aprovada');
  assert.match(approvedBranch.getText(tree), /const config = heroGeometry/);
  assert.doesNotMatch(approvedBranch.getText(tree), /getComputedStyle/);
});
