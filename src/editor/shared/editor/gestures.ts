import { initialFrame, constrain, coverScale } from './framing'
import { photoSize, updateFrame, updateSticker, type Composition } from './composition'
export interface Point { x: number; y: number }
export function gestureGeometry(points: Point[]) {
  const a = points[0]; const b = points[1] ?? a
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(b.x - a.x, b.y - a.y), angle: Math.atan2(b.y - a.y, b.x - a.x) }
}
export const normalizeAngle = (angle: number) => ((angle + 180) % 360 + 360) % 360 - 180
export function transformGesture(c: Composition, target: number | null, from: Point[], to: Point[], maxPhotoScale?: number): Composition {
  if (!from.length || from.length !== to.length) return c
  const a = gestureGeometry(from); const b = gestureGeometry(to)
  const multi = from.length > 1 && a.distance > 1 && b.distance > 1
  const ratio = multi ? b.distance / a.distance : 1
  const angle = multi ? normalizeAngle((b.angle - a.angle) * 180 / Math.PI) : 0
  if (target !== null) {
    const s = c.stickers.find((s) => s.id === target)
    if (!s) return c
    const side = Math.min(c.art.width, c.art.height) / Math.max(s.image.naturalWidth, s.image.naturalHeight)
    const scale = Math.max(side * .05, Math.min(side * 2, s.scale * ratio))
    const factor = scale / s.scale; const rad = angle * Math.PI / 180
    const x = (s.x - a.x) * factor; const y = (s.y - a.y) * factor
    return updateSticker(c, target, { x: b.x + x * Math.cos(rad) - y * Math.sin(rad), y: b.y + x * Math.sin(rad) + y * Math.cos(rad), scale, angle: normalizeAngle(s.angle + angle) })
  }
  if (!c.photo) return c
  const size = photoSize(c.photo)
  const max = maxPhotoScale ?? Math.max(c.frame.scale, initialFrame(size, c.art.reference).scale * 4)
  const scale = Math.max(coverScale(size, c.art.reference), Math.min(max, c.frame.scale * ratio))
  return updateFrame(c, constrain(size, c.art.reference, { scale, x: b.x + (c.frame.x - a.x) * scale / c.frame.scale, y: b.y + (c.frame.y - a.y) * scale / c.frame.scale }))
}
