import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.SITE_TEST_URL||'http://host.docker.internal:3001';
const out=process.env.SITE_TEST_OUTPUT||'/shots/namarca-sharing-motion';
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
try {
 const check=async page=>{
  const result=await page.locator('.sharing-network').evaluate(n=>{
   const r=n.getBoundingClientRect(), cards=[...n.querySelectorAll('.network-card')].map(c=>c.getBoundingClientRect());
   const rows=cards.map(b=>b.top-r.top);
   if(innerWidth<=900){
    if(Math.abs(rows[1]-rows[2])>.1||rows.slice(3).some(y=>Math.abs(y-rows[3])>.1)||!(rows[0]<rows[1]&&rows[1]<rows[3]))throw Error('Expected exactly 1 / 2 / 4 rows');
    cards.forEach(b=>{if(b.left<0||b.right>innerWidth||b.bottom>r.bottom+.1)throw Error('Portrait outside network/viewport');});
    for(let i=3;i<6;i++)if(cards[i].right+9.9>cards[i+1].left)throw Error('Last-row gap below 10px');
   }
   const links=[...n.querySelectorAll('path')];
   if(JSON.stringify(links.map(p=>[+p.dataset.from,+p.dataset.to]))!==JSON.stringify([[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]]))throw Error('Incorrect tree');
   return links.map(p=>{
    const a=p.getPointAtLength(0),b=p.getPointAtLength(p.getTotalLength()),source=cards[+p.dataset.from],target=cards[+p.dataset.to];
    if(innerWidth<=900){
     if(Math.abs(a.x+r.left-source.left-source.width/2)>.1||Math.abs(a.y+r.top-source.bottom)>.1||Math.abs(b.x+r.left-target.left-target.width/2)>.1||Math.abs(b.y+r.top-target.top)>.1||b.y<=a.y)throw Error('Connector must descend bottom → top');
     for(let i=0;i<=100;i++){
      const q=p.getPointAtLength(p.getTotalLength()*i/100);
      if(q.y<a.y-.1||q.y>b.y+.1||q.x<Math.min(a.x,b.x)-.1||q.x>Math.max(a.x,b.x)+.1)throw Error('Outside connector route');
     }
    }
    // All four side midpoints are on the organic outline (corner radii <50%).
    // Distance to the midpoint, not an infinite box edge, catches detached links.
    const edge=(point,box)=>Math.min(...[[box.left,box.top+box.height/2],[box.right,box.top+box.height/2],[box.left+box.width/2,box.top],[box.left+box.width/2,box.bottom]].map(([x,y])=>Math.hypot(point.x+r.left-x,point.y+r.top-y)));
    return [edge(a,source),edge(b,target)];
   });
  });
  result.flat().forEach(v=>assert.ok(v<1,`endpoint mismatch ${v}`));
 };
 for(const width of [1440,1024,768,390,320]) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'no-preference'});
  await page.goto(base+'/');await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1200);
  const initial=await page.locator('.network-card img').evaluateAll(es=>es.map(e=>+getComputedStyle(e).opacity));
  assert.deepEqual(initial,[0,0,0,0,0,0,0]);
  // Scroll only the origin into view, not the tall parent figure.
  await page.locator('[data-person="0"]').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.sharing-network').dataset.motion==='playing');
  await page.waitForTimeout(250);
  await page.screenshot({path:`${out}/${width}-01-origin.png`});
  await page.waitForTimeout(950);
  const middle=await page.locator('.network-card img').evaluateAll(es=>es.map(e=>+getComputedStyle(e).opacity));
  assert.ok(middle[0]===1&&middle[1]>0&&middle[3]===0);
  await page.screenshot({path:`${out}/${width}-02-expanding.png`});
  await page.waitForFunction(()=>document.querySelector('.sharing-network').dataset.motion==='complete');
  assert.deepEqual(await page.locator('.network-card img').evaluateAll(es=>es.map(e=>getComputedStyle(e).opacity)),Array(7).fill('1'));
  await check(page);
  const layout=await page.locator('.mouth').evaluate(section=>{const copy=section.querySelector('.mouth-copy').getBoundingClientRect(),art=section.querySelector('.mouth-art').getBoundingClientRect();return {copy:{right:copy.right,bottom:copy.bottom},art:{left:art.left,top:art.top},shapes:[...section.querySelectorAll('.network-card img')].map(e=>getComputedStyle(e).borderRadius),overflow:document.documentElement.scrollWidth>innerWidth};});
  assert.equal(new Set(layout.shapes).size,7);
  assert.equal(layout.overflow,false);
  if(width>900)assert.ok(layout.copy.right<layout.art.left);else assert.ok(layout.copy.bottom<layout.art.top);
  await page.locator('[data-person="6"]').scrollIntoViewIfNeeded();
  assert.ok(await page.locator('[data-person="6"]').isVisible());
  await page.locator('.mouth').screenshot({path:`${out}/${width}-final.png`});
  if(width===390)for(const w of [768,1440,390]){await page.setViewportSize({width:w,height:900});await page.waitForTimeout(150);await check(page);}
  await page.close();
 }
 for(const width of [320,390,768]) for(const javaScriptEnabled of [true,false]) {
  const page=await browser.newPage({javaScriptEnabled,viewport:{width,height:844},reducedMotion:'reduce'});
  await page.goto(base+'/');await page.locator('.mouth').scrollIntoViewIfNeeded();
  assert.deepEqual(await page.locator('.network-card img').evaluateAll(es=>es.map(e=>getComputedStyle(e).opacity)),Array(7).fill('1'));
  assert.equal(await page.locator('.sharing-network').evaluate(e=>e.getAnimations({subtree:true}).length),0);
  if(javaScriptEnabled)await check(page);
  else {
   const boxes=await page.locator('.network-card').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect();return {top:b.top,left:b.left,right:b.right};}));
   assert.equal(boxes[1].top,boxes[2].top);
   assert.ok(boxes[0].top<boxes[1].top&&boxes[1].top<boxes[3].top);
   boxes.slice(3).forEach(b=>assert.equal(b.top,boxes[3].top));
   boxes.forEach(b=>assert.ok(b.left>=0&&b.right<=width));
  }
  await page.locator('.mouth').screenshot({path:`${out}/${width}-${javaScriptEnabled?'reduced':'no-js'}-final.png`});
  await page.close();
 }
 const page=await browser.newPage();await page.goto(base+'/');await page.locator('[data-person="0"]').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector('.sharing-network').dataset.motion==='playing');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>document.querySelector('.sharing-network').dataset.motion==='complete');
 assert.deepEqual(await page.locator('.network-card img').evaluateAll(es=>es.map(e=>getComputedStyle(e).opacity)),Array(7).fill('1'));
 assert.equal(await page.locator('.sharing-network').evaluate(e=>e.getAnimations({subtree:true}).length),0);
 const root=await page.request.get(base+'/'),preview=await page.request.get(base+'/estudos/lima/');
 assert.equal(root.status(),200);assert.equal(preview.status(),200);assert.equal(await root.text(),await preview.text());
 console.log('Network: progressive sequence, 6 endpoint pairs, portrait/landscape resize, 320/390/768/1440, reduced initial/runtime, no-JS, route parity OK');
} finally {await browser.close();}
