import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import sharp from 'sharp';
import { createPublicServer } from './support/public-site-gateway.mjs';
import { parseCampaign } from '../src/lib/campaigns/campaigns';
import { sealSvg, retroStickers } from './support/clube-sol-seals.mjs';
const slug = 'exemplo-clube-sol';
const directory = `tests/fixtures/${slug}`;
test('fixture demonstrativa não é servida como campanha publicada', async () => {
 let reads = 0;
 const server = createPublicServer({ readObject: async () => { reads++; return null; } });
 await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
 const address = server.address(); assert.ok(address && typeof address !== 'string');
 try {
  const response = await fetch(`http://127.0.0.1:${address.port}/campaigns/${slug}/campaign.json`);
  assert.equal(response.status, 404);
  assert.equal(reads, 1, 'sem exceção de fixture: usa o reader normal');
 } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
test('frame alpha only removes approved photo polygon; all exterior pixels unchanged',async () => {
 const config = parseCampaign(JSON.parse(await readFile(`${directory}/campaign.json`,'utf8')),slug);
 const art = config.artworks[0];
 const {data,info} = await sharp(`${directory}/${art.file}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const original = await sharp('public/landing/materials/clube-sol-story-approved.webp').ensureAlpha().raw().toBuffer();
 assert.deepEqual([info.width,info.height],[1080,1920]);
 let holes=0,edges=0;
 for(let y=0;y<1920;y++) for(let x=0;x<1080;x++) {
  const i=(y*1080+x)*4;
  if(data[i+3]===0) holes++;
  if(data[i+3]>0&&data[i+3]<255) edges++;
  if(x<Math.floor(art.reference.x)||x>Math.ceil(art.reference.x+art.reference.width)||y<Math.floor(art.reference.y)||y>Math.ceil(art.reference.y+art.reference.height)) assert.equal(data.readUInt32BE(i),original.readUInt32BE(i));
 }
 assert.ok(holes>290000&&holes<310000); assert.ok(edges>500);
 for(const [x,y] of [[0,0],[1079,0],[0,1919],[1079,1919],[art.reference.x,art.reference.y]]) assert.equal(data[(Math.floor(y)*1080+Math.floor(x))*4+3],255);
 assert.equal(data[(1010*1080+620)*4+3],0);
});
test('actual raster cutline preserves the thick 22px paper without shrinking any body', async () => {
 for (const [name] of retroStickers) {
  const svg = sealSvg(name);
  const old = svg.replace(/<feMorphology.*?result="edge"\/>/, '<feMorphology in="SourceAlpha" operator="dilate" radius="15" result="edge"/>');
  const body = svg.replace('filter="url(#cut)"', '');
  const images = await Promise.all([body, old, svg].map(async input => sharp(Buffer.from(input)).ensureAlpha().raw().toBuffer()));
  const boxes = images.map(data => {
   const box = [640,640,-1,-1];
   for(let y=0;y<640;y++) for(let x=0;x<640;x++) if(data[(y*640+x)*4+3]===255) {
    box[0]=Math.min(box[0],x); box[1]=Math.min(box[1],y); box[2]=Math.max(box[2],x); box[3]=Math.max(box[3],y);
   }
   return box;
  });
  const before = boxes[0].map((v,i)=>Math.abs(v-boxes[1][i]));
  const after = boxes[0].map((v,i)=>Math.abs(v-boxes[2][i]));
  for(let side=0;side<4;side++) assert.ok(after[side]>=18, `${name}: side ${side}: ${before[side]} → ${after[side]}px`);
  for(let i=0;i<images[0].length;i+=4) if(images[0][i+3]===255) assert.equal(images[2].readUInt32BE(i),images[0].readUInt32BE(i), `${name}: exact opaque body coordinates`);
  console.log(`${name}: visible bbox expansion ${before.join('/')} → ${after.join('/')}px`);
 }
});
test('five editorial screenprint vectors reproduce exactly with outlined OFL type and white die-cut',async () => {
 const silhouettes = new Set<string>();
 for(const [source,,id] of retroStickers) {
  const svg = await readFile(`${directory}/sources/${source}.svg`,'utf8');
  assert.equal(svg,sealSvg(source));
  assert.doesNotMatch(svg,/<text|<image|href=|Gradient|curl|flap/);
  const path=`${directory}/stickers/b0000000-0000-4000-8000-${String(id).padStart(12,'0')}.png`;
  assert.deepEqual(await readFile(path),await sharp(Buffer.from(svg)).png().toBuffer());
  const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual([info.width,info.height],[640,640]);
  let white=0,opaque=0,translucent=0;
  const alpha=Buffer.alloc(640*640);
  for(let y=0;y<640;y++) for(let x=0;x<640;x++) {
   const i=(y*640+x)*4; alpha[y*640+x]=data[i+3];
   if(x<8||y<8||x>=632||y>=632) assert.equal(data[i+3],0,'eight pixels of clear padding');
   if(data[i+3]===255) { opaque++; if(data[i]>245&&data[i+1]>245&&data[i+2]>245)white++; }
   else if(data[i+3]>0)translucent++;
  }
  assert.ok(white>9000,'consistent white die-cut'); assert.ok(opaque>35000,'usable artwork area'); assert.ok(translucent>3000,'baked antialias and minimal shadow');
  silhouettes.add(alpha.toString('base64'));
 }
 assert.equal(silhouettes.size,5,'five distinct compositions');
 assert.deepEqual(retroStickers.map(([,,id])=>id),[1,2,4,6,7]);
 assert.deepEqual(retroStickers.map(([,name])=>name),['Eu vou','Cérebro criativo','Bora?','Sol','Boa ideia']);
});
