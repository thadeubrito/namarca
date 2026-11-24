import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const origin=process.env.SITE_TEST_URL || 'http://host.docker.internal:3001';
const route=process.env.SITE_TEST_PATH || '/estudos/lima/';
const out=process.env.SITE_TEST_OUTPUT || '/tmp/site-lima';
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
const errors=[];
try {
 for(const width of [1440,1024,768,390,320]) for(const reducedMotion of ['no-preference','reduce']) {
  const context=await browser.newContext({viewport:{width,height:width===1440?1200:width===768?1024:width===320?568:844},hasTouch:true,isMobile:width<800,reducedMotion});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('request',r=>{if(!r.url().startsWith(origin))errors.push('External request: '+r.url());});
  const response=await page.goto(origin+route);
  assert.equal(response.status(),200);
  assert.match(response.headers()['content-security-policy'],/script-src 'self';/);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>document.querySelector('.scene').dataset.entrance==='ready');
  assert.ok(await page.evaluate(()=>document.fonts.check('700 66px Poppins')));
  assert.equal(await page.locator('button,.controls,.counter,[data-step]').count(),0);
  const g=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(); const c=getComputedStyle(document.querySelector('[data-slot="0"]')); return {overflow:document.documentElement.scrollWidth>innerWidth,title:r('h1').bottom,scene:r('.scene').top,bottom:r('.scene').bottom,desc:r('.description').top,ratio:parseFloat(c.width)/parseFloat(c.height),weight:getComputedStyle(document.querySelector('h1')).fontWeight};});
  assert.equal(g.overflow,false);assert.ok(g.title<=g.scene);assert.ok(g.bottom<=g.desc);assert.equal(g.weight,'700');assert.ok(Math.abs(g.ratio-9/16)<.0001);
  assert.equal(await page.locator('a').evaluateAll(links=>links.some(a=>/[←-⇿➔➜➝➞➟➠➡]/u.test(a.textContent))),false);
  for(const control of await page.locator('.cta,.header-cta,.mobile-nav summary,.skip,.text-link,.mobile-nav a,.header-items a,.faq summary,footer>a:last-child').all()) {
   assert.equal(await control.evaluate(e=>getComputedStyle(e).borderRadius),'999px');
  }
  assert.deepEqual(await page.locator('.contact .note').evaluate(e=>({tag:e.tagName,background:getComputedStyle(e).backgroundColor,padding:getComputedStyle(e).padding,interactive:e.matches('a,button,summary,[role="button"],[tabindex]')})),{tag:'P',background:'rgba(0, 0, 0, 0)',padding:'0px',interactive:false});
  await page.locator('.hero .primary').focus();
  assert.ok(await page.locator('.hero .primary').evaluate(e=>getComputedStyle(e).outlineStyle!=='none'));
  await page.locator('.hero .primary').blur();
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`${out}/${width}-${reducedMotion}-hero.png`});
  const reveals=page.locator('[data-reveal]');
  assert.equal(await reveals.count(),9); // A rede não participa do reveal genérico.
  assert.deepEqual(await page.locator('main>section').evaluateAll(nodes=>nodes.map(e=>e.getAttribute('aria-labelledby'))),['hero-title','mouth-title','workings-title','faq-title','contact-title']);
  assert.equal(await page.locator('.application,#aplicacoes,a[href="#aplicacoes"]').count(),0);
  assert.deepEqual(await page.locator('a[href^="#"]').evaluateAll(links=>links.filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash)),[]);
  if(reducedMotion==='no-preference') {
   assert.ok(await page.locator('[data-reveal]:not([data-revealed])').count()>0);
   await page.locator('.workings-grid').scrollIntoViewIfNeeded();
   for(const [i,delay] of [40,220,1000].entries()){await page.waitForTimeout(delay);await page.screenshot({path:`${out}/${width}-${reducedMotion}-entrance-${i}.png`});}
   await page.waitForFunction(()=>document.querySelector('.workings-grid [data-reveal]').dataset.revealed==='true');
  }
  for(let y=0;y<await page.evaluate(()=>document.documentElement.scrollHeight);y+=500){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(reducedMotion==='reduce'?10:100);}
  await page.waitForTimeout(2400);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(reducedMotion==='no-preference')assert.deepEqual(await page.locator('[data-reveal]:not([data-revealed="true"])').evaluateAll(nodes=>nodes.map(e=>({tag:e.tagName,reveal:e.dataset.reveal,text:e.textContent.slice(0,40)}))),[],`${width}: all entrances complete`);
  else assert.equal(await reveals.first().evaluate(e=>getComputedStyle(e).opacity),'1');
  await page.screenshot({path:`${out}/${width}-${reducedMotion}-full.png`,fullPage:true});
  await page.locator('.mouth').scrollIntoViewIfNeeded();
  await page.waitForTimeout(reducedMotion==='reduce'?0:2200);
  assert.equal(await page.locator('.network-card').count(),7);
  assert.equal(await page.locator('.sharing-lines path').count(),6);
  assert.equal(await page.locator('.mouth a,.mouth button').count(),0);
  assert.equal(await page.locator('.mouth img').count(),7);
  const art=await page.locator('.mouth-art img').evaluateAll(imgs=>imgs.map(e=>{const b=e.getBoundingClientRect();return {loaded:e.complete&&e.naturalWidth>=280&&e.naturalHeight>0,ratio:b.width/b.height,intrinsic:e.naturalWidth/e.naturalHeight,left:b.left,right:b.right,width:b.width};}));
  for(const [i,image] of art.entries()){assert.ok(image.loaded);assert.ok(Math.abs(image.ratio-image.intrinsic)<.001);assert.ok(image.left>=0&&image.right<=width);assert.ok(image.width>=(width<=900?(i===0?112:i<3?95:62):width===1024?120:140));}
  console.log(`${route} ${width} ${reducedMotion}: seven independent portraits`);
  assert.equal(await page.locator('.mouth [data-reveal]').evaluateAll(nodes=>nodes.every(e=>getComputedStyle(e).opacity==='1')),true);
  await page.locator('.mouth').screenshot({path:`${out}/${width}-${reducedMotion}-mouth.png`});
  for(const id of ['como-funciona','duvidas','contato']){await page.locator('#'+id).screenshot({path:`${out}/${width}-${reducedMotion}-${id}.png`});}
  await page.locator('.scene').scrollIntoViewIfNeeded();
  const start=await page.locator('.scene').getAttribute('data-active');
  if(reducedMotion==='no-preference')await page.waitForFunction(s=>document.querySelector('.scene').dataset.active!==s,start,{timeout:14000});
  else {await page.waitForTimeout(5500);assert.equal(await page.locator('.scene').getAttribute('data-active'),start);}
  await page.locator('.scene').focus();
  assert.ok(await page.locator('.scene').evaluate(e=>getComputedStyle(e).outlineStyle!=='none'));
  await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('.scene').dataset.settled==='true');
  const before=await page.locator('.scene').getAttribute('data-active');
  const shape=await page.locator('.photo').getAttribute('data-shape');
  const box=await page.locator('.scene').boundingBox();
  await page.mouse.move(box.x+box.width*.65,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.3,box.y+box.height*.5,{steps:12});await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('.scene').dataset.settled==='true');
  assert.notEqual(await page.locator('.scene').getAttribute('data-active'),before);
  await page.waitForTimeout(800);
  assert.notEqual(await page.locator('.photo').getAttribute('data-shape'),shape);
  assert.ok(await page.locator('.sticker').count()>0);
  if(width<800){await page.locator('.mobile-nav summary').click();await page.locator('.mobile-nav a[href="#como-funciona"]').click();assert.equal(new URL(page.url()).hash,'#como-funciona');assert.equal(await page.locator('.mobile-nav').getAttribute('open'),null);}
  await page.locator('.hero .primary').click();assert.equal(new URL(page.url()).hash,'#contato');
  assert.equal(await page.locator('a[href*="wa.me"],a[href^="tel:"]').count(),0);
  assert.equal(await page.locator('.faq details').count(),5);
  for(const detail of await page.locator('.faq details').all()){await detail.locator('summary').click();assert.ok(await detail.getAttribute('open')!==null);await detail.locator('summary').click();}
  assert.equal(await page.locator('form,input').count(),0);
  await context.close();
 }
 const page=await browser.newPage();
 for(const path of ['/estudos/perspectiva/']){assert.equal((await page.goto(origin+path)).status(),200);assert.equal(await page.locator('.frame.variant-0').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(133, 133, 133)');}
 assert.equal((await page.goto(origin+'/estudos/galeria/')).status(),200);
 assert.equal(await page.locator('.frame.variant-0').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(36, 87, 230)');
 await page.screenshot({path:out+'/previous-gallery.png'});
 for(const path of ['/estudos/lima/lima.css','/estudos/lima/lima.js','/estudos/galeria/manrope-latin.woff2','/estudos/galeria/OFL.txt'])assert.equal((await page.request.get(origin+path)).status(),200);
 for(const path of ['/estudos/lima/index.html','/estudos/lima/secret.txt','/estudos/lima/azul.js'])assert.equal((await page.request.get(origin+path)).status(),404);
 const lum=hex=>{const a=hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;};
 for(const [fg,bg] of [['151606','E5F33C'],['42451C','E5F33C'],['E5F33C','42451C'],['42451C','FFFFFF'],['42451C','F7F7F7']]){const a=lum(fg),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=4.5,`${fg}/${bg}: ${ratio}`);console.log(`Contrast #${fg}/#${bg}: ${ratio.toFixed(2)}:1`);}
 const fallback=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const fallbackPage=await fallback.newPage();await fallbackPage.goto(origin+route);
 assert.equal(await fallbackPage.locator('.participant-path').evaluate(e=>getComputedStyle(e).opacity),'1');
 assert.equal(await fallbackPage.locator('.contact').evaluate(e=>getComputedStyle(e).opacity),'1');
 await fallback.close();
 assert.deepEqual(errors,[]);
 console.log('Lima: HTTP, allow-list, CSP, 1440/768/390/320 normal+reduced, scroll reveals, font, hierarchy, autoplay, swipe, morph, stickers, menu, focus, CTA and preserved defaults OK');
} finally {await browser.close();}
