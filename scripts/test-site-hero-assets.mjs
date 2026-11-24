import assert from 'node:assert/strict';
import {chromium, webkit} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.SITE_TEST_URL||'http://host.docker.internal:3001';
const out=process.env.HERO_ASSET_SHOTS||'/tmp/site-hero-assets';
await mkdir(out,{recursive:true});const results=[];
for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await browserType.launch();
 try {
  for(const width of [320,390,1440]) for(const reducedMotion of ['no-preference','reduce']) {
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion});
   const page=await context.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{window.assetFrames=[];function sample(){const r=document.querySelector('[data-perspective]');if(r)window.assetFrames.push({time:performance.now(),state:r.dataset.assetState,entrance:r.dataset.entrance,position:r.dataset.position,photo:!!r.querySelector('img')?.naturalWidth});if(performance.now()<7000)requestAnimationFrame(sample)}requestAnimationFrame(sample)});
   await page.route('**/*',async route=>{
    const url=route.request().url();
    const ms=url.endsWith('michael-dam-portrait.webp')?1100:url.endsWith('final-story-display.webp')?1500:0;
    if(ms)await new Promise(r=>setTimeout(r,ms));
    await route.continue();
   });
   for(let reload=0;reload<2;reload++) {
    if(reload)await page.reload({waitUntil:'domcontentloaded'});else await page.goto(origin,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('[data-perspective]')?.dataset.assetState==='ready');
    await page.waitForFunction(()=>document.querySelector('[data-perspective]')?.dataset.entrance==='ready');
    const data=await page.evaluate(()=>{
     const r=document.querySelector('[data-perspective]');
     return {decoded:+r.dataset.assetsDecoded,start:+r.dataset.entranceStarted,frames:window.assetFrames,requests:performance.getEntriesByType('resource').filter(e=>/story-display|michael-dam-portrait/.test(e.name)).map(e=>({name:e.name.split('/').at(-1),duration:e.duration})),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    if(reducedMotion==='no-preference')assert(data.start>=data.decoded,'Entrance must start AFTER all critical decoding');
    assert(!data.frames.some(f=>f.state==='loading'&&f.entrance==='running'),'Opening consumed while loading');
    assert(!data.overflow);assert.equal(data.requests.length,6,'Five arts + portrait: no duplicate requests');
    assert.deepEqual(errors,[]);
    await page.screenshot({path:`${out}/${engine}-${width}-${reducedMotion}-${reload}.png`});
    results.push({engine,width,reducedMotion,reload,...data,frames:undefined});
   }
   if(width===390) {
    const root=page.locator('[data-perspective]');await root.focus();
    for(const index of [1,2,3,4,0]) {
     await page.keyboard.press('ArrowRight');
     await page.waitForFunction(index=>{const r=document.querySelector('[data-perspective]');return +r.dataset.active===index&&r.dataset.settled==='true'},index);
     const geometry=await page.evaluate(index=>{
      const r=document.querySelector('[data-perspective]'),photo=r.querySelector('.photo'),box=photo.getBoundingClientRect(),canvas=photo.parentElement.getBoundingClientRect();
      const [left,top,width,height]=window.namarcaHeroGeometry[index].geometry;
      return {dx:Math.abs(box.x-canvas.x-canvas.width*left/100),dy:Math.abs(box.y-canvas.y-canvas.height*top/100),dw:Math.abs(box.width-canvas.width*width/100),dh:Math.abs(box.height-canvas.height*height/100),images:[...r.querySelectorAll('.frame')].filter(el=>Math.abs(+el.dataset.distance)<1.1).every(el=>el.querySelector('img')?.naturalWidth>0)};
     },index);
     for(const key of ['dx','dy','dw','dh'])assert(geometry[key]<1,key);
     assert(geometry.images);
    }
   }
   await context.close();
  }
  // Error handling: one failed neighbour must release the scene, not hang it.
  const context=await browser.newContext({viewport:{width:390,height:1000}});const page=await context.newPage();
  await page.route('**/final-story-display.webp',r=>r.abort());
  await page.goto(origin);await page.waitForFunction(()=>document.querySelector('[data-perspective]')?.dataset.assetState==='partial');
  await page.waitForFunction(()=>document.querySelector('[data-perspective]')?.dataset.entrance==='ready');
  await page.locator('[data-perspective]').focus();await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>document.querySelector('[data-perspective]')?.dataset.active==='1');
  await context.close();
 } finally {await browser.close()}
}
await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(`PASS ${results.length} cold/reload decode-gated openings, Chromium/WebKit + asset failure`);
