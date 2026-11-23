import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin = process.env.SITE_TEST_URL || 'http://host.docker.internal:3001';
const out = process.env.SITE_TEST_OUTPUT || '/tmp/site-gallery';
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
const errors=[];
try {
for(const width of [1440,390,320]) for(const reducedMotion of ['no-preference','reduce']) {
 const context=await browser.newContext({viewport:{width,height:width===320?568:900},hasTouch:true,isMobile:width<800,reducedMotion});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const external=[];page.on('request',r=>{if(!r.url().startsWith(origin))external.push(r.url());});
 const response=await page.goto(`${origin}/estudos/galeria/`);assert.equal(response.status(),200);
 assert.match(response.headers()['content-security-policy'],/font-src 'self'/);
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>document.querySelector('.scene').dataset.entrance==='ready');
 assert.ok(await page.evaluate(()=>document.fonts.check('800 52px Manrope')));
 assert.equal(await page.locator('button,.controls,.counter,[data-step]').count(),0);
 const geometry=await page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect(); const c=getComputedStyle(document.querySelector('[data-slot="0"]'));return {overflow:document.documentElement.scrollWidth>innerWidth,title:rect('h1').bottom,scene:rect('.scene').top,desc:rect('.description').top,bottom:rect('.scene').bottom,ratio:parseFloat(c.width)/parseFloat(c.height),color:c.backgroundColor};});
 assert.equal(geometry.overflow,false);assert.ok(geometry.title<=geometry.scene);assert.ok(geometry.bottom<=geometry.desc);assert.ok(Math.abs(geometry.ratio-9/16)<.0001);assert.equal(geometry.color,'rgb(36, 87, 230)');
 await page.screenshot({path:`${out}/${width}-${reducedMotion}.png`,fullPage:true});
 if(reducedMotion==='no-preference')await page.waitForFunction(()=>document.querySelector('.scene').dataset.active!=='0',null,{timeout:14000});
 else {await page.waitForTimeout(5500);assert.equal(await page.locator('.scene').getAttribute('data-active'),'0');}
 await page.locator('.scene').focus();await page.keyboard.press('ArrowRight');
 await page.waitForFunction(()=>document.querySelector('.scene').dataset.settled==='true');
 const before=await page.locator('.scene').getAttribute('data-active');
 const box=await page.locator('.scene').boundingBox();
 await page.mouse.move(box.x+box.width*.65,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.3,box.y+box.height*.5,{steps:12});await page.mouse.up();
 await page.waitForFunction(()=>document.querySelector('.scene').dataset.settled==='true');assert.notEqual(await page.locator('.scene').getAttribute('data-active'),before);
 const active=await page.locator('.scene').getAttribute('data-active');
 const theme=await page.locator(`.frame.variant-${active}`).first().evaluate(e=>getComputedStyle(e).backgroundColor);
 assert.equal(theme,['rgb(36, 87, 230)','rgb(245, 107, 80)','rgb(23, 106, 80)'][+active]);
 if(width<800){await page.locator('.mobile-nav summary').click();await page.locator('.mobile-nav a[href="#como-funciona"]').click();assert.equal(new URL(page.url()).hash,'#como-funciona');}
 await page.locator('.primary').click();assert.equal(new URL(page.url()).hash,'#contato-prototipo');
 assert.equal(external.length,0);
 await context.close();
}
const page=await browser.newPage();
for(const path of ['/','/estudos/perspectiva/']){assert.equal((await page.goto(origin+path)).status(),200);assert.equal(await page.locator('.frame.variant-0').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(133, 133, 133)');}
for(const path of ['/estudos/galeria/OFL.txt','/estudos/galeria/NOTICE.txt','/estudos/galeria/manrope-latin.woff2'])assert.equal((await page.request.get(origin+path)).status(),200);
for(const path of ['/estudos/galeria/index.html','/estudos/galeria/secret.txt'])assert.equal((await page.request.get(origin+path)).status(),404);
assert.deepEqual(errors,[]);console.log('Galeria: 6 viewports/motion, fonte local, tema, teclado/swipe, nav, CSP, defaults e allow-list OK');
} finally {await browser.close();}
