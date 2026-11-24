import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Hero } from '../src/components/site/Hero';

test('landing é uma página Next nativa sem HTML copiado de estudos', async () => {
  const page = await readFile('src/app/page.tsx', 'utf8');
  assert.doesNotMatch(page, /readFile|dangerouslySetInnerHTML|iframe|from ['"].*(?:experiments|site\/estudos)/);
  const config = await readFile('next.config.ts', 'utf8');
  assert.doesNotMatch(config, /destination: '\/institutional.html'/);
  const root = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(root.scripts.build, 'next build');
  assert.doesNotMatch(JSON.stringify(root.scripts), /build-public|copy-public-site|tests\/fixtures/);
  for (const retired of ['site', 'experiments', 'compose.site-lab.yaml']) {
    await assert.rejects(access(retired), { code: 'ENOENT' });
  }
  await access('public/landing/poppins-700-latin.woff2');
  await access('public/landing/materials/clube-sol-story-display.webp');
});

test('CTA exemplo é opcional e aponta para campanha administrativa configurada', () => {
  assert.doesNotMatch(renderToStaticMarkup(createElement(Hero)), /Ver um exemplo/);
  assert.match(renderToStaticMarkup(createElement(Hero, { exampleHref: '/campanha-exemplo' })), /href="\/campanha-exemplo">Ver um exemplo/);
});
