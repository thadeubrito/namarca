import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const origin=process.env.SITE_TEST_URL||'http://host.docker.internal:3001';
const out='/tmp/ritmo-four';await mkdir(out,{recursive:true});
const browser=await chromium.launch();
try{
for(const width of [1440,768,390,320])for(const reducedMotion of ['no-preference','reduce']){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion,hasTouch:true,isMobile:width<800});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(origin);await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.querySelector('.scene').dataset.entrance==='ready');
 const scene=page.locator('.scene');await scene.focus();
 const wait=async n=>{await page.waitForFunction(n=>{const e=document.querySelector('.scene');return e.dataset.active===String(n)&&e.dataset.settled==='true';},n);await page.waitForTimeout(320);assert.equal(await page.locator('.photo').getAttribute('data-shape'),String(n));assert.equal(await page.locator(`.sticker[data-set="${n}"]`).count(),n===1?3:2);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);};
 for(const n of [1,2,3]){await page.keyboard.press('ArrowRight');await wait(n);}
 await scene.screenshot({path:`${out}/${width}-${reducedMotion}-fourth.png`});
 if(width===1440||width===390){await page.locator('.photo').screenshot({path:`${out}/${width}-${reducedMotion}-photo.png`});}
 await page.keyboard.press('ArrowRight');await wait(0);await page.keyboard.press('ArrowLeft');await wait(3);
 // Rapid reversal across 1 -> 3 never leaves stale photo mask or stickers.
 await page.keyboard.press('ArrowLeft');await wait(2);await page.keyboard.press('ArrowLeft');await wait(1);await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await wait(3);
 const b=await scene.boundingBox();await page.mouse.move(b.x+b.width*.7,b.y+b.height*.5);await page.mouse.down();await page.mouse.move(b.x+b.width*.2,b.y+b.height*.5,{steps:10});await page.mouse.up();await page.waitForFunction(()=>document.querySelector('.scene').dataset.settled==='true');
 assert.deepEqual(errors,[]);await page.close();
}
const page=await browser.newPage({viewport:{width:390,height:1000}});await page.goto(origin);await page.waitForFunction(()=>document.querySelector('.scene').dataset.entrance==='ready');await page.mouse.move(0,0);
for(const n of [1,2,3,0]){await page.waitForFunction(n=>{const e=document.querySelector('.scene');return e.dataset.active===String(n)&&e.dataset.settled==='true';},n,{timeout:9000});}
const a=await page.request.get(origin+'/'),b=await page.request.get(origin+'/estudos/lima/');assert.equal(a.status(),200);assert.equal(b.status(),200);assert.equal(await a.text(),await b.text());
await page.goto(origin+'/estudos/perspectiva/');await page.waitForFunction(()=>document.querySelector('.scene').dataset.entrance==='ready');await page.locator('.scene').focus();for(const n of [1,2,0]){await page.keyboard.press('ArrowRight');await page.waitForFunction(n=>document.querySelector('.scene').dataset.active===String(n)&&document.querySelector('.scene').dataset.settled==='true',n);}await page.close();
console.log('PASS four-slot keyboard/wrap/rapid reversal/drag/autoplay + three-slot study + root parity; '+out);
}finally{await browser.close();}
