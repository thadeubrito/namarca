export interface Size { width: number; height: number }
export interface Rect extends Size { x: number; y: number }
export interface Transform { x: number; y: number; scale: number }

export function transparencyBounds(data: Uint8ClampedArray, width: number, height: number): Rect {
  let left = width; let top = height; let right = -1; let bottom = -1
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] < 255) {
      left = Math.min(left, x); top = Math.min(top, y)
      right = Math.max(right, x); bottom = Math.max(bottom, y)
    }
  }
  if (right < 0) throw new Error('A arte não possui espaço transparente para a foto.')
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}
export const coverScale = (photo: Size, area: Size) => Math.max(area.width / photo.width, area.height / photo.height)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
/** Mantém a foto cobrindo a área retangular que ela ocupa. */
export function constrain(photo: Size, reference: Rect, transform: Transform): Transform {
  const scale = Math.max(coverScale(photo, reference), transform.scale)
  return {
    scale,
    x: clamp(transform.x, reference.x + reference.width - photo.width * scale, reference.x),
    y: clamp(transform.y, reference.y + reference.height - photo.height * scale, reference.y),
  }
}
export function initialFrame(photo: Size, reference: Rect): Transform {
  const scale = coverScale(photo, reference)
  return constrain(photo, reference, {
    scale, x: reference.x + (reference.width - photo.width * scale) / 2,
    y: reference.y + (reference.height - photo.height * scale) / 2,
  })
}
export function zoomFrame(photo: Size, reference: Rect, current: Transform, scale: number, maximum?: number): Transform {
  const initial = initialFrame(photo, reference)
  const next = clamp(scale, coverScale(photo, reference), maximum ?? initial.scale * 4)
  const cx = reference.x + reference.width / 2; const cy = reference.y + reference.height / 2
  return constrain(photo, reference, { scale: next, x: cx - (cx - current.x) * next / current.scale, y: cy - (cy - current.y) * next / current.scale })
}
export function originalDelta(dx: number, dy: number, displayScale: number) {
  return { x: dx / displayScale, y: dy / displayScale }
}
