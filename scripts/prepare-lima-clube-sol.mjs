// Local preparation of the approved original; no generation, inpainting or cropping.
// Run in the app container with the original PNG path as the first argument.
import sharp from 'sharp';
const input=process.argv[2];
if(!input)throw Error('Provide the approved editorial PNG path');
const dest='/app/apps/site/estudos/lima/materials';
const meta=await sharp(input).metadata();
if(meta.width!==941||meta.height!==1672)throw Error('Expected approved original 941×1672');
// Uniform contain: complete artwork, with at most one pixel of cream padding.
await sharp(input).flatten({background:'#fff0c9'}).resize(1080,1920,{fit:'contain',background:'#fff0c9'}).webp({quality:94,smartSubsample:true}).toFile(`${dest}/clube-sol-story-approved.webp`);
// Original local sticker illustrations; not extracted from or baked into the background.
const wrap=body=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260">${body}</svg>`);
const stars=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8-Math.PI/2,r=i%2?44:100;return `${130+Math.cos(a)*r},${130+Math.sin(a)*r}`;}).join(' ');
await sharp(wrap(`<polygon points="${stars}" fill="#ff641c" stroke="#fff5dc" stroke-width="18" stroke-linejoin="round"/><circle cx="130" cy="130" r="20" fill="#192319"/>`)).webp({lossless:true}).toFile(`${dest}/clube-sol-sticker-sun.webp`);
await sharp(wrap('<rect x="30" y="30" width="200" height="200" rx="34" fill="#173ed7" stroke="#fff5dc" stroke-width="18"/><path d="M130 65V195M65 130H195M84 84L176 176M84 176L176 84" stroke="#fff0c9" stroke-width="17"/><path d="M199 181L214 200L188 211Z" fill="#dfd2b7"/>')).webp({lossless:true}).toFile(`${dest}/clube-sol-sticker-spark.webp`);
// Reproduce slot-zero aperture measurements on the final raster (not source coordinates).
// First dark pixel along 120 rays; use alternate samples for the 60-point CSS mask.
const {data,info}=await sharp(`${dest}/clube-sol-story-approved.webp`).raw().toBuffer({resolveWithObject:true});
const contour=[];
for(let i=0;i<120;i++){
 const a=i*Math.PI/60;
 for(let r=270;r<340;r+=.25){
  const x=Math.round(620+Math.cos(a)*r),y=Math.round(1010+Math.sin(a)*r),p=(y*info.width+x)*info.channels;
  if(data[p]<85&&data[p+1]<90&&data[p+2]<65){
   if(i%2===0){const dx=x-620,dy=y-1010,d=Math.hypot(dx,dy);contour.push([x-dx/d*.75,y-dy/d*.75]);}
   break;
  }
 }
}
if(contour.length!==60)throw Error('Incomplete inner ink contour');
const left=Math.min(...contour.map(p=>p[0])),top=Math.min(...contour.map(p=>p[1]));
const width=Math.max(...contour.map(p=>p[0]))-left,height=Math.max(...contour.map(p=>p[1]))-top;
console.log('Slot-zero percentages (left/top/width/height):',[left/1080*100,top/1920*100,width/1080*100,height/1920*100]);
console.log('Slot-zero image clip-path: polygon('+contour.map(([x,y])=>`${((x-left)/width*100).toFixed(3)}% ${((y-top)/height*100).toFixed(3)}%`).join(',')+')');
console.log('Clube Sol: complete opaque 1080×1920 artwork, uniform scale; two independent alpha stickers. Inner contour measured on prepared raster; photo remains independent.');
