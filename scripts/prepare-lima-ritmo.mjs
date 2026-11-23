// Local-only preparation of the approved 1024×1536 running illustration.
// docker cp approved.png namarca-app-1:/tmp/ritmo-approved.png
// docker exec namarca-app-1 node scripts/prepare-lima-ritmo.mjs /tmp/ritmo-approved.png
import sharp from 'sharp';
import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {applyGeometry} from './apply-ritmo-geometry.mjs';
const input=process.argv[2];if(!input)throw Error('Approved PNG required');
const meta=await sharp(input).metadata();if(meta.width!==1024||meta.height!==1536)throw Error('Expected 1024×1536 original');
const dest='/app/apps/site/estudos/lima/materials';
const font=await readFile('/app/apps/site/estudos/lima/poppins-700-latin.woff2');
// Chromium rasterizes the installed local Poppins into the original inclined seal;
// no image upload, generation, external font or network request.
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const label=await page.evaluate(async base64=>{const face=new FontFace('LocalPoppins',`url(data:font/woff2;base64,${base64})`,{weight:'700'});await face.load();document.fonts.add(face);const c=document.createElement('canvas');c.width=1024;c.height=1536;const x=c.getContext('2d');x.fillStyle='#fff0ce';x.beginPath();x.moveTo(774,1195);x.lineTo(947,1167);x.lineTo(959,1266);x.lineTo(781,1294);x.closePath();x.fill();x.transform(1,-.1763,0,1,791,1221);x.fillStyle='#452080';x.font='700 32px LocalPoppins';x.fillText('VOU',28,0);x.fillText('CORRER',-3,37);return c.toDataURL('image/png').split(',')[1];},font.toString('base64'));
await browser.close();
const edited=await sharp(input).composite([{input:Buffer.from(label,'base64')}]).png().toBuffer();
// Scale the whole drawing uniformly. Extend only the texture at its outside edges,
// leaving every illustration/text pixel inside the approved composition untouched.
const body=await sharp(edited).resize(1080,1620,{fit:'fill'}).png().toBuffer();
// Abstract edge extensions only: never mirror artwork (it can duplicate lettering
// upside down), runners, leaves or other recognizable parts of the composition.
async function extendTexture(base){
 const pixels=Buffer.alloc(1080*150*3);let seed=7021;
 for(let y=0;y<150;y++)for(let x=0;x<1080;x++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const noise=(seed/4294967296-.5)*24;
  const p=(y*1080+x)*3;for(let c=0;c<3;c++)pixels[p+c]=Math.max(0,Math.min(255,base[c]+noise));
 }
 return sharp(pixels,{raw:{width:1080,height:150,channels:3}}).png().toBuffer();
}
const top=await extendTexture([69,32,128]),bottom=await extendTexture([69,32,128]);
const prepared=await sharp({create:{width:1080,height:1920,channels:3,background:'#452080'}}).composite([{input:top,top:0,left:0},{input:body,top:150,left:0},{input:bottom,top:1770,left:0}]).png().toBuffer();
await sharp(prepared).webp({quality:95,smartSubsample:true}).toFile(`${dest}/ritmo-story-approved.webp`);
const {data,info}=await sharp(prepared).raw().toBuffer({resolveWithObject:true});
const cx=766,cy=945,contour=[];
const cream=(x,y)=>{if(x<0||y<0||x>=1080||y>=1920)return false;const p=(Math.round(y)*info.width+Math.round(x))*info.channels;return data[p]>220&&data[p+1]>210&&data[p+2]>155;};
for(let i=0;i<1440;i++){const a=i*Math.PI/720,dx=Math.cos(a),dy=Math.sin(a);let found=false;for(let r=1;r<700;r+=.25){if([0,.5,1].every(d=>!cream(cx+dx*(r+d),cy+dy*(r+d)))){contour.push([cx+dx*(r-.9),cy+dy*(r-.9)]);found=true;break;}}if(!found)throw Error(`Missing boundary ${i}`);}
const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
const closed=[...contour,contour[0]];
function simplify(start,end,tol){let max=0,index=start;for(let i=start+1;i<end;i++){const d=distance(closed[i],closed[start],closed[end]);if(d>max){max=d;index=i;}}return max>tol?[...simplify(start,index,tol).slice(0,-1),...simplify(index,end,tol)]:[start,end];}
let tol=.55,indices;do{indices=[...simplify(0,720,tol).slice(0,-1),...simplify(720,1440,tol).slice(0,-1)];tol+=.05;}while(indices.length>60);
while(indices.length<60){let gap=0,at=0;for(let i=0;i<indices.length;i++){const d=(indices[i+1]??1440)-indices[i];if(d>gap){gap=d;at=i;}}indices.splice(at+1,0,Math.floor(indices[at]+gap/2));}
const points=indices.map(i=>contour[i]),left=Math.min(...points.map(p=>p[0])),topY=Math.min(...points.map(p=>p[1])),width=Math.max(...points.map(p=>p[0]))-left,height=Math.max(...points.map(p=>p[1]))-topY;
const geometry={left:left/1080*100,top:topY/1920*100,width:width/1080*100,height:height/1920*100,points:points.map(([x,y])=>`${((x-left)/width*100).toFixed(3)}% ${((y-topY)/height*100).toFixed(3)}%`).join(',')};
await writeFile('/tmp/ritmo-geometry.json',JSON.stringify(geometry,null,2));
const svg=body=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">${body}</svg>`);
await sharp(svg('<path d="M22 45L177 21L220 112L64 141Z" fill="#e5f33c" stroke="#fff0ce" stroke-width="9" stroke-linejoin="round"/><path d="M48 78L164 57M65 99L180 78M83 120L197 99" fill="none" stroke="#452080" stroke-width="10"/>')).webp({lossless:true}).toFile(`${dest}/ritmo-sticker-motion.webp`);
await sharp(svg('<path d="M29 100L77 77L90 31L119 40L110 75L152 91L211 89L222 118L187 135L92 128L27 125Z" fill="#452080" stroke="#fff0ce" stroke-width="9" stroke-linejoin="round"/><path d="M112 89L128 69M133 96L150 76M41 118L200 124" stroke="#e5f33c" stroke-width="7"/>')).webp({lossless:true}).toFile(`${dest}/ritmo-sticker-shoe.webp`);
await applyGeometry(geometry);
console.log(JSON.stringify(geometry));
