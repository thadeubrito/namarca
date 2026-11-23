import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const out='/tmp/site-lima-materials';await mkdir(out,{recursive:true});
const origin=process.env.SITE_TEST_URL||'http://host.docker.internal:3001';
const browser=await chromium.launch();
try{
for(const width of [1440,390,320])for(const reducedMotion of ['no-preference','reduce']){
 const page=await browser.newPage({viewport:{width,height:width===1440?1100:844},isMobile:width<800,hasTouch:true,reducedMotion});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(origin+'/estudos/lima/');await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.querySelector('.scene').dataset.entrance==='ready');await page.locator('.scene').focus();
 const photo=page.locator('.photo img');assert.ok(await photo.evaluate(e=>e.complete&&e.naturalWidth===1000));
 for(let i=0;i<3;i++){
  await page.waitForFunction(i=>document.querySelector('.scene').dataset.active===String(i)&&document.querySelector('.scene').dataset.settled==='true',i);await page.waitForTimeout(350);
  assert.equal(await page.locator('.photo').getAttribute('data-shape'),String(i));
  if(i===0){
   const geometry=await page.locator('.photo').evaluate(e=>{const p=e.parentElement.getBoundingClientRect(),b=e.getBoundingClientRect();return [(b.x-p.x)/p.width,(b.y-p.y)/p.height,b.width/p.width,b.height/p.height];});
   for(const [j,v] of [.1020293122886133,.322108699736941,.7914317925591883,.4451803833145434].entries())assert.ok(Math.abs(geometry[j]-v)<.001);
   assert.equal(await page.locator('.sticker[data-set="0"][data-phase="ready"]').count(),2);
   assert.equal(await page.locator('.frame.variant-0').first().evaluate(e=>getComputedStyle(e,'::after').content),'none');
  }
  assert.equal(await photo.evaluate(e=>getComputedStyle(e).objectFit),'cover');assert.ok(await page.locator('.sticker[data-phase="ready"]').count()>0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}/${reducedMotion}/${i}`);
  await page.screenshot({path:`${out}/${width}-${reducedMotion}-variant-${i}.png`});await page.keyboard.press('ArrowRight');
 }
 for(const asset of ['torn-tape','coral-seal','angular-cuts','halftone-paper','michael-dam-portrait','cafe-story-approved','cafe-sticker-cup','cafe-sticker-croissant']){const r=await page.request.get(`${origin}/estudos/lima/materials/${asset}.webp`);assert.equal(r.status(),200);assert.match(r.headers()['content-type'],/image\/webp/);}
 assert.equal((await page.request.get(origin+'/estudos/lima/materials/unlisted.webp')).status(),404);assert.deepEqual(errors,[]);await page.close();
}
console.log('Materials: stock decode, three shapes/variants, stickers, overflow, CSP console and exact asset HTTP gates OK; screenshots '+out);
}finally{await browser.close();}
