import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Header } from '../src/components/site/Header';
import { Hero } from '../src/components/site/Hero';
import { Sharing } from '../src/components/site/Sharing';
import { HowItWorks } from '../src/components/site/HowItWorks';
import { FAQ } from '../src/components/site/FAQ';
import { Contact } from '../src/components/site/Contact';
import { Footer } from '../src/components/site/Footer';

const source = (file: string) => readFile(new URL(`../src/components/site/${file}`, import.meta.url), 'utf8');
const asset = (file: string) => readFile(new URL(`../public/landing/${file}`, import.meta.url));

test('landing nativa preserva composição, contatos, rede e materiais locais', async () => {
  const html = [Header, Hero, Sharing, HowItWorks, FAQ, Contact, Footer]
    .map(Component => renderToStaticMarkup(createElement(Component))).join('');
  assert.equal((html.match(/data-perspective/g) || []).length, 1);
  assert.match(html, /class="photo" data-shape="0"/);
  assert.match(html, /class="track" aria-hidden="true"><div class="frame variant-0"><img class="initial-art"/);
  assert.match(html, /data-assets="decoded"/);
  assert.equal((html.match(/<details><summary>/g) || []).length, 5);
  assert.doesNotMatch(html, /<form|<input|<button|data-step/);
  assert.match(html, /<summary aria-label="Abrir o menu"><span class="menu-icon" aria-hidden="true"><\/span><\/summary>/);
  assert.doesNotMatch(html, /href="\/exemplo-clube-sol"/);
  const whatsapp = [...html.matchAll(/href="([^"]*wa\.me[^"]*)"/g)].map(m => new URL(m[1]));
  assert.equal(whatsapp.length, 4);
  for (const url of whatsapp) {
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'wa.me');
    assert.equal(url.pathname, '/5547992901925');
    assert.equal(url.search, '');
  }
  assert.doesNotMatch(html, /protótipo|teste local|Outros estudos|fontes no NOTICE|href="\/estudos\//i);
  assert.doesNotMatch(html, /Campanhas fictícias Clube Sol|Michael Dam \/ Unsplash|Pessoa ilustrativa, sem vínculo ou endosso ao Namarca/);
  for (const link of html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)) assert.doesNotMatch(link[1], /[←-⇿➔➜➝➞➟➠➡↗]/u);
  assert.match(html, /Uma pessoa participa\. Outras podem vir com ela\./);
  assert.doesNotMatch(html, /class="underline"/);
  assert.equal((html.match(/class="network-card"/g) || []).length, 7);
  assert.equal((html.match(/<path data-from=/g) || []).length, 6);
  assert.doesNotMatch(html, /<img[^>]+mouth-sharing-young|marker-end|<image\b/);
  for (const name of ['01', '02', '03', '04', '05', '06', '07']) {
    const path = `materials/compartilhamento-ia-${name}.webp`;
    assert.ok(html.includes(`/landing/${path}`));
    assert.equal((await asset(path)).toString('ascii', 8, 12), 'WEBP');
  }
  for (const name of ['04', '05', '06', '07']) {
    assert.ok(html.includes(`src="/landing/materials/compartilhamento-ia-${name}.webp" width="280" height="280"`));
    const bytes = await asset(`materials/compartilhamento-ia-${name}.webp`);
    // Sharp emits VP8 (lossy WebP); validate the encoded square, not only its HTML ratio.
    const frame = bytes.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
    assert.ok(frame >= 0);
    assert.equal(bytes.readUInt16LE(frame + 3) & 0x3fff, 560);
    assert.equal(bytes.readUInt16LE(frame + 5) & 0x3fff, 560);
  }
  assert.doesNotMatch(html, /Fotos de banco de imagens; uso ilustrativo, sem vínculo ou endosso|<img[^>]+compartilhamento-(?!ia-)/);
  assert.equal((html.match(/<section\b/g) || []).length, 5);
  assert.deepEqual([...html.matchAll(/<section\b[^>]*aria-labelledby="([^"]+)"/g)].map(m => m[1]),
    ['hero-title', 'mouth-title', 'workings-title', 'faq-title', 'contact-title']);
  assert.doesNotMatch(html, /id="personalizacao"|id="contratacao"|advantages-grid|class="ingredients|class="showcase|applications-title|class="application/);
  assert.ok(html.includes('class="participant-path"') && html.includes('class="delivery"'));
  assert.equal((html.match(/data-reveal=/g) || []).length, 9);
  const motion = await source('lima.js');
  for (const contract of ['IntersectionObserver', 'prefers-reduced-motion', 'focusin']) assert.ok(motion.includes(contract));
  const css = await source('landing.css');
  for (const key of ['left', 'top', 'width', 'height']) assert.ok(css.includes(`${key}:var(--perspective-photo-0-${key})`));
  assert.doesNotMatch(css, /https?:/);
  assert.ok(css.includes('grid-template-columns:minmax(0,.42fr) minmax(0,.58fr)'));
  assert.ok(css.includes('border-radius:var(--portrait-shape)'));
  assert.equal((css.match(/--portrait-shape:/g) || []).length, 7);
  assert.doesNotMatch(css, /animation:.*infinite/);
  const faces = [...css.matchAll(/@font-face\{([^}]+)\}/g)];
  assert.equal(faces.length, 5);
  for (const [, face] of faces) assert.match(face, /font-display:block/);
  for (const weight of [300, 400, 500, 600, 700]) {
    const path = `poppins-${weight}-latin.woff2`;
    assert.equal((await asset(path)).toString('ascii', 0, 4), 'wOF2');
    assert.ok(css.includes(`url('/landing/${path}')`));
  }
  assert.match((await asset('OFL.txt')).toString(), /SIL OPEN FONT LICENSE/);
  assert.ok(css.includes('.mobile-nav summary::-webkit-details-marker{display:none}'));
  assert.ok(css.includes('.menu-icon::before,.landing .menu-icon::after'));
  for (const selector of ['header-cta', 'cta', 'mobile-nav summary']) {
    assert.ok(css.split(`.landing .${selector}{`)[1].split('}')[0].includes('border-radius:999px'));
  }
  // Every image referenced by native markup or CSS must exist in the shipped asset tree.
  const paths = new Set([...`${html}\n${css}`.matchAll(/\/landing\/([^'"\s)<>,]+)/g)].map(m => m[1]));
  for (const path of paths) assert.ok((await asset(path)).length > 0, path);
});
