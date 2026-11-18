'use client'
import { useRef, useState, type PointerEvent } from 'react'
import type { Artwork } from './shared/events/events'
type Point = { x: number; y: number }

export type ReferenceHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

type Reference = Artwork['reference']

export function clampReference(reference: Reference, width: number, height: number): Reference {
  const nextWidth = Math.max(1, Math.min(width, Math.round(reference.width)))
  const nextHeight = Math.max(1, Math.min(height, Math.round(reference.height)))
  return { x: Math.max(0, Math.min(width - nextWidth, Math.round(reference.x))), y: Math.max(0, Math.min(height - nextHeight, Math.round(reference.y))), width: nextWidth, height: nextHeight }
}

export function resizeReference(start: Reference, handle: ReferenceHandle, point: Point, canvasWidth: number, canvasHeight: number): Reference {
  let left = start.x; let right = start.x + start.width; let top = start.y; let bottom = start.y + start.height
  if (handle.includes('w')) left = Math.max(0, Math.min(right - 1, point.x))
  if (handle.includes('e')) right = Math.min(canvasWidth, Math.max(left + 1, point.x))
  if (handle.includes('n')) top = Math.max(0, Math.min(bottom - 1, point.y))
  if (handle.includes('s')) bottom = Math.min(canvasHeight, Math.max(top + 1, point.y))
  return clampReference({ x: left, y: top, width: right - left, height: bottom - top }, canvasWidth, canvasHeight)
}

export function ReferenceCanvas({ assetURL, artwork, onChange }: { assetURL: string; artwork: Artwork; onChange: (reference: Reference) => void }) {
  const image = useRef<HTMLImageElement>(null)
  const action = useRef<{ mode: 'draw' | 'move' | 'resize'; handle?: ReferenceHandle; origin: Point; start: Reference } | null>(null)
  const [drawing, setDrawing] = useState(false)
  const reference = artwork.reference
  const point = (event: PointerEvent<HTMLDivElement>): Point => {
    const rect = image.current!.getBoundingClientRect()
    return { x: Math.max(0, Math.min(artwork.width, (event.clientX - rect.left) * artwork.width / rect.width)), y: Math.max(0, Math.min(artwork.height, (event.clientY - rect.top) * artwork.height / rect.height)) }
  }
  const calculate = (current: Point) => {
    const currentAction = action.current!
    if (currentAction.mode === 'resize') return resizeReference(currentAction.start, currentAction.handle!, current, artwork.width, artwork.height)
    if (currentAction.mode === 'move') return clampReference({ ...currentAction.start, x: currentAction.start.x + current.x - currentAction.origin.x, y: currentAction.start.y + current.y - currentAction.origin.y }, artwork.width, artwork.height)
    return clampReference({ x: Math.min(currentAction.origin.x, current.x), y: Math.min(currentAction.origin.y, current.y), width: Math.abs(current.x - currentAction.origin.x), height: Math.abs(current.y - currentAction.origin.y) }, artwork.width, artwork.height)
  }
  const stop = (event: PointerEvent<HTMLDivElement>) => {
    if (!action.current) return
    onChange(calculate(point(event))); action.current = null; setDrawing(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const move = (event: PointerEvent<HTMLDivElement>) => { if (action.current) onChange(calculate(point(event))) }
  const begin = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const p = point(event); const target = event.target as HTMLElement
    const inside = p.x >= reference.x && p.x <= reference.x + reference.width && p.y >= reference.y && p.y <= reference.y + reference.height
    action.current = { mode: inside && target.dataset.reference === 'box' ? 'move' : 'draw', origin: p, start: reference }
    event.currentTarget.setPointerCapture(event.pointerId); setDrawing(true)
  }
  const beginResize = (event: PointerEvent<HTMLButtonElement>, handle: ReferenceHandle) => {
    event.preventDefault(); event.stopPropagation()
    const canvas = event.currentTarget.closest('.local-reference-canvas') as HTMLDivElement
    const p = point(event as unknown as PointerEvent<HTMLDivElement>)
    action.current = { mode: 'resize', handle, origin: p, start: reference }
    canvas.setPointerCapture(event.pointerId); setDrawing(true)
  }
  const handles: Array<[ReferenceHandle, string]> = [['nw', 'Alça superior esquerda'], ['n', 'Alça superior'], ['ne', 'Alça superior direita'], ['e', 'Alça direita'], ['se', 'Alça inferior direita'], ['s', 'Alça inferior'], ['sw', 'Alça inferior esquerda'], ['w', 'Alça esquerda']]
  const left = `${reference.x / artwork.width * 100}%`; const top = `${reference.y / artwork.height * 100}%`
  return <div className="local-reference-canvas" style={{ aspectRatio: `${artwork.width} / ${artwork.height}` }} onPointerDown={begin} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
    <img ref={image} src={assetURL} alt={`Prévia da arte ${artwork.name}`} draggable={false} />
    <div className="local-reference-box" data-reference="box" style={{ left, top, width: `${reference.width / artwork.width * 100}%`, height: `${reference.height / artwork.height * 100}%`, opacity: drawing ? .8 : 1 }}><span>Área da foto</span>
      {handles.map(([handle, label]) => <button key={handle} type="button" className={`local-reference-handle handle-${handle}`} aria-label={label} onPointerDown={(event) => beginResize(event, handle)} />)}
    </div>
  </div>
}
