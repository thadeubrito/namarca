import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
// Screenshots must capture the block period, not silently await document.fonts.ready.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY='1';
const origin=process.env.SITE_TEST_URL || 'http://host.docker.internal:3001';
const out=process.env.SITE_TEST_OUTPUT || '/tmp/site-fonts';
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
const results=[];
try {
 for(const path of ['/','/estudos/lima/']) for(const width of [1440,390]) for(const reducedMotion of ['no-preference','reduce']) for(const delay of [250,600,5200]) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion});
  const page=await context.newPage();
  const errors=[],warnings=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
  page.on('request',r=>{if(r.resourceType()==='font')requests.push(r.url());});
  await page.route('**/*.woff2',async route=>{await new Promise(r=>setTimeout(r,delay));await route.continue();});
  const cdp=await context.newCDPSession(page);
  await cdp.send('DOM.enable');await cdp.send('CSS.enable');
  const response=await page.goto(origin+path,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  assert.equal(await page.locator('.header .brand').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
  assert.equal(await page.locator('footer .brand').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
  assert.match(response.headers()['content-security-policy'],/font-src 'self'/);
  const name=`${path==='/'?'root':'lima'}-${width}-${reducedMotion}-${delay}`;
  const state=()=>page.evaluate(()=>({time:performance.now(),status:document.fonts.status,ready:document.fonts.check('700 66px Poppins'),body:{opacity:getComputedStyle(document.body).opacity,visibility:getComputedStyle(document.body).visibility,display:getComputedStyle(document.body).display},image:document.querySelector('.photo img').complete,faces:[...document.fonts].map(f=>({weight:f.weight,display:f.display,status:f.status})),paints:performance.getEntriesByType('paint').map(p=>({name:p.name,time:p.startTime}))}));
  if(delay>250) await page.waitForTimeout(120);
  const initial=await state();
  if(delay>250) assert.equal(initial.ready,false);
  assert.equal(initial.body.opacity,'1');assert.equal(initial.body.visibility,'visible');assert.notEqual(initial.body.display,'none');
  assert.ok(initial.faces.every(f=>f.display==='block'));
  await page.screenshot({path:`${out}/${name}-initial.png`});
  let fallback;
  if(delay===5200){
   await page.waitForTimeout(3300);
   fallback=await state();assert.equal(fallback.ready,false);assert.equal(fallback.image,true);
   const {root}=await cdp.send('DOM.getDocument');
   const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'h1'});
   fallback.rendered=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
   assert.ok(fallback.rendered.fonts.some(f=>!f.isCustomFont&&f.glyphCount>0));
   await page.screenshot({path:`${out}/${name}-fallback.png`});
  }
  await page.evaluate(()=>document.fonts.ready);
  const final=await state();assert.equal(final.ready,true);
  const {root}=await cdp.send('DOM.getDocument');
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'h1'});
  const rendered=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
  assert.ok(rendered.fonts.some(f=>f.isCustomFont&&f.familyName.includes('Poppins')));
  await page.screenshot({path:`${out}/${name}-loaded.png`});
  // Give Chromium time to report unused preloads, not just network completion.
  await page.waitForTimeout(1000);
  assert.equal(new Set(requests).size,requests.length,'duplicate font requests');
  assert.equal(errors.length,0,errors.join('\n'));
  assert.equal(warnings.length,0,warnings.join('\n'));
  const network=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.woff2')).map(r=>({url:r.name,initiator:r.initiatorType,start:r.startTime,duration:r.duration,transfer:r.transferSize})));
  const fontResponse=await context.request.get(origin+'/estudos/lima/poppins-700-latin.woff2');
  assert.equal(fontResponse.headers()['content-type'],'font/woff2');
  results.push({name,initial,fallback,final,rendered,network,fontHeaders:fontResponse.headers(),warnings,errors});
  await context.close();
 }
 await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
 console.log(`PASS font loading: ${results.length} cold contexts; ${out}`);
} finally {await browser.close();}
