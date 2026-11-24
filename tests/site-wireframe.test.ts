import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { Header } from '../src/components/site/Header';
import { Hero } from '../src/components/site/Hero';
import { Sharing } from '../src/components/site/Sharing';
import { HowItWorks } from '../src/components/site/HowItWorks';
import { FAQ } from '../src/components/site/FAQ';
import { Contact } from '../src/components/site/Contact';
import { Footer } from '../src/components/site/Footer';

// Inspect the actual Next entry with its TSX AST, not formatting-sensitive JSX regex.
test('entrada Next monta a landing nativa, metadados e preloads locais', async () => {
  const source = await readFile(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports: string[] = [];
  const components: string[] = [];
  const preloads: Record<string, string>[] = [];
  const ids: string[] = [];
  const anchors: string[] = [];
  let metadata: ts.ObjectLiteralExpression | undefined;
  function attributes(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement) {
    return Object.fromEntries(node.attributes.properties.flatMap(attribute =>
      ts.isJsxAttribute(attribute) && attribute.initializer && ts.isStringLiteral(attribute.initializer)
        ? [[attribute.name.getText(tree), attribute.initializer.text]] : []));
  }
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'metadata' && node.initializer && ts.isObjectLiteralExpression(node.initializer)) metadata = node.initializer;
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = node.tagName.getText(tree);
      const attrs = attributes(node);
      if (/^[A-Z]/.test(name)) components.push(name);
      if (attrs.rel === 'preload') preloads.push(attrs);
      if (attrs.id) ids.push(attrs.id);
      if (attrs.href?.startsWith('#')) anchors.push(attrs.href.slice(1));
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.deepEqual(components, ['Landing', 'Header', 'Hero', 'Sharing', 'HowItWorks', 'FAQ', 'Contact', 'Footer']);
  assert.ok(imports.includes('@/components/site/landing.css'));
  assert.doesNotMatch(source, /site\/estudos|site\/index|dangerouslySetInnerHTML|<iframe|fetch\(/);
  assert.ok(metadata);
  const properties = Object.fromEntries(metadata.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(tree), p.initializer]));
  assert.ok(ts.isStringLiteral(properties.title));
  assert.equal(properties.title.text, 'Namarca — boca a boca digital para sua campanha');
  assert.ok(ts.isStringLiteral(properties.description));
  assert.match(properties.description.text, /Campanhas de marketing com participação e boca a boca digital/);
  assert.ok(ts.isObjectLiteralExpression(properties.robots));
  assert.deepEqual(Object.fromEntries(properties.robots.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(tree), p.initializer.getText(tree)])),
    { index: 'launchIndexing', follow: 'launchIndexing' });
  assert.match(source, /process\.env\.NODE_ENV === 'production'/);
  assert.match(source, /=== 'https:\/\/namarca\.com'/);
  assert.match(source, /process\.env\.VERCEL_ENV !== 'preview'/);
  const fonts = preloads.filter(p => p.as === 'font');
  assert.equal(fonts.length, 4);
  for (const weight of [700, 300, 500, 600]) {
    const font = fonts.find(p => p.href === `/landing/poppins-${weight}-latin.woff2`);
    assert.ok(font);
    assert.equal(font.type, 'font/woff2');
    assert.equal(font.crossOrigin, 'anonymous');
    if (weight === 600) assert.equal(font.media, '(min-width: 901px)');
  }
  for (const preload of preloads) {
    assert.ok(preload.href.startsWith('/landing/'));
    assert.ok((await readFile(new URL(`../public${preload.href}`, import.meta.url))).length > 0);
  }
  assert.ok(ids.includes('conteudo'));
  assert.ok(anchors.includes('conteudo'));
});

test('conteúdo nativo mantém copy, privacidade, navegação acessível e participação opcional', () => {
  const html = [Header, Hero, Sharing, HowItWorks, FAQ, Contact, Footer]
    .map(Component => renderToStaticMarkup(createElement(Component))).join('');
  assert.match(html, /<p class="eyebrow">Boca a boca digital<\/p><h1 id="hero-title">Sua campanha\. As pessoas ajudam a divulgar\.<\/h1>/);
  assert.match(html, /Com a própria foto, molduras e figurinhas, cada pessoa faz parte da sua campanha e leva essa participação às redes sociais\./);
  assert.match(html, /Vamos conversar/);
  assert.equal([...html.matchAll(/class="brand"[^>]*>namarca<\/a>/g)].length, 2);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  assert.equal([...html.matchAll(/<details>/g)].length, 5);
  assert.match(html, /<details class="mobile-nav"><summary aria-label="Abrir o menu">/);
  assert.doesNotMatch(html, /href="tel:|api\.whatsapp|data-autoplay(?:\s|=|>)/);
  assert.match(html, /data-autoplay-interval="3000"/);
  assert.match(html, /data-entrance-style="stack"/);
  assert.match(html, /<div\b(?=[^>]*data-perspective)(?=[^>]*data-compositions="5")(?=[^>]*data-photo-motion="continuous")(?=[^>]*data-stickers="false")(?=[^>]*tabindex="0")(?=[^>]*role="group")[^>]*>/);
  assert.doesNotMatch(html, /<button\b|role="button"|data-autoplay-label|pause-icon|class="controls"|class="counter"|data-step|01 \/ 03/);
  assert.doesNotMatch(html, /<form\b|<input\b|<iframe\b|<canvas\b|shimmer|fetch\(|setInterval/i);
  assert.match(html, /Sem cadastro\. Sem instalar aplicativo\./);
  assert.match(html, /A foto e a composição não são enviadas aos nossos servidores\. A imagem é gerada no navegador e salva no dispositivo\./);
  assert.match(html, /A pessoa pode compartilhar manualmente, se quiser, sem postagem automática\./);
  assert.match(html, /sem compra automática pelo site/);
  assert.match(html, /Não há postagem automática nem alcance garantido\./);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ['boca-a-boca', 'como-funciona', 'duvidas', 'contato']) assert.ok(ids.includes(id));
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id), `Destino inexistente: ${id}`);
});
