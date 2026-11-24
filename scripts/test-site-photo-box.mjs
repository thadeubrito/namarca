import assert from 'node:assert/strict';
import { chromium, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
// Run in the existing Playwright container. This checks painted-size geometry,
// not only inline CSS percentages; WebKit emulation is not a physical iPhone.
const origin = process.env.SITE_TEST_URL || 'http://host.docker.internal:3001';
const out = process.env.PHOTO_BOX_SHOTS || '/tmp/namarca-photo-box';
await mkdir(out, {recursive:true});
const report=[];
for (const engine of [webkit,chromium]) {
 const browser=await engine.launch();
 try {
  for (const [width,height] of [[375,667],[390,844],[393,852],[430,932],[852,393],[1440,1000]]) {
   for (const reducedMotion of ['reduce','no-preference']) {
    const mobile=width<1000;
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile,reducedMotion});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    if(width===393)await page.route(/\.(woff2|webp|js)(\?|$)/,async route=>{await new Promise(r=>setTimeout(r,300));await route.continue();});
    for(let load=0;load<(width===393?2:1);load++){
     if(load)await page.reload();else await page.goto(origin);
     await page.waitForFunction(()=>document.querySelector('.scene').dataset.entrance==='ready');
     const scene=page.locator('.scene');
     for(let index=0;index<5;index++){
      await page.waitForFunction(i=>document.querySelector('.scene').dataset.active===String(i)&&document.querySelector('.scene').dataset.settled==='true',index);
      const result=await scene.evaluate(root=>{
       const p=root.querySelector('.photo'),im=p.querySelector('img'),canvas=p.parentElement;
       const plane=canvas.getBoundingClientRect(),box=p.getBoundingClientRect(),image=im.getBoundingClientRect();
       const idx=root.dataset.active,css=getComputedStyle(root);
       return {index:idx,position:root.dataset.position,plane:plane.toJSON(),box:box.toJSON(),image:image.toJSON(),expected:['left','top','width','height'].map(k=>parseFloat(css.getPropertyValue(`--perspective-photo-${idx}-${k}`))),clip:getComputedStyle(im).clipPath,photoStyle:p.getAttribute('style'),imageStyle:im.getAttribute('style')};
      });
      // Focus finishes any entrance transform; settled frames have no 3D card rotation.
      const actual=[result.box.x-result.plane.x,result.box.y-result.plane.y,result.box.width,result.box.height];
      const expected=result.expected.map((v,i)=>v*(i%2?result.plane.height:result.plane.width)/100);
      actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<.15,`${engine.name()}/${width}/${index} geometry ${i}: ${v} != ${expected[i]}`));
      for(const k of ['x','y','width','height'])assert.ok(Math.abs(result.box[k]-result.image[k])<.15,`intrinsic image exceeds mask: ${k}`);
      assert.ok(!/NaN|Infinity/.test(result.clip));assert.ok(result.clip.startsWith('polygon('));
      const tag=`${engine.name()}-${width}-${height}-${reducedMotion}-reload${load}-card${index}`;
      await scene.screenshot({path:`${out}/${tag}.png`});report.push({tag,...result});
      // Focus explicitly on each step: Safari can scroll a focused region on resize.
      await scene.focus();await page.keyboard.press('ArrowRight');
     }
     await page.waitForFunction(()=>document.querySelector('.scene').dataset.active==='0'&&document.querySelector('.scene').dataset.settled==='true');
    }
    assert.deepEqual(errors,[]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await context.close();
   }
  }
  // Uninterrupted autoplay: two complete 5-card cycles, retaining every settled
  // painted box to catch a reload-only or late-compositor geometry regression.
  const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:3});
  await page.goto(origin);
  await page.waitForFunction(()=>document.querySelector('.scene').dataset.entrance==='ready');
  await page.evaluate(()=>{window.autoBoxes=[];let last='';const sample=()=>{const r=document.querySelector('.scene');if(r.dataset.settled==='true'&&last!==r.dataset.active){last=r.dataset.active;const p=r.querySelector('.photo'),im=p.querySelector('img');window.autoBoxes.push({index:last,box:p.getBoundingClientRect().toJSON(),image:im.getBoundingClientRect().toJSON()});}requestAnimationFrame(sample);};sample();});
  await page.waitForFunction(()=>window.autoBoxes.length>=11,null,{timeout:60000});
  const auto=await page.evaluate(()=>window.autoBoxes);assert.deepEqual(auto.map(x=>Number(x.index)),[0,1,2,3,4,0,1,2,3,4,0]);
  auto.forEach(x=>assert.ok(Math.abs(x.box.width-x.image.width)<.15&&Math.abs(x.box.height-x.image.height)<.15));
  report.push({engine:engine.name(),autoplay:auto});await page.close();
 }finally{await browser.close();}
}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
console.log(`PASS: five painted portrait boxes, cold loads/reloads, iPhone-sized portrait/landscape, desktop, both motion preferences, two autoplay wraps; ${out}/report.json`);
