import { useLayoutEffect, useRef, type RefObject } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export interface StickerDragVisual {
  id: number
  image: HTMLImageElement
  x: number
  y: number
  width: number
  height: number
  angle: number
  returning?: { x: number; y: number }
}

// Usa a imagem já decodificada: nenhum upload, nova leitura ou URL temporária.
export function StickerDragPreview({ visual, overTrash, trash, onReturnComplete }: {
  visual: StickerDragVisual; overTrash: boolean; trash: RefObject<HTMLDivElement | null>; onReturnComplete: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useReducedMotion()
  const target = overTrash ? trash.current?.getBoundingClientRect() : undefined
  const radians = visual.angle * Math.PI / 180
  const rotatedWidth = Math.abs(Math.cos(radians)) * visual.width + Math.abs(Math.sin(radians)) * visual.height
  const rotatedHeight = Math.abs(Math.sin(radians)) * visual.width + Math.abs(Math.cos(radians)) * visual.height
  // The bounding box diagonal fits inside the circle, leaving room for its border.
  const scale = target ? Math.min(1, Math.max(0, Math.min(target.width, target.height) - 12) / Math.hypot(rotatedWidth, rotatedHeight)) : 1
  const compact = !!target
  useLayoutEffect(() => {
    const element = canvas.current!
    const ratio = window.devicePixelRatio || 1
    element.width = Math.max(1, Math.ceil(visual.width * ratio))
    element.height = Math.max(1, Math.ceil(visual.height * ratio))
    const context = element.getContext('2d')
    context?.drawImage(visual.image, 0, 0, element.width, element.height)
  }, [visual.image, visual.width, visual.height])
  return <div className="sticker-drag-anchor" aria-hidden="true" style={{ left: visual.x, top: visual.y }}>
    <motion.canvas ref={canvas} className="sticker-drag-preview" data-sticker-id={visual.id} data-compact={compact}
      initial={false}
      animate={{ x: visual.returning ? visual.returning.x - visual.x : target ? target.left + target.width / 2 - visual.x : 0, y: visual.returning ? visual.returning.y - visual.y : target ? target.top + target.height / 2 - visual.y : 0, scale }}
      onAnimationComplete={() => { if (visual.returning) onReturnComplete() }}
      transition={{ duration: reducedMotion ? 0 : 0.18, ease: 'easeOut', x: { duration: (compact || visual.returning) && !reducedMotion ? 0.18 : 0 }, y: { duration: (compact || visual.returning) && !reducedMotion ? 0.18 : 0 } }}
      style={{ left: -visual.width / 2, top: -visual.height / 2, width: visual.width, height: visual.height, rotate: visual.angle }} />
  </div>
}
