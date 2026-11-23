// Run in the app container. Input is the approved text-only AI board, never a photo.
import sharp from 'sharp';
import { mkdir, copyFile } from 'node:fs/promises';
const dest='/app/apps/site/estudos/lima/materials';
await mkdir(dest,{recursive:true});
const input=process.argv[2] || '/tmp/approved-printcraft.png';
// Edge-connected paper removal only: retain offwhite ink wear inside the cutouts.
async function cut(name,rect,width){
 const {data,info}=await sharp(input).extract(rect).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const seen=new Uint8Array(info.width*info.height),queue=[];
 const paper=i=>{const p=i*4;return data[p]>205&&data[p+1]>195&&data[p+2]>170;};
 const add=i=>{if(!seen[i]&&paper(i)){seen[i]=1;queue.push(i);}};
 for(let x=0;x<info.width;x++){add(x);add((info.height-1)*info.width+x);}
 for(let y=0;y<info.height;y++){add(y*info.width);add(y*info.width+info.width-1);}
 for(let q=0;q<queue.length;q++){const i=queue[q],x=i%info.width;data[i*4+3]=0;if(x)add(i-1);if(x<info.width-1)add(i+1);if(i>=info.width)add(i-info.width);if(i<seen.length-info.width)add(i+info.width);}
 await sharp(data,{raw:info}).resize({width}).webp({quality:88,alphaQuality:100}).toFile(`${dest}/${name}.webp`);
}
await cut('torn-tape',{left:8,top:98,width:902,height:296},720);
await cut('coral-seal',{left:915,top:5,width:580,height:505},420);
await cut('angular-cuts',{left:775,top:512,width:750,height:492},600);
await sharp(input).extract({left:49,top:510,width:676,height:451}).resize(700).webp({quality:88}).toFile(`${dest}/halftone-paper.webp`);
await copyFile('/tmp/stock.webp',`${dest}/michael-dam-portrait.webp`);
console.log('Prepared approved print textures and local stock derivative.');
