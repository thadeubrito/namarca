// Delivery derivatives only: approved originals and photo geometry remain intact.
// Run in the app container; no network, cropping, generation or source replacement.
import sharp from 'sharp';
import {stat} from 'node:fs/promises';
const base = new URL('../apps/site/estudos/lima/materials/', import.meta.url);
for (const name of ['clube-sol','orbita','adote','ritmo','final']) {
  const source = new URL(`${name}-story-approved.webp`, base);
  const destination = new URL(`${name}-story-display.webp`, base);
  await sharp(source.pathname).resize({width:720,withoutEnlargement:true}).webp({quality:86,smartSubsample:true,effort:6}).toFile(destination.pathname);
  console.log(name, (await stat(source)).size, '→', (await stat(destination)).size);
}
