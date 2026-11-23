// Local-only reproducible interior crops. Run in the app container; no AI or network.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const dir=fileURLToPath(new URL('../apps/site/estudos/lima/materials/',import.meta.url));
const crops={artista:[105,280,360,545],tecnologia:[665,125,335,345],financeiro:[620,570,375,350],esporte:[1200,28,280,220],musica:[1190,290,280,185],estudante:[1190,526,280,190],cafe:[1195,770,280,225]};
for(const [name,[left,top,width,height]] of Object.entries(crops)) {
 const info=await sharp(dir+'mouth-sharing-young.webp').extract({left,top,width,height}).webp({quality:94,effort:6}).toFile(dir+`compartilhamento-${name}.webp`);
 console.log(name,info.width,info.height,info.size);
}
