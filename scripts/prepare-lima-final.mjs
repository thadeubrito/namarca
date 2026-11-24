// Local, reproducible preparation of the approved A Grande Final original. No AI or uploads.
// docker exec namarca-app-1 node scripts/prepare-lima-final.mjs /tmp/final-approved.png
import sharp from 'sharp';
import {appendFile} from 'node:fs/promises';
const input=process.argv[2];
if(!input)throw Error('Provide approved 941×1672 PNG');
const meta=await sharp(input).metadata();
if(meta.width!==941||meta.height!==1672)throw Error('Unexpected approved source dimensions');
const dest='/app/apps/site/estudos/lima/materials';
const prepared=await sharp(input).flatten({background:'#f8e8bd'}).resize(1080,1920,{fit:'contain',background:'#f8e8bd'}).png().toBuffer();
await sharp(prepared).webp({quality:94,smartSubsample:true}).toFile(`${dest}/final-story-approved.webp`);
const {data,info}=await sharp(prepared).raw().toBuffer({resolveWithObject:true});
const cx=530,cy=1130,contour=[];
const cream=(x,y)=>{const p=(Math.round(y)*info.width+Math.round(x))*info.channels;return data[p]>215&&data[p+1]>190&&data[p+2]>135;};
for(let i=0;i<1440;i++){
 const a=i*Math.PI/720,dx=Math.cos(a),dy=Math.sin(a);let found=false;
 for(let r=1;r<500;r+=.25){
  if([0,.5,1].every(d=>!cream(cx+dx*(r+d),cy+dy*(r+d)))){contour.push([cx+dx*(r-.65),cy+dy*(r-.65)]);found=true;break;}
 }
 if(!found)throw Error(`Missing photo boundary at ray ${i}`);
}
const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
const closed=[...contour,contour[0]];
function simplify(start,end,tolerance){let max=0,index=start;for(let i=start+1;i<end;i++){const d=distance(closed[i],closed[start],closed[end]);if(d>max){max=d;index=i;}}return max>tolerance?[...simplify(start,index,tolerance).slice(0,-1),...simplify(index,end,tolerance)]:[start,end];}
let tolerance=.55,indices;
do{indices=[...simplify(0,720,tolerance).slice(0,-1),...simplify(720,1440,tolerance).slice(0,-1)];tolerance+=.05;}while(indices.length>60);
while(indices.length<60){let gap=0,at=0;for(let i=0;i<indices.length;i++){const d=(indices[i+1]??1440)-indices[i];if(d>gap){gap=d;at=i;}}indices.splice(at+1,0,Math.floor(indices[at]+gap/2));}
const points=indices.map(i=>contour[i]);
const left=Math.min(...points.map(p=>p[0])),top=Math.min(...points.map(p=>p[1]));
const width=Math.max(...points.map(p=>p[0]))-left,height=Math.max(...points.map(p=>p[1]))-top;
const polygon=points.map(([x,y])=>`${((x-left)/width*100).toFixed(3)}% ${((y-top)/height*100).toFixed(3)}%`).join(',');
const geometry={left:left/1080*100,top:top/1920*100,width:width/1080*100,height:height/1920*100};
const maxError=Math.max(...contour.map((p,i)=>{const j=indices.findIndex(n=>n>i),end=j<0?1440:indices[j],start=j<0?indices.at(-1):indices[Math.max(0,j-1)];return distance(p,closed[start],closed[end]);}));
console.log(JSON.stringify({geometry,polygon,maxError,vertices:points.length}));
const svg=body=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260">${body}</svg>`);
await sharp(svg('<circle cx="130" cy="130" r="100" fill="#f8e8bd" stroke="#fffdf2" stroke-width="14"/><circle cx="130" cy="130" r="91" fill="none" stroke="#164d36" stroke-width="5"/><path d="M130 87L170 116L155 162H105L90 116ZM130 38L109 63L76 65L64 46M222 100L193 107L180 78L189 54M188 211L178 181L208 162L230 176M42 176L72 162L82 191L72 211M49 73L66 103L43 129L30 124" fill="#164d36"/><path d="M130 87V62M170 116L194 108M155 162L178 182M105 162L81 182M90 116L66 104" fill="none" stroke="#164d36" stroke-width="5"/>')).webp({lossless:true}).toFile(`${dest}/final-sticker-ball.webp`);
await sharp(svg('<path d="M67 229L67 31Q119 17 160 40T226 35V160Q185 174 147 153T67 147Z" fill="#fffdf2" stroke="#fffdf2" stroke-width="15" stroke-linejoin="round"/><path d="M73 40Q121 28 160 48T219 43V147Q181 160 148 141T73 136Z" fill="#720d29"/><path d="M73 76Q120 66 159 87T219 83V112Q180 125 148 104T73 103Z" fill="#ddae55"/><path d="M66 229V32" stroke="#164d36" stroke-width="12" stroke-linecap="round"/><path d="M199 144L219 147L212 127" fill="#f8e8bd"/>')).webp({lossless:true}).toFile(`${dest}/final-sticker-flag.webp`);
if(process.argv.includes('--css'))await appendFile('/app/apps/site/estudos/lima/materials.css',`\n/* A Grande Final: approved original contained without crop; 1440 measured rays\n   simplified to 60 vertices by chord error (${maxError.toFixed(3)}px). */\n.lima .hero .scene{${Object.entries(geometry).map(([k,v])=>`--perspective-photo-4-${k}:${v}%;`).join('')}--perspective-photo-4-radius:0%}\n.lima .hero .frame.variant-4{background-image:url('/estudos/lima/materials/final-story-approved.webp');background-color:#164d36!important;background-size:100% 100%;background-blend-mode:normal}\n.lima .hero .frame.variant-4::before,.lima .hero .frame.variant-4::after{content:none}\n.lima .hero .photo[data-shape='4']{background:transparent}\n.lima .hero .photo[data-shape='4'] img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 20%;clip-path:polygon(${polygon})}\n.lima .hero .sticker[data-set='4']{background:transparent center/contain no-repeat;filter:drop-shadow(0 2px 2px #15160625)}\n.lima .hero .sticker[data-set='4']:nth-child(odd){background-image:url('/estudos/lima/materials/final-sticker-ball.webp');left:5%!important;top:70%!important;width:13%!important;height:7.3125%!important;rotate:-8deg}\n.lima .hero .sticker[data-set='4']:nth-child(even){background-image:url('/estudos/lima/materials/final-sticker-flag.webp');left:81%!important;top:68%!important;width:13%!important;height:7.3125%!important;rotate:8deg}\n.lima .hero .sticker[data-set='4']::after{content:none!important}\n`);
