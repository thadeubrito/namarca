import type { Artwork } from '@/lib/campaigns/campaigns'
import { constrain, coverScale, initialFrame, type Rect, type Transform } from './framing'

export interface Sticker {
  id: number; materialId: string; name: string; image: HTMLImageElement
  x: number; y: number; scale: number; angle: number
}
export interface Composition {
  art: Artwork; image: HTMLImageElement; bounds: Rect
  photo: HTMLImageElement | null; frame: Transform; stickers: Sticker[]
}
export interface History<T> { past: T[]; present: T; future: T[] }
export function sameComposition(a: Composition, b: Composition): boolean {
  return a.art === b.art && a.photo === b.photo && a.frame.x === b.frame.x && a.frame.y === b.frame.y && a.frame.scale === b.frame.scale && a.stickers.length === b.stickers.length && a.stickers.every((s, i) => {
    const other = b.stickers[i]
    return s.id === other.id && s.x === other.x && s.y === other.y && s.scale === other.scale && s.angle === other.angle
  })
}
export function commit<T>(history: History<T>, next: T): History<T> {
  return next === history.present ? history : { past: [...history.past, history.present], present: next, future: [] }
}
export function undo<T>(h: History<T>): History<T> {
  return h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h
}
export function redo<T>(h: History<T>): History<T> {
  return h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h
}
export const photoSize = (photo: HTMLImageElement) => ({ width: photo.naturalWidth, height: photo.naturalHeight })
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
export function limitSticker(s: Sticker, art: Artwork): Sticker {
  const side = Math.min(art.width, art.height)
  const longest = Math.max(s.image.naturalWidth, s.image.naturalHeight)
  return { ...s, x: clamp(s.x, 0, art.width), y: clamp(s.y, 0, art.height), scale: clamp(s.scale, side * .05 / longest, side * 2 / longest) }
}
export function hitSticker(s: Sticker, x: number, y: number) {
  const a = -s.angle * Math.PI / 180; const dx = x - s.x; const dy = y - s.y
  return Math.abs(dx * Math.cos(a) - dy * Math.sin(a)) <= s.image.naturalWidth * s.scale / 2 && Math.abs(dx * Math.sin(a) + dy * Math.cos(a)) <= s.image.naturalHeight * s.scale / 2
}
export function updateSticker(c: Composition, id: number, patch: Partial<Pick<Sticker, 'x' | 'y' | 'scale' | 'angle'>>): Composition {
  const stickers = c.stickers.map((s) => s.id === id ? limitSticker({ ...s, ...patch }, c.art) : s)
  if (stickers.every((s, i) => (['x', 'y', 'scale', 'angle'] as const).every((key) => s[key] === c.stickers[i][key]))) return c
  return { ...c, stickers }
}
export function updateFrame(c: Composition, frame: Transform): Composition {
  return c.frame.x === frame.x && c.frame.y === frame.y && c.frame.scale === frame.scale ? c : { ...c, frame }
}
const sameReference = (a: Artwork['reference'], b: Artwork['reference']) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
const sameArtwork = (a: Artwork, b: Artwork) => a.id === b.id && a.name === b.name && a.file === b.file && a.width === b.width && a.height === b.height && sameReference(a.reference, b.reference)

/** Atualiza metadados da arte sem recarregar o bitmap nem tocar nos stickers. */
export function syncArtworkReference(c: Composition, artwork: Artwork, reframe = true): Composition {
  if (c.art.id !== artwork.id || sameArtwork(c.art, artwork)) return c
  const referenceChanged = !sameReference(c.art.reference, artwork.reference)
  const frame = referenceChanged && reframe && c.photo
    ? initialFrame(photoSize(c.photo), artwork.reference)
    : c.frame
  return { ...c, art: artwork, bounds: artwork.reference, frame }
}

/** Sincroniza também snapshots antigos para undo/redo não ressuscitar a referência anterior. */
export function syncHistoryArtwork(h: History<Composition>, artwork: Artwork): History<Composition> {
  const past = h.past.map((item) => syncArtworkReference(item, artwork, false))
  const present = syncArtworkReference(h.present, artwork)
  const future = h.future.map((item) => syncArtworkReference(item, artwork, false))
  if (past.every((item, index) => item === h.past[index]) && present === h.present && future.every((item, index) => item === h.future[index])) return h
  return { past, present, future }
}

export function changeArt(c: Composition, art: Artwork, image: HTMLImageElement, bounds: Rect): Composition {
  if (c.art.id === art.id) return c
  void bounds
  const boundsForPhoto = art.reference
  const rx = art.width / c.art.width; const ry = art.height / c.art.height; const ratio = Math.min(rx, ry)
  let frame = c.frame
  if (c.photo) {
    const size = photoSize(c.photo)
    const cx = (frame.x + size.width * frame.scale / 2) * rx
    const cy = (frame.y + size.height * frame.scale / 2) * ry
    const scale = Math.max(frame.scale * ratio, coverScale(size, boundsForPhoto))
    frame = constrain(size, boundsForPhoto, { scale, x: cx - size.width * scale / 2, y: cy - size.height * scale / 2 })
    if (rx === 1 && ry === 1 && scale === c.frame.scale) frame = constrain(size, boundsForPhoto, c.frame)
  }
  return { ...c, art, image, bounds: boundsForPhoto, frame, stickers: c.stickers.map((s) => limitSticker({ ...s, x: s.x * rx, y: s.y * ry, scale: s.scale * ratio }, art)) }
}
