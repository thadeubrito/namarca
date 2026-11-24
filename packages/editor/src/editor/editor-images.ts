import type { Artwork } from '../campaigns/campaigns'

export async function decodeImage(src: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.src = src
  await image.decode()
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('Imagem vazia')
  return image
}
export async function readPhoto(file: File): Promise<HTMLImageElement> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
  const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  if (!jpeg && !png && !webp) throw new Error('Formato não suportado. Converta a foto para JPEG, PNG ou WebP; HEIC/HEIF não é suportado.')
  const url = URL.createObjectURL(file)
  try {
    let image: HTMLImageElement
    try { image = await decodeImage(url) }
    catch { throw new Error('Não foi possível ler a foto. Escolha outro arquivo JPEG, PNG ou WebP.') }
    if (!jpeg) {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight
      try {
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Não foi possível ler a foto neste navegador.')
        context.drawImage(image, 0, 0)
        // Conferência por linha evita outra cópia integral da foto em memória.
        for (let y = 0; y < canvas.height; y++) {
          const row = context.getImageData(0, y, canvas.width, 1).data
          for (let i = 3; i < row.length; i += 4) {
            if (row[i] !== 255) throw new Error('A foto possui transparência. Escolha uma foto sem fundo transparente para preencher os vazados.')
          }
        }
      } finally { canvas.width = 0; canvas.height = 0 }
    }
    return image
  } finally { URL.revokeObjectURL(url) }
}
export async function readArtwork(src: string, art: Artwork) {
  const image = await decodeImage(src)
  if (image.naturalWidth !== art.width || image.naturalHeight !== art.height) throw new Error('Dimensões da arte inválidas')
  // A referência configurada é o contrato da área ocupada pela foto. O alpha
  // da arte continua responsável apenas pelo que fica visível sobre ela.
  return { image, bounds: art.reference }
}
