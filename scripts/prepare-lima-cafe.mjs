// Local derivatives only. No AI calls; inputs are the approved text-only café artwork.
import sharp from 'sharp';
const dest='/app/apps/site/estudos/lima/materials';
const story=sharp('/tmp/cafe-story.png');
const meta=await story.metadata();
if(meta.width!==1080||meta.height!==1920)throw Error('Stories dimensions');
const pixel=await story.clone().extract({left:538,top:1046,width:1,height:1}).raw().toBuffer();
if(pixel[0]<250||pixel[1]<250||pixel[2]<250)throw Error('Window center is not pale');
await story.webp({quality:93,smartSubsample:true}).toFile(`${dest}/cafe-story-approved.webp`);
for(const [name,rect] of [['cup',{left:890,top:50,width:520,height:490}],['croissant',{left:880,top:555,width:545,height:365}]]){
 const {data,info}=await sharp('/tmp/cafe-board.png').extract(rect).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const seen=new Uint8Array(info.width*info.height),queue=[];
 const add=i=>{const p=i*4;const lo=Math.min(data[p],data[p+1],data[p+2]),hi=Math.max(data[p],data[p+1],data[p+2]);if(!seen[i]&&hi-lo<15&&lo<254){seen[i]=1;queue.push(i);}};
 for(let x=0;x<info.width;x++){add(x);add((info.height-1)*info.width+x);}
 for(let y=0;y<info.height;y++){add(y*info.width);add(y*info.width+info.width-1);}
 for(let q=0;q<queue.length;q++){const i=queue[q],x=i%info.width;if(x)add(i-1);if(x<info.width-1)add(i+1);if(i>=info.width)add(i-info.width);if(i<seen.length-info.width)add(i+info.width);}
 // Exterior neutral backdrop is removed, retaining the original shadow as neutral alpha.
 // The closed white die-cut border protects the illustration and peeled corner.
 for(let i=0;i<seen.length;i++)if(seen[i]){const p=i*4,lum=(data[p]+data[p+1]+data[p+2])/3;const shadow=Math.max(0,235-lum);data[p]=data[p+1]=data[p+2]=0;data[p+3]=shadow>9?Math.round(shadow/235*255):0;}
 // Constrain extraction to the illustrated die-cut silhouette, not disconnected pale backdrop.
 const path=name==='cup'
 ? 'M 253 24 C 235 17 235 42 250 58 C 269 87 239 76 215 87 C 174 100 168 131 180 148 C 99 153 92 177 99 225 L 107 282 C 62 300 39 323 46 359 C 55 414 144 447 231 449 C 275 450 337 456 373 435 L 451 382 C 472 357 469 338 456 326 C 493 300 502 274 489 236 C 479 204 440 180 396 195 C 368 163 335 151 332 151 C 356 137 357 97 329 82 L 314 69 C 309 35 280 20 253 24 Z'
 : 'M 38 254 C 32 223 53 185 72 165 C 68 134 105 102 143 87 C 163 62 194 64 204 52 C 227 18 267 26 291 32 C 315 20 339 48 346 59 C 373 62 393 78 399 92 C 433 100 450 132 454 147 C 477 169 493 207 500 221 L 490 237 L 468 239 L 431 276 C 403 279 395 267 377 269 C 349 280 303 277 275 281 C 242 293 219 281 198 287 C 168 307 115 324 88 313 C 60 319 46 292 38 254 Z';
 const mask=Buffer.from(`<svg width="${info.width}" height="${info.height}"><path d="${path}" fill="white" stroke="white" stroke-width="14" stroke-linejoin="round"/></svg>`);
 const masked=await sharp(data,{raw:info}).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
 await sharp(masked).trim({background:'#00000000',threshold:1}).webp({lossless:true}).toFile(`${dest}/cafe-sticker-${name}.webp`);
}
console.log('Café: 1080×1920 checked, white center checked; two alpha cutouts, lossless sticker colors.');
