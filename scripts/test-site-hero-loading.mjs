import assert from 'node:assert/strict';
import {chromium, webkit} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';

const origin = process.env.SITE_TEST_URL || 'http://host.docker.internal:3001';
const out = process.env.HERO_LOAD_SHOTS || '/tmp/site-hero-loading';
await mkdir(out, {recursive:true});
const results=[];
// Record actual paint frames, including before deferred enhancement. Do not
// mutate carousel position or wait for fonts/entrance before checking geometry.
for (const [name, engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await engine.launch();
 try {
  for(const width of [320,390,768,1440]) for(const reducedMotion of ['no-preference','reduce']) {
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion});
   const page=await context.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   // Routing disables the HTTP cache, including on real reload. Deferred JS
   // arrives after first paint; styles/fonts/portrait also arrive independently.
   await page.route('**/*',async route=>{
    const url=route.request().url();
    const delay=url.endsWith('/perspectiva.js')?700:url.endsWith('/materials.css')?120:url.endsWith('.woff2')?250:url.endsWith('/michael-dam-portrait.webp')?450:0;
    if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
    await route.continue();
   });
   await page.addInitScript(()=>{
    window.heroLoadFrames=[];
    const start=performance.now();
    function sample(){
     const photo=document.querySelector('.hero .photo');
     if(photo){
      const canvas=photo.parentElement, img=photo.querySelector('img'), cs=getComputedStyle(photo),is=getComputedStyle(img);
      const geometry=['left','top','width','height'].map((key,i)=>parseFloat(cs[key])/(i%2?canvas.clientHeight:canvas.clientWidth)*100);
      window.heroLoadFrames.push({t:performance.now()-start,geometry,photo:[photo.offsetWidth,photo.offsetHeight],img:[img.offsetWidth,img.offsetHeight],clip:is.clipPath,fit:is.objectFit,shape:photo.dataset.shape,position:document.querySelector('.scene').dataset.position,decoded:img.complete&&img.naturalWidth>0});
     }
     if(performance.now()-start<1800)requestAnimationFrame(sample);
    }requestAnimationFrame(sample);
   });
   for(const load of ['cold','reload']){
    if(load==='cold')await page.goto(origin+'/');else await page.reload();
    await page.waitForTimeout(1850);
    const frames=await page.evaluate(()=>window.heroLoadFrames);
    assert.ok(frames.length>1,`${name}/${width}/${reducedMotion}/${load}: ${frames.length} frames`);
    for(const f of frames){
     assert.equal(f.shape,'0');
     for(const [i,expected] of [28.77315,36.44509,57.26852,32.31793].entries())assert.ok(Math.abs(f.geometry[i]-expected)<.12,`${name}/${width}/${load} at ${f.t}: ${f.geometry}`);
     for(let i=0;i<2;i++)assert.ok(Math.abs(f.img[i]-f.photo[i])<1,'portrait intrinsic overflow');
     assert.match(f.clip,/^polygon\(/);assert.doesNotMatch(f.clip,/NaN|Infinity/);assert.ok(f.clip.split(',').length>=60);assert.equal(f.fit,'cover');
    }
    assert.ok(frames.some(f=>f.position===undefined),'must observe static pre-enhancement paint');
    assert.ok(frames.some(f=>f.decoded),'portrait must decode');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    if(width===390||width===1440)await page.screenshot({path:`${out}/${name}-${width}-${reducedMotion}-${load}.png`});
    results.push({name,width,reducedMotion,load,frames});
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  // CSS-only/no-JS first slot is useful content, not a zero-size placeholder.
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:1000}});
  const page=await context.newPage();await page.goto(origin+'/');
  assert.ok((await page.locator('.photo').boundingBox()).width>100);
  assert.equal(await page.locator('.track .frame.variant-0').count(),1);
  await page.screenshot({path:`${out}/${name}-no-js.png`});await context.close();
 }finally{await browser.close();}
}
await writeFile(`${out}/timeline.json`,JSON.stringify(results,null,2));
console.log('Hero first paint: Chromium/WebKit, 320/390/768/1440, cold/reload, delayed CSS/JS/fonts/photo, normal/reduced and no-JS OK. '+out);
