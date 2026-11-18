import type { Composition } from './composition'

export function drawComposition(ctx: CanvasRenderingContext2D, c: Composition) {
  if (c.photo) {
    ctx.save()
    try {
      ctx.beginPath()
      ctx.rect(c.art.reference.x, c.art.reference.y, c.art.reference.width, c.art.reference.height)
      ctx.clip()
      ctx.drawImage(c.photo, c.frame.x, c.frame.y, c.photo.naturalWidth * c.frame.scale, c.photo.naturalHeight * c.frame.scale)
    } finally { ctx.restore() }
  }
  ctx.drawImage(c.image, 0, 0, c.art.width, c.art.height)
  for (const sticker of c.stickers) {
    ctx.save()
    try {
      ctx.translate(sticker.x, sticker.y)
      ctx.rotate(sticker.angle * Math.PI / 180)
      ctx.scale(sticker.scale, sticker.scale)
      ctx.drawImage(sticker.image, -sticker.image.naturalWidth / 2, -sticker.image.naturalHeight / 2)
    } finally { ctx.restore() }
  }
}
export async function exportPNG(c: Composition): Promise<Blob> {
  const canvas = document.createElement('canvas')
  try {
    canvas.width = c.art.width; canvas.height = c.art.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponível')
    drawComposition(ctx, c)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob && blob.size && blob.type === 'image/png') resolve(blob)
        else reject(new Error('Falha ao gerar PNG'))
      }, 'image/png')
    })
  } finally { canvas.width = 0; canvas.height = 0 }
}
// O compartilhamento precisa receber o arquivo ainda na ativação do clique.
export function exportShareFile(c: Composition, slug: string): File {
  const canvas = document.createElement('canvas')
  try {
    canvas.width = c.art.width; canvas.height = c.art.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponível')
    drawComposition(ctx, c)
    const data = canvas.toDataURL('image/png')
    if (!data.startsWith('data:image/png;base64,')) throw new Error('Falha ao gerar imagem')
    const binary = atob(data.split(',')[1])
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new File([bytes], exportFilename(slug, c.art.id), { type: 'image/png' })
  } finally { canvas.width = 0; canvas.height = 0 }
}

export function exportFilename(slug: string, artId: string) {
  const clean = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'imagem'
  return `${clean(slug)}-${clean(artId)}.png`
}
export function canShareFile(file: File) {
  try { return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }) }
  catch { return false }
}
