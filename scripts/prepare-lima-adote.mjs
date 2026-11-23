// Deterministic local preparation of the explicitly approved screenprint original.
// docker exec namarca-app-1 node scripts/prepare-lima-adote.mjs /tmp/adote-approved.png
import sharp from 'sharp';
const input=process.argv[2];
if(!input)throw Error('Provide approved Adote um Amigo 941×1672 opaque PNG');
const dest='/app/apps/site/estudos/lima/materials';
const meta=await sharp(input).metadata();
if(meta.width!==941||meta.height!==1672)throw Error('Expected approved original 941×1672');
// Uniform contain: 1080×1919 artwork, minimal cream padding; no crop/stretch/redraw.
const prepared=await sharp(input).flatten({background:'#fff0cc'}).resize(1080,1920,{fit:'contain',background:'#fff0cc'}).png().toBuffer();
const geometryOnly=process.argv.includes('--geometry-only');
if(!geometryOnly)await sharp(prepared).webp({quality:94,smartSubsample:true}).toFile(`${dest}/adote-story-approved.webp`);
const {data,info}=await sharp(prepared).raw().toBuffer({resolveWithObject:true});
const cx=270,cy=1030,contour=[];
const cream=(x,y)=>{const p=(Math.round(y)*info.width+Math.round(x))*info.channels;return data[p]>215&&data[p+1]>195&&data[p+2]>145&&data[p+2]<240;};
// Dense measurement first: 60 equal-angle rays undersample the four small radii.
// Simplify by geometric error, NOT a hull/edge-line fit (which erases the curves).
for(let i=0;i<1440;i++){
 const a=i*Math.PI/720,dx=Math.cos(a),dy=Math.sin(a);let found=false;
 for(let r=1;r<430;r+=.25){
  if([0,.5,1].every(d=>!cream(cx+dx*(r+d),cy+dy*(r+d)))){contour.push([cx+dx*(r-.65),cy+dy*(r-.65)]);found=true;break;}
 }
 if(!found)throw Error(`Missing inner photo boundary at ray ${i}`);
}
const distance=(p,a,b)=>{
 const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));
 return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
};
const closed=[...contour,contour[0]];
function simplify(start,end,tolerance){
 let max=0,index=start;
 for(let i=start+1;i<end;i++){const d=distance(closed[i],closed[start],closed[end]);if(d>max){max=d;index=i;}}
 return max>tolerance?[...simplify(start,index,tolerance).slice(0,-1),...simplify(index,end,tolerance)]:[start,end];
}
let tolerance=.55,indices;
do{indices=[...simplify(0,720,tolerance).slice(0,-1),...simplify(720,1440,tolerance).slice(0,-1)];tolerance+=.05;}while(indices.length>60);
// Spend spare vertices on the longest unsampled arc. Exactly 60 points in clockwise
// order, starting at the right midpoint, keeps all three CSS polygon morphs compatible.
while(indices.length<60){
 let gap=0,at=0;
 for(let i=0;i<indices.length;i++){const d=(indices[i+1]??1440)-indices[i];if(d>gap){gap=d;at=i;}}
 indices.splice(at+1,0,Math.floor(indices[at]+gap/2));
}
const points=indices.map(i=>contour[i]);
const maxError=Math.max(...contour.map((p,i)=>{const j=indices.findIndex(n=>n>i),end=j<0?1440:indices[j],start=j<0?indices.at(-1):indices[Math.max(0,j-1)];return distance(p,closed[start],closed[end]);}));
console.log(`Dense contour approximation maximum error: ${maxError.toFixed(3)}px (1080×1920 raster)`);
const left=Math.min(...points.map(p=>p[0])),top=Math.min(...points.map(p=>p[1]));
const width=Math.max(...points.map(p=>p[0]))-left,height=Math.max(...points.map(p=>p[1]))-top;
console.log(JSON.stringify({left:left/1080*100,top:top/1920*100,width:width/1080*100,height:height/1920*100,points:points.map(([x,y])=>`${((x-left)/width*100).toFixed(3)}% ${((y-top)/height*100).toFixed(3)}%`).join(',')},null,2));
if(geometryOnly)process.exit(0);
// Small independent print-style graphics, not extracted animals/paws or fake UI.
const svg=body=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="180" viewBox="0 0 360 180">${body}</svg>`);
await sharp(svg('<path d="M16 32L338 18L346 151L24 164Z" fill="#fff0cc" stroke="#ff664e" stroke-width="12" stroke-linejoin="round"/><path d="M38 115V63H68M38 87H65M38 115H68M82 63V102Q82 117 97 117Q112 117 112 102V63M141 117L158 63L175 117M147 99H169M188 117V63H202Q220 63 220 80Q220 97 202 97H188M247 63Q231 63 231 90Q231 117 247 117Q263 117 263 90Q263 63 247 63ZM279 63V117M309 63Q293 63 293 90Q293 117 309 117Q325 117 325 90Q325 63 309 63Z" fill="none" stroke="#123eb5" stroke-width="6" stroke-linejoin="round"/>')).webp({lossless:true}).toFile(`${dest}/adote-sticker-support.webp`);
await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><path d="M91 20L110 20L112 71L151 34L165 48L129 88L180 91L180 110L129 112L165 151L151 165L112 129L110 180L91 180L88 129L48 165L34 151L71 112L20 110L20 91L71 88L34 48L48 34L88 71Z" fill="#ff664e" stroke="#fff0cc" stroke-width="9" stroke-linejoin="round"/><path d="M95 35L98 62M44 97L66 96M137 101L163 103" stroke="#123eb5" stroke-width="3" opacity=".6"/></svg>')).webp({lossless:true}).toFile(`${dest}/adote-sticker-print.webp`);
console.log('Adote: approved opaque 1080×1920 contain, rounded inner quadrilateral measured with 1440 rays, curve-preserving 60-point polygon; two original independent alpha graphics; no generation/upload.');
