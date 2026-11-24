// Download stock photographs only. Run inside the app container with an authorized
// source manifest argument. No AI, participant photos, uploads or runtime network.
// Manifest: [{ name, image, position? }]; source/credit/license live in NOTICE.txt.
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const entries=JSON.parse(await readFile(process.argv[2],'utf8'));
const dir=fileURLToPath(new URL('../apps/site/estudos/lima/materials/',import.meta.url));
const sizes=[[360,545],[335,345],[375,350],[280,220],[280,185],[280,190],[280,225]];
if(entries.length!==7)throw new Error('Expected seven licensed photographs');
for(const [index,entry] of entries.entries()) {
 if(!/^[a-z0-9-]+$/.test(entry.name))throw new Error('Invalid filename');
 const url=new URL(entry.image);
 if(url.protocol!=='https:'||!['images.unsplash.com','images.pexels.com'].includes(url.hostname))throw new Error('Unsupported stock host');
 const response=await fetch(url);
 if(!response.ok)throw new Error(`Stock download failed: ${response.status}`);
 const [width,height]=sizes[index];
 const info=await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize(width*2,height*2,{fit:'cover',position:entry.position??'centre'}).webp({quality:88,effort:6}).toFile(dir+`compartilhamento-real-${entry.name}.webp`);
 console.log(entry.name,info.width,info.height,info.size);
}
