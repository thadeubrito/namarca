import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import type { Composition } from './composition'
import { canShareFile, exportFilename, exportPNG, exportShareFile } from './export-image'
import { trackPNGGenerated } from './analytics'

// O pai remonta este painel quando a composição muda, invalidando resultados antigos.
export type ExportAction = { save: () => void }
export function ExportPanel({ composition, slug, blocked, actionRef, onWorking }: { composition: Composition; slug: string; blocked: boolean; actionRef?: Ref<ExportAction>; onWorking?: (working: boolean) => void }) {
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')
  const active = useRef(false)
  const pending = useRef(false)
  const cached = useRef<File | null>(null)
  const url = useRef<string | null>(null)
  const shareable = canShareFile(new File([''], 'imagem.png', { type: 'image/png' }))
  useEffect(() => {
    active.current = true
    const resource = url
    return () => { active.current = false; if (resource.current) URL.revokeObjectURL(resource.current) }
  }, [])
  useEffect(() => { onWorking?.(working) }, [working, onWorking])
  const download = async () => {
    if (pending.current || blocked) return
    pending.current = true; setWorking(true); setMessage('')
    try {
      if (!cached.current) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
        if (!active.current) return
        const blob = await exportPNG(composition)
        if (!active.current) return
        cached.current = new File([blob], exportFilename(slug, composition.art.id), { type: 'image/png' })
        trackPNGGenerated(slug, composition)
      }
      if (!url.current) url.current = URL.createObjectURL(cached.current)
      const link = document.createElement('a')
      link.href = url.current; link.download = cached.current.name
      document.body.append(link); link.click(); link.remove()
    } catch {
      if (active.current) setMessage('Não foi possível baixar a imagem. Tente novamente.')
    } finally { pending.current = false; if (active.current) setWorking(false) }
  }
  const share = async () => {
    if (pending.current || blocked) return
    pending.current = true; setWorking(true); setMessage('')
    try {
      // Geração síncrona quando necessário: preserva a ativação do clique no Safari.
      const generated = !cached.current
      if (!cached.current) cached.current = exportShareFile(composition, slug)
      // Chamar share antes da telemetria preserva a ativação do clique no Safari.
      try { await navigator.share({ files: [cached.current] }) }
      finally { if (generated) trackPNGGenerated(slug, composition) }
    } catch (error) {
      if (active.current && !(error instanceof Error && error.name === 'AbortError')) {
        setMessage('Não foi possível compartilhar. Tente novamente.')
      }
    } finally { pending.current = false; if (active.current) setWorking(false) }
  }
  useImperativeHandle(actionRef, () => ({ save: () => { void (shareable ? share() : download()) } }))
  return <div className="export-feedback">
    <p className="export-message" role="status" aria-live="polite">{message}</p>
  </div>
}
