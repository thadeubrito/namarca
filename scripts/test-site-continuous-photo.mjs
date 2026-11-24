import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
const origin=process.env.SITE_TEST_URL||'http://host.docker.internal:3001';
const out='/tmp/continuous-photo';await mkdir(out,{recursive:true});
const browser=await chromium.launch();const report=[];
try {
for(const width of [1440,768,390,320])for(const reducedMotion of ['no-preference','reduce']){
 const page=await browser.newPage({viewport:{width,height:1100},reducedMotion});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(origin);await page.waitForFunction(()=>document.querySelector('.scene').dataset.entrance==='ready');const scene=page.locator('.scene');await scene.focus();
 await page.evaluate(()=>{window.samples=[];const frame=()=>{const root=document.querySelector('.scene'),p=root.querySelector('.photo'),im=p.querySelector('img');window.samples.push({p:Number(root.dataset.position),g:['left','top','width','height'].map(k=>parseFloat(p.style[k])),clip:getComputedStyle(im).clipPath});requestAnimationFrame(frame);};frame();});
 const settled=()=>page.waitForFunction(()=>document.querySelector('.scene').dataset.settled==='true');
 for(let n=0;n<5;n++){
  await page.keyboard.press('ArrowRight');await settled();
  assert.equal(await scene.getAttribute('data-active'),String((n+1)%5));
 }
 for(let n=0;n<5;n++){await page.keyboard.press('ArrowLeft');await settled();}
 if(reducedMotion==='no-preference'){
  // Real pointer drag, reverse while held, then release. Morph must track both directions.
  await scene.scrollIntoViewIfNeeded();const box=await scene.boundingBox();const x=box.x+box.width*.55,y=box.y+box.height*.5;
  await page.mouse.move(x,y);await page.mouse.down();
  await page.mouse.move(x-80,y,{steps:12});await page.waitForTimeout(40);
  const first=Number(await scene.getAttribute('data-position'));
  await page.mouse.move(x-35,y,{steps:12});await page.waitForTimeout(40);
  const reverse=Number(await scene.getAttribute('data-position'));assert.ok(reverse<first);
  await scene.screenshot({path:`${out}/${width}-drag-midpoint.png`});
  await page.mouse.up();await settled();
 }
 const samples=await page.evaluate(()=>window.samples);
 // All interpolated points stay on ordered rays around the interior centre:
 // positive radial distance + monotonically ordered angles rules out edge crossing.
 for(const sample of samples){
  const points=[...sample.clip.matchAll(/(-?[\d.]+(?:e[+-]?\d+)?)%\s+(-?[\d.]+(?:e[+-]?\d+)?)%/gi)].map(m=>[Number(m[1]),Number(m[2])]);
  assert.ok(points.length>=60);
  const angles=points.map(([x,y])=>Math.atan2(y-50,x-50));
  for(let i=1;i<angles.length;i++){
   let delta=angles[i]-angles[i-1];if(delta < -Math.PI)delta+=2*Math.PI;
   assert.ok(delta>=-.0001,`contour correspondence/winding changed ${width}/${reducedMotion}: ${i} delta=${delta} points=${JSON.stringify(points.slice(i-1,i+1))}`);
  }
 }
 if(width===390&&reducedMotion==='no-preference'){
  // Actual held-pointer samples, not teleported state: preserve intermediate frames.
  await scene.focus();while(await scene.getAttribute('data-active')!=='1'){await page.keyboard.press('ArrowRight');await settled();}
  await scene.scrollIntoViewIfNeeded();const box=await scene.boundingBox();const gap=await page.locator('.frame').first().evaluate(e=>e.offsetWidth*1.02);
  const x=box.x+box.width*.8,y=box.y+box.height*.5;
  await page.mouse.move(x,y);await page.mouse.down();
  for(const t of [0,.25,.5,.75,1]){
   await page.mouse.move(x-gap*t,y,{steps:8});await page.waitForTimeout(40);
   await scene.screenshot({path:`${out}/390-orbita-adote-${t*100}.png`});
  }
  await page.mouse.up();await settled();
 }
 const expected=await scene.evaluate(root=>Array.from({length:5},(_,i)=>['left','top','width','height'].map(k=>parseFloat(getComputedStyle(root).getPropertyValue(`--perspective-photo-${i}-${k}`)))));
 let middle=0;
 for(const s of samples){
  assert.ok(s.g.every(Number.isFinite));assert.ok(!/NaN|Infinity/.test(s.clip));
  const floor=Math.floor(s.p),fraction=s.p-floor,a=((floor%5)+5)%5,b=(a+1)%5;
  if(reducedMotion==='no-preference'){
   for(let k=0;k<4;k++)assert.ok(Math.abs(s.g[k]-(expected[a][k]+(expected[b][k]-expected[a][k])*fraction))<.0001,'geometry must follow actual card position, not selected index');
   if(fraction>.2&&fraction<.8)middle++;
  }
 }
 if(reducedMotion==='no-preference')assert.ok(middle>5);
 assert.equal(await page.locator('.scene .sticker-layer,.scene .sticker').count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 report.push({width,reducedMotion,frames:samples.length,intermediateFrames:middle});await page.close();
}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));console.log('PASS continuous geometry on every rendered frame, five transitions + inverse wrap + real drag reversal; '+JSON.stringify(report));
}finally{await browser.close();}
