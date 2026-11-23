// Approved Órbita original, local deterministic preparation only (no generation/upload).
// docker compose exec app node scripts/prepare-lima-orbita.mjs /tmp/orbita-approved.png
import sharp from 'sharp';
const input=process.argv[2];
if(!input)throw Error('Provide approved Órbita 948×1659 PNG');
const dest='/app/apps/site/estudos/lima/materials';
const meta=await sharp(input).metadata();
if(meta.width!==948||meta.height!==1659)throw Error('Expected approved original 948×1659');
await sharp(input).flatten({background:'#11110e'}).resize(1080,1920,{fit:'contain',background:'#11110e'}).webp({quality:94,smartSubsample:true}).toFile(`${dest}/orbita-story-approved.webp`);
const svg=body=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260">${body}</svg>`);
await sharp(svg('<path d="M66 38L130 102L194 38L222 66L158 130L222 194L194 222L130 158L66 222L38 194L102 130L38 66Z" fill="#ed3028" stroke="#fff1cc" stroke-width="15" stroke-linejoin="round"/><path d="M70 54L103 84M179 178L202 201" stroke="#151510" stroke-width="3" opacity=".55"/>')).webp({lossless:true}).toFile(`${dest}/orbita-sticker-cross.webp`);
await sharp(svg('<path d="M40 183L48 73L96 117L129 43L165 116L216 70L207 184Z" fill="#fff1cc" stroke="#161612" stroke-width="17" stroke-linejoin="round"/><path d="M50 212L204 207" stroke="#fff1cc" stroke-width="17" stroke-linecap="round"/><path d="M65 172L186 170" stroke="#ec3028" stroke-width="10"/>')).webp({lossless:true}).toFile(`${dest}/orbita-sticker-crown.webp`);
// Measure the INNER dark ink boundary of the cream aperture on prepared pixels.
// Uniform contain produces 1080×1890 artwork with 15 px vertical padding.
const {data,info}=await sharp(`${dest}/orbita-story-approved.webp`).raw().toBuffer({resolveWithObject:true});
const cx=490,cy=945,points=[];
const dark=(x,y)=>{const p=(Math.round(y)*info.width+Math.round(x))*info.channels;return data[p]<170||data[p+1]<155||data[p+2]<125;};
for(let i=0;i<60;i++){
 const a=i*Math.PI/30,dx=Math.cos(a),dy=Math.sin(a);let found=false;
 for(let r=290;r<440;r+=.5){
  // Require sustained ink; isolated printed grain is not the aperture edge.
  if([0,1,2].filter(d=>dark(cx+dx*(r+d),cy+dy*(r+d))).length===3){points.push([cx+dx*(r-1.5),cy+dy*(r-1.5)]);found=true;break;}
 }
 if(!found)throw Error(`Missing aperture boundary at ${i}`);
}
// At ray 240° the drawn black edge is interrupted by cream torn paper.
// Bridge only that measured discontinuity, rather than following the outer red ring.
{const i=40,a=i*Math.PI/30;const r=(Math.hypot(points[39][0]-cx,points[39][1]-cy)+Math.hypot(points[41][0]-cx,points[41][1]-cy))/2;points[i]=[cx+Math.cos(a)*r,cy+Math.sin(a)*r];}
const left=Math.min(...points.map(p=>p[0])),top=Math.min(...points.map(p=>p[1]));
const width=Math.max(...points.map(p=>p[0]))-left,height=Math.max(...points.map(p=>p[1]))-top;
console.log(JSON.stringify({left:left/1080*100,top:top/1920*100,width:width/1080*100,height:height/1920*100,points:points.map(([x,y])=>`${((x-left)/width*100).toFixed(3)}% ${((y-top)/height*100).toFixed(3)}%`).join(',')},null,2));
console.log('Órbita: opaque 1080×1920 contain; two independent alpha stickers; no crop/stretch or new generation.');
