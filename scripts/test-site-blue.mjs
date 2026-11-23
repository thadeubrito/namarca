import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const origin=process.env.SITE_TEST_URL || 'http://host.docker.internal:3001';
const out=process.env.SITE_TEST_OUTPUT || '/tmp/site-blue';
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
const errors=[];
try {
 for(const width of [1440,390,320]) for(const reducedMotion of ['no-preference','reduce']) {
  const context=await browser.newContext({viewport:{width,height:width===320?568:900},hasTouch:true,isMobile:width<800,reducedMotion});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('request',r=>{if(!r.url().startsWith(origin))errors.push('External request: '+r.url());});
  const response=await page.goto(origin+'/estudos/azul/');
  assert.equal(response.status(),200);
  assert.match(response.headers()['content-security-policy'],/script-src 'self';/);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>document.querySelector('.scene').dataset.entrance==='ready');
  assert.ok(await page.evaluate(()=>document.fonts.check('600 58px Manrope')));
  assert.equal(await page.locator('button,.controls,.counter,[data-step]').count(),0);
  const g=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(); const c=getComputedStyle(document.querySelector('[data-slot="0"]')); return {overflow:document.documentElement.scrollWidth>innerWidth,title:r('h1').bottom,scene:r('.scene').top,bottom:r('.scene').bottom,desc:r('.description').top,ratio:parseFloat(c.width)/parseFloat(c.height),weight:getComputedStyle(document.querySelector('h1')).fontWeight};});
  assert.equal(g.overflow,false);assert.ok(g.title<=g.scene);assert.ok(g.bottom<=g.desc);assert.equal(g.weight,'600');assert.ok(Math.abs(g.ratio-9/16)<.0001);
  await page.screenshot({path:`${out}/${width}-${reducedMotion}-hero.png`});
  await page.screenshot({path:`${out}/${width}-${reducedMotion}-full.png`,fullPage:true});
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
  if(width<800){await page.locator('.mobile-nav summary').click();await page.locator('.mobile-nav a[href="#como-funciona"]').click();assert.equal(new URL(page.url()).hash,'#como-funciona');}
  await page.locator('.primary').click();assert.equal(new URL(page.url()).hash,'#contato-prototipo');
  assert.equal(await page.locator('a[href*="wa.me"],a[href^="tel:"]').count(),0);
  await context.close();
 }
 const page=await browser.newPage();
 for(const path of ['/','/estudos/perspectiva/']){assert.equal((await page.goto(origin+path)).status(),200);assert.equal(await page.locator('.frame.variant-0').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(133, 133, 133)');}
 assert.equal((await page.goto(origin+'/estudos/galeria/')).status(),200);
 assert.equal(await page.locator('.frame.variant-0').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(36, 87, 230)');
 await page.screenshot({path:out+'/previous-gallery.png'});
 for(const path of ['/estudos/azul/azul.css','/estudos/galeria/manrope-latin.woff2','/estudos/galeria/OFL.txt'])assert.equal((await page.request.get(origin+path)).status(),200);
 for(const path of ['/estudos/azul/index.html','/estudos/azul/secret.txt','/estudos/azul/azul.js'])assert.equal((await page.request.get(origin+path)).status(),404);
 const lum=hex=>{const a=hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;};
 for(const [fg,bg] of [['2154EF','FFFFFF'],['FFFFFF','3866F1'],['FFFFFF','1846DD'],['151D30','FFFFFF'],['515E74','EEF4FF'],['495B7C','FFFFFF']]){const a=lum(fg),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=4.5,`${fg}/${bg}: ${ratio}`);console.log(`Contrast #${fg}/#${bg}: ${ratio.toFixed(2)}:1`);}
 assert.deepEqual(errors,[]);
 console.log('Azul: HTTP, allow-list, CSP, 1440/390/320 normal+reduced, font, hierarchy, autoplay, swipe, morph, stickers, menu, focus, CTA and preserved defaults OK');
} finally {await browser.close();}
