import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createPublicServer } from '../services/public-site/server.mjs';

test('landing lima integral na raiz e na prévia, fontes locais e allow-list fechada', async () => {
  const server = createPublicServer({ readObject: async () => { throw new Error('storage inesperado'); } });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(base + '/estudos/lima/');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-security-policy')!, /script-src 'self';/);
    const html = await response.text();
    for (const id of ['boca-a-boca','como-funciona','duvidas','contato']) assert.ok(html.includes(`id="${id}"`));
    assert.equal((html.match(/data-perspective/g) || []).length, 1);
    assert.equal((html.match(/<details><summary>/g) || []).length, 5);
    assert.doesNotMatch(html, /<form|<input|wa\.me|<button|data-step/);
    for (const link of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)) assert.doesNotMatch(link[1], /[←-⇿➔➜➝➞➟➠➡]/u);
    assert.doesNotMatch(html, /↗/);
    assert.match(html, /Uma pessoa participa\. <span class="underline">Outras podem vir com ela\./);
    assert.doesNotMatch(html, /privacy-|A foto é pessoal/);
    assert.equal((html.match(/class="network-card"/g) || []).length, 7);
    assert.equal((html.match(/<path data-from=/g) || []).length, 6);
    assert.doesNotMatch(html, /<img[^>]+mouth-sharing-young/);
    for (const name of ['artista','tecnologia','financeiro','esporte','musica','estudante','cafe']) {
      const crop = await fetch(base + `/estudos/lima/materials/compartilhamento-${name}.webp`);
      assert.equal(crop.status, 200);
      assert.equal(crop.headers.get('content-type'), 'image/webp');
    }
    assert.equal((await fetch(base + '/estudos/lima/materials/compartilhamento-outro.webp')).status, 404);
    assert.match(html, /Imagem ilustrativa gerada por IA; pessoas fictícias\./);
    const art = await fetch(base + '/estudos/lima/materials/mouth-sharing-young.webp');
    assert.equal(art.headers.get('content-type'), 'image/webp');
    assert.equal(Buffer.from(await art.arrayBuffer()).toString('ascii', 8, 12), 'WEBP');
    assert.equal((await fetch(base + '/estudos/lima/materials/original.png')).status, 404);
    assert.doesNotMatch(html, /marker-end|<image\b/);
    assert.match(html, /A foto e a composição não são enviadas aos nossos servidores\. A imagem é gerada no navegador e salva no dispositivo\./);
    assert.equal((html.match(/<section\b/g) || []).length, 5);
    const sections = [...html.matchAll(/<section\b[^>]*aria-labelledby="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(sections, ['hero-title','mouth-title','workings-title','faq-title','contact-title']);
    assert.doesNotMatch(html, /id="personalizacao"|id="contratacao"|advantages-grid|class="ingredients|class="showcase/);
    assert.doesNotMatch(html, /aplicacoes|applications-title|class="application|Como isso se encaixa|Adote um Amigo|Comunidade do bairro/);
    for (const [,id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${id}"`), `âncora existente: ${id}`);
    assert.ok(html.includes('Sua campanha. As pessoas ajudam a divulgar.') && html.includes('Com a própria foto, molduras e figurinhas, cada pessoa faz parte da sua campanha e leva essa participação às redes sociais.'));
    const root = await (await fetch(base + '/')).text();
    assert.equal(root, html);
    for (const weight of [300,400,500,600,700]) {
      const font = await fetch(base + `/estudos/lima/poppins-${weight}-latin.woff2`);
      assert.equal(font.headers.get('content-type'), 'font/woff2');
      assert.equal(Buffer.from(await font.arrayBuffer()).toString('ascii', 0, 4), 'wOF2');
    }
    assert.match(await (await fetch(base + '/estudos/lima/OFL.txt')).text(), /SIL OPEN FONT LICENSE/);
    assert.equal((await fetch(base + '/estudos/lima/lima.js')).status, 200);
    assert.ok(html.includes('class="participant-path"') && html.includes('class="delivery"'));
    assert.equal((html.match(/data-reveal=/g) || []).length, 9); // A rede usa um motor independente, sem reveal pai.
    const motion = await readFile('apps/site/estudos/lima/lima.js', 'utf8');
    assert.match(motion, /IntersectionObserver/);
    assert.match(motion, /prefers-reduced-motion/);
    assert.match(motion, /focusin/);
    for (const file of ['index.html','secret.txt','hero.tmp','lima.tmp.js']) assert.equal((await fetch(base + '/estudos/lima/' + file)).status,404);
    const css = await readFile('apps/site/estudos/lima/lima.css', 'utf8');
    assert.doesNotMatch(css, /https?:/);
    assert.match(css, /grid-template-columns:minmax\(0,\.42fr\) minmax\(0,\.58fr\)/);
    assert.match(css, /border-radius:var\(--portrait-shape\)/);
    assert.equal((css.match(/--portrait-shape:/g) || []).length, 7);
    assert.doesNotMatch(css, /animation:.*infinite/);
    const faces = [...css.matchAll(/@font-face\{([^}]+)\}/g)];
    assert.equal(faces.length, 5);
    for (const [,face] of faces) assert.match(face, /font-display:block/);
    const preloads = [...html.matchAll(/<link rel="preload"[^>]+>/g)].map(m => m[0]);
    assert.equal(preloads.length, 4);
    for (const weight of [700,300,500,600]) {
      const url = `/estudos/lima/poppins-${weight}-latin.woff2`;
      const preload = preloads.find(link => link.includes(url));
      assert.ok(preload);
      assert.match(preload, /as="font" type="font\/woff2" crossorigin/);
      assert.ok(css.includes(`url('${url}')`));
      assert.ok(html.indexOf(preload) < html.indexOf('<link rel="stylesheet"'));
      if (weight === 600) assert.match(preload, /media="\(min-width: 901px\)"/);
    }
    assert.match(css, /:is\(\.skip,\.mobile-nav a,\.header-items a,\.faq summary,footer>a:last-child\)\{border-radius:999px\}/);
    assert.doesNotMatch(css.split('.lima .contact .note{')[1].split('}')[0], /background|padding|border-radius/);
    for (const selector of ['header-cta', 'cta', 'mobile-nav summary']) assert.ok(css.includes(`.lima .${selector}{`) && css.split(`.lima .${selector}{`)[1].split('}')[0].includes('border-radius:999px'));
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
