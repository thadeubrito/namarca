import {readFile,writeFile} from 'node:fs/promises';
export async function applyGeometry(g){
const file='/app/apps/site/estudos/lima/materials.css';
const original=await readFile(file,'utf8');
await writeFile(file,original.split('\n/* Ritmo de Rua:')[0]+`
/* Ritmo de Rua: approved 2:3 original preserved, edge texture extended to Stories.
   Rounded aperture: 1440 measured rays simplified by chord error, 60 vertices. */
.lima .hero .scene{--perspective-photo-3-left:${g.left}%;--perspective-photo-3-top:${g.top}%;--perspective-photo-3-width:${g.width}%;--perspective-photo-3-height:${g.height}%;--perspective-photo-3-radius:0%}
.lima .hero .frame.variant-3{background-image:url('/estudos/lima/materials/ritmo-story-approved.webp');background-color:#452080!important;background-size:100% 100%;background-blend-mode:normal}
.lima .hero .frame.variant-3::before,.lima .hero .frame.variant-3::after{content:none}
.lima .hero .photo[data-shape='3']{background:transparent}
.lima .hero .photo[data-shape='3'] img{position:absolute;inset:0;width:100%;height:100%;object-position:50% 20%;clip-path:polygon(${g.points})}
.lima .hero .sticker[data-set='3']{background:transparent center/contain no-repeat;filter:drop-shadow(0 2px 2px #15160625)}
.lima .hero .sticker[data-set='3']:nth-child(odd){background-image:url('/estudos/lima/materials/ritmo-sticker-shoe.webp');left:7%!important;top:83%!important;width:18%!important;height:6.75%!important;rotate:-8deg}
.lima .hero .sticker[data-set='3']:nth-child(even){background-image:url('/estudos/lima/materials/ritmo-sticker-motion.webp');left:80%!important;top:13%!important;width:13%!important;height:4.875%!important;rotate:8deg}
.lima .hero .sticker[data-set='3']::after{content:none!important}
`);
}
