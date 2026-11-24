import assert from 'node:assert/strict';
import test from 'node:test';
import { createPublicServer } from '../services/public-site/server.mjs';

test('landing estática é entregue na raiz sem consultar storage ou alterar rotas públicas', async () => {
  let reads = 0;
  const server = createPublicServer({ readObject: async () => { reads++; return null; } });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as { port: number };
  const origin = `http://127.0.0.1:${port}`;
  try {
    const response = await fetch(origin);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type')!, /text\/html/);
    assert.match(response.headers.get('content-security-policy')!, /form-action 'none'/);
    const html = await response.text();
    assert.match(html, /<html lang="pt-BR">/);
    assert.match(html, /<title>Namarca — boca a boca digital para sua campanha<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]*Campanhas de marketing com participação e boca a boca digital[^"]*"/);
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
    const preview = await fetch(`${origin}/estudos/lima/`);
    assert.equal(preview.status, 200);
    assert.equal(html, await preview.text(), 'Raiz e prévia compartilham exatamente o mesmo HTML');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('location'), null);
    assert.match(html, /<p class="eyebrow">Boca a boca digital<\/p>\s*<h1 id="hero-title">Sua campanha\. As pessoas ajudam a divulgar\.<\/h1>/);
    assert.match(html, /Com a própria foto, molduras e figurinhas, cada pessoa faz parte da sua campanha e leva essa participação às redes sociais\./);
    assert.match(html, /Vamos conversar/);
    assert.equal([...html.matchAll(/class="brand"[^>]*>namarca<\/a>/g)].length, 2);
    for (const id of ['boca-a-boca', 'como-funciona', 'duvidas', 'contato', 'conteudo']) assert.ok(html.includes(`id="${id}"`));
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
    assert.equal([...html.matchAll(/<details>/g)].length, 5, 'Cinco perguntas frequentes nativas');
    assert.match(html, /<details class="mobile-nav"><summary>Menu<\/summary>/);
    assert.match(html, /Canal WhatsApp em configuração\./);
assert.doesNotMatch(html, /protótipo|teste local|Outros estudos|fontes no NOTICE/i);
assert.doesNotMatch(html, /<a\b[^>]*href="\/estudos\/"/);
    assert.doesNotMatch(html, /href="tel:|api\.whatsapp|wa\.me|data-autoplay/);
    assert.match(html, /Campanhas fictícias Clube Sol, Órbita, Adote um Amigo, Ritmo de Rua e A Grande Final/);
    assert.equal([...html.matchAll(/data-perspective/g)].length, 1);
    assert.doesNotMatch(html, /<button\b|role="button"|data-autoplay-label|pause-icon|\.autoplay/);
    assert.match(html, /src="\/estudos\/perspectiva\/perspectiva.js" defer/);
    assert.doesNotMatch(html, /class="controls"|class="counter"|data-step|01 \/ 03/);
    for (const asset of ['/estudos/lima/lima.css', '/estudos/lima/materials.css', '/estudos/lima/lima.js', '/estudos/perspectiva/perspectiva.js', '/estudos/lima/materials/michael-dam-portrait.webp']) {
      assert.equal((await fetch(origin + asset)).status, 200, asset);
    }
    assert.match(html, /data-perspective data-compositions="5" data-photo-motion="continuous" data-stickers="false" tabindex="0" role="group"/);
    assert.doesNotMatch(response.headers.get('content-security-policy')!, /sha256-/);
    assert.doesNotMatch(response.headers.get('content-security-policy')!, /script-src[^;]*unsafe-inline/);
    assert.doesNotMatch(html, /<form\b|<input\b|<iframe\b|<canvas\b|wa\.me|shimmer|fetch\(|setInterval/i);
    assert.match(html, /Michael Dam \/ Unsplash/);
    const visibleContent = html.split(/<body\b[^>]*>/)[1].split('</body>')[0]
      .replace(/<script>[\s\S]*?<\/script>/g, '')
      .replace(/<(p|span) class="sr-only"[^>]*>[\s\S]*?<\/(p|span)>/g, '')
      .replace(/<h[12] class="sr-only"[^>]*>[\s\S]*?<\/h[12]>/g, '')
      .replace(/<[^>]*>/g, '').trim();
    assert.match(visibleContent, /Sem cadastro\. Sem instalar aplicativo\./);
    assert.match(visibleContent, /sem postagem automática/);
    assert.match(visibleContent, /sem compra automática pelo site/);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, 'IDs devem ser únicos');
    for (const link of html.matchAll(/href="#([^"]+)"/g)) {
      assert.ok(ids.includes(link[1]), `Destino inexistente: ${link[1]}`);
    }
    assert.equal(reads, 0, 'Institucional não depende do storage');
    const runtime = await fetch(`${origin}/campaign-runtime/index.html`);
    assert.equal(runtime.status, 200);
    assert.doesNotMatch(runtime.headers.get('content-security-policy')!, /sha256-/);
    const campaign = await fetch(`${origin}/wireframe-synthetic`);
    assert.equal(campaign.status, 200);
    const missing = await fetch(`${origin}/campaigns/wireframe-synthetic/campaign.json`);
    assert.equal(missing.status, 404);
    assert.equal(reads, 1);
    assert.equal((await fetch(`${origin}/private`)).status, 404);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
