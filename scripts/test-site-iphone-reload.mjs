import assert from 'node:assert/strict';
import { chromium, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const origin=process.env.SITE_TEST_URL||'http://host.docker.internal:3001';
const out=process.env.IPHONE_RELOAD_SHOTS||'/tmp/iphone-reload';
await mkdir(out,{recursive:true});
const report=[];
for(const engine of [webkit,chromium]) {
 const browser=await engine.launch();
 try {for(const width of [375,393,430,852,1440]) for(const reducedMotion of ['no-preference','reduce']) {
  const context=await browser.newContext({viewport:{width,height:width===852?393:852},isMobile:width<1000,hasTouch:width<1000,deviceScaleFactor:width<1000?3:1,reducedMotion});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error('PAGEERROR',engine.name(),width,e.message);});
  if(width===393) await page.route(/\.(css|woff2|webp|js)(\?|$)/,async r=>{await new Promise(resolve=>setTimeout(resolve,150));await r.continue();});
  await page.goto(origin);
  for(let load=0;load<5;load++) {
   console.log(engine.name(),width,reducedMotion,'load',load);
   if(load) {await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.reload();}
   await page.waitForFunction(()=>document.querySelector('.scene').dataset.entrance==='ready');
   await page.waitForFunction(()=>scrollY===0);
   assert.equal(await page.evaluate(()=>scrollY),0,`${engine.name()} reload must start at top`);
   for(let index=0;index<5;index++) {
    await page.waitForFunction(i=>{const s=document.querySelector('.scene');return s.dataset.active===String(i)&&s.dataset.settled==='true';},index);
    const state=await page.locator('.scene').evaluate(root=>{
     const p=root.querySelector('.photo'),im=p.querySelector('img'),box=p.getBoundingClientRect(),plane=p.parentElement.getBoundingClientRect(),css=getComputedStyle(root);
     return {actual:[box.x-plane.x,box.y-plane.y,box.width,box.height],expected:['left','top','width','height'].map((k,i)=>parseFloat(css.getPropertyValue(`--perspective-photo-${root.dataset.active}-${k}`))*(i%2?plane.height:plane.width)/100),clip:im.style.clipPath};
    });
    state.actual.forEach((v,i)=>assert.ok(Math.abs(v-state.expected[i])<.15,`${engine.name()}/${width}/${load}/${index} ${JSON.stringify(state)}`));
    assert.ok(state.clip.startsWith('polygon(')&&!/Infinity|NaN/.test(state.clip));
    report.push({engine:engine.name(),width,reducedMotion,load,index,...state});
    await page.locator('.scene').focus();await page.keyboard.press('ArrowRight');
   }
   await page.waitForFunction(()=>document.querySelector('.scene').dataset.active==='0'&&document.querySelector('.scene').dataset.settled==='true');
  }
  // Hidden at nonnegative coordinates: rubber-banding must not reveal an off-page link.
  await page.evaluate(()=>document.activeElement.blur());
  const hidden=await page.locator('.skip').evaluate(el=>({clip:getComputedStyle(el).clipPath,box:el.getBoundingClientRect().toJSON(),scrollY}));
  assert.equal(hidden.clip,'inset(50%)');assert.equal(hidden.box.y+hidden.scrollY,0);assert.equal(hidden.box.height,1);
  await page.reload();await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.className),'skip');
  assert.equal(await page.locator('.skip').evaluate(el=>getComputedStyle(el).clipPath),'none');
  await page.keyboard.press('Enter');assert.equal(new URL(page.url()).hash,'#conteudo');
  await page.goto(`${origin}/#duvidas`);await page.reload();
  await page.waitForFunction(()=>Math.abs(document.querySelector('#duvidas').getBoundingClientRect().top)<100);
  await page.goto(`${origin}/#contato`);await page.goBack();
  await page.waitForFunction(()=>location.hash==='#duvidas'&&Math.abs(document.querySelector('#duvidas').getBoundingClientRect().top)<100);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:`${out}/${engine.name()}-${width}-${reducedMotion}.png`});
  await context.close();
 }}finally{await browser.close();}
}
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
console.log('PASS: repeated actual reloads, 5 geometries, reload top, hash reload/back, keyboard skip; Chromium/WebKit normal/reduced. Physical iOS rubber-band not simulated.');
