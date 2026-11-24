import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const out='/tmp/site-lima-materials';await mkdir(out,{recursive:true});
const origin=process.env.SITE_TEST_URL||'http://host.docker.internal:3001';
const browser=await chromium.launch();
try{
for(const width of [1440,768,390,320])for(const reducedMotion of ['no-preference','reduce']){
 const page=await browser.newPage({viewport:{width,height:width===1440?1100:844},isMobile:width<800,hasTouch:true,reducedMotion});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(origin+'/estudos/lima/');await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.querySelector('.scene').dataset.entrance==='ready');await page.locator('.scene').focus();
 const photo=page.locator('.photo img');assert.ok(await photo.evaluate(e=>e.complete&&e.naturalWidth===1000));
 for(let i=0;i<5;i++){
  await page.waitForFunction(i=>document.querySelector('.scene').dataset.active===String(i)&&document.querySelector('.scene').dataset.settled==='true',i);await page.waitForTimeout(350);
  assert.equal(await page.locator('.photo').getAttribute('data-shape'),String(i));
  if(i===0){
   const geometry=await page.locator('.photo').evaluate(e=>{const p=e.parentElement.getBoundingClientRect(),b=e.getBoundingClientRect();return [(b.x-p.x)/p.width,(b.y-p.y)/p.height,b.width/p.width,b.height/p.height];});
   for(const [j,v] of [.2877315,.3644509,.5726852,.3231793].entries())assert.ok(Math.abs(geometry[j]-v)<.001);
   const aperture=await photo.evaluate(e=>{const b=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect(),s=getComputedStyle(e);return {dx:b.x-p.x,dy:b.y-p.y,dw:b.width-p.width,dh:b.height-p.height,clip:s.clipPath,pos:s.objectPosition};});
   for(const key of ['dx','dy','dw','dh'])assert.ok(Math.abs(aperture[key])<.1,`photo intrinsic grid overflow: ${key}`);
   assert.ok(aperture.clip.startsWith('polygon('));assert.ok(aperture.clip.split(',').length>=60);assert.equal(aperture.pos,'50% 20%');
   assert.equal(await page.locator('.sticker-layer, .sticker').count(),0);
   assert.equal(await page.locator('.frame.variant-0').first().evaluate(e=>getComputedStyle(e,'::after').content),'none');
  }
  if(i===1){
   const geometry=await page.locator('.photo').evaluate(e=>{const p=e.parentElement.getBoundingClientRect(),b=e.getBoundingClientRect();return [(b.x-p.x)/p.width,(b.y-p.y)/p.height,b.width/p.width,b.height/p.height];});
   for(const [j,v] of [.1042398,.2955729,.6985380,.3903646].entries())assert.ok(Math.abs(geometry[j]-v)<.001);
   assert.ok(await photo.evaluate(e=>getComputedStyle(e).clipPath.split(',').length>=60));
   const sizes=await photo.evaluate(e=>({img:e.getBoundingClientRect().height,mask:e.parentElement.getBoundingClientRect().height}));assert.ok(Math.abs(sizes.img-sizes.mask)<.1);
   assert.equal(await page.locator('.frame.variant-1').first().evaluate(e=>getComputedStyle(e,'::after').content),'none');
   assert.equal(await page.locator('.sticker').count(),0);
  }
  if(i===2){
   const geometry=await page.locator('.photo').evaluate(e=>{const p=e.parentElement.getBoundingClientRect(),b=e.getBoundingClientRect();return [(b.x-p.x)/p.width,(b.y-p.y)/p.height,b.width/p.width,b.height/p.height];});
   for(const [j,v] of [.0313759,.3957451,.4474877,.2881975].entries())assert.ok(Math.abs(geometry[j]-v)<.001);
   assert.ok(await photo.evaluate(e=>getComputedStyle(e).clipPath.split(',').length>=60));
   const sizes=await photo.evaluate(e=>({img:e.getBoundingClientRect().height,mask:e.parentElement.getBoundingClientRect().height}));assert.ok(Math.abs(sizes.img-sizes.mask)<.1);
   // Each rounded corner needs several measured turns, not a single angular chord.
   const polygon=await photo.evaluate(e=>getComputedStyle(e).clipPath.match(/[\d.]+% [\d.]+%/g).map(p=>p.split('%').map(Number)));
   for(const [name,test] of Object.entries({tl:([x,y])=>x<20&&y<15,tr:([x,y])=>x>90&&y<9,bl:([x,y])=>x<9&&y>93,br:([x,y])=>x>78&&y>93}))assert.ok(polygon.filter(test).length>=4,`${name} rounded contour lost`);
   assert.equal(await page.locator('.frame.variant-2').first().evaluate(e=>getComputedStyle(e,'::after').content),'none');
   assert.equal(await page.locator('.sticker').count(),0);
  }
  if(i===3){
   assert.ok(await photo.evaluate(e=>getComputedStyle(e).clipPath.split(',').length>=60));
   assert.equal(await page.locator('.sticker').count(),0);
   const geometry=await page.locator('.photo').evaluate(e=>{const p=e.parentElement.getBoundingClientRect(),b=e.getBoundingClientRect();return [(b.x-p.x)/p.width,(b.y-p.y)/p.height,b.width/p.width,b.height/p.height];});
   for(const [j,v] of [.490704,.304753,.437872,.371740].entries())assert.ok(Math.abs(geometry[j]-v)<.001);
  }
  if(i===4){
   assert.ok(await photo.evaluate(e=>getComputedStyle(e).clipPath.split(',').length>=60));
   const geometry=await page.locator('.photo').evaluate(e=>{const p=e.parentElement.getBoundingClientRect(),b=e.getBoundingClientRect();return [(b.x-p.x)/p.width,(b.y-p.y)/p.height,b.width/p.width,b.height/p.height];});
   for(const [j,v] of [.2581966,.4337601,.4632557,.3184014].entries())assert.ok(Math.abs(geometry[j]-v)<.001);
   assert.equal(await page.locator('.sticker').count(),0);
   const sizes=await photo.evaluate(e=>({img:e.getBoundingClientRect().height,mask:e.parentElement.getBoundingClientRect().height}));assert.ok(Math.abs(sizes.img-sizes.mask)<.1);
   if(width===1440||width===390)await page.locator('.photo').screenshot({path:`${out}/${width}-${reducedMotion}-final-mask.png`});
  }
  // The printed edge is outward: it must never inset the approved artwork
  // relative to the independent photo canvas, at any slot or viewport.
  const card=await page.locator(`.frame[data-slot="${i}"]`).evaluate(e=>{
   const box=n=>{const b=n.getBoundingClientRect();return [b.x,b.y,b.width,b.height];};
   const css=getComputedStyle(e);
   return {frame:box(e),art:box(e.querySelector('img')),canvas:box(e.closest('.scene').querySelector('.photo-canvas')),border:css.borderWidth,padding:css.padding,shadow:css.boxShadow};
  });
  assert.equal(card.border,'0px');assert.equal(card.padding,'0px');
  assert.match(card.shadow,/rgb\(255, 255, 255\)/);
  for(const [j,value] of card.frame.entries()){
   assert.ok(Math.abs(value-card.art[j])<.1,'white edge must not inset artwork');
   assert.ok(Math.abs(value-card.canvas[j])<.1,'art and independent photo must share the same canvas');
  }
  assert.equal(await photo.evaluate(e=>getComputedStyle(e).objectFit),'cover');assert.equal(await page.locator('.sticker').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}/${reducedMotion}/${i}`);
  await page.screenshot({path:`${out}/${width}-${reducedMotion}-variant-${i}.png`});await page.keyboard.press('ArrowRight');
 }
 for(const asset of ['torn-tape','coral-seal','angular-cuts','halftone-paper','michael-dam-portrait','clube-sol-story-approved','clube-sol-sticker-sun','clube-sol-sticker-spark','orbita-story-approved','orbita-sticker-cross','orbita-sticker-crown','adote-story-approved','adote-sticker-support','adote-sticker-print','ritmo-story-approved','ritmo-sticker-motion','ritmo-sticker-shoe','final-story-approved','final-sticker-ball','final-sticker-flag']){const r=await page.request.get(`${origin}/estudos/lima/materials/${asset}.webp`);assert.equal(r.status(),200);assert.match(r.headers()['content-type'],/image\/webp/);}
 assert.equal((await page.request.get(origin+'/estudos/lima/materials/unlisted.webp')).status(),404);assert.deepEqual(errors,[]);await page.close();
}
console.log('Materials: stock decode, five shapes/variants, stickers, overflow, CSP console and exact asset HTTP gates OK; screenshots '+out);
}finally{await browser.close();}
