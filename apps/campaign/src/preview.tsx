import { useEffect, useState, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import { PhotoEditor } from '@namarca/editor/photo-editor'
import { eventThemeStyle, parseEvent, type EventConfig } from '@namarca/editor/events'
import '@namarca/editor/styles.css'
import './preview.css'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const privateFile = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i
const query = new URLSearchParams(window.location.search)
const campaignId = query.get('campaignId') ?? ''
const validQuery = uuid.test(campaignId) && !query.has('packageId')

function validate(value: unknown): EventConfig {
  if (!value || typeof value !== 'object' || !('slug' in value) || typeof value.slug !== 'string') throw new Error('Invalid event')
  const event = parseEvent(value, value.slug, { allowEmptyArtworks: true })
  if ([...event.artworks, ...event.stickers].some(material => !privateFile.test(material.file))) throw new Error('Invalid file')
  return event
}

function validateLocalAssets(value: unknown, event: EventConfig): Record<string, string> {
  if (value === undefined) return {}
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('Invalid local assets')
  const files = new Set([...event.artworks, ...event.stickers].map(material => material.file))
  const prefix = `blob:${window.location.origin}/`
  const assets: Record<string, string> = {}
  for (const [file, url] of Object.entries(value)) {
    if (!privateFile.test(file) || !files.has(file) || typeof url !== 'string' || !url.startsWith(prefix) || url.length === prefix.length || /\s/.test(url) || new URL(url).origin !== window.location.origin) throw new Error('Invalid local asset')
    assets[file] = url
  }
  return assets
}

function Preview() {
  const [config, setConfig] = useState<{ event: EventConfig; selectedArtworkId?: string; assetUrls: Record<string, string>; adminTheme: 'dark' | 'light' } | null>(null)
  const [warning, setWarning] = useState(false)
  const failed = !validQuery

  useEffect(() => {
    if (!validQuery) return
    const receive = (message: MessageEvent) => {
      if (message.origin !== window.location.origin || message.source !== window.parent) return
      const data = message.data
      if (!data || typeof data !== 'object' || data.type !== 'namarca:preview' || data.campaignId !== campaignId) return
      try {
        const event = validate(data.event)
        const selectedArtworkId: unknown = data.selectedArtworkId
        if (selectedArtworkId !== undefined && (typeof selectedArtworkId !== 'string' || !event.artworks.some(artwork => artwork.id === selectedArtworkId))) throw new Error('Invalid selection')
        const assetUrls = validateLocalAssets(data.localAssets, event)
        setConfig({ event, selectedArtworkId: selectedArtworkId as string | undefined, assetUrls, adminTheme: data.adminTheme === 'dark' ? 'dark' : 'light' })
        setWarning(false)
      } catch { setWarning(true) }
    }
    window.addEventListener('message', receive)
    window.parent.postMessage({ type: 'namarca:preview-ready', campaignId }, window.location.origin)
    return () => window.removeEventListener('message', receive)
  }, [])

  if (failed) return <main><h1>Prévia indisponível</h1><p role="alert">Não foi possível carregar esta prévia. Confira o endereço e sua sessão administrativa.</p></main>
  return <>
    {warning && <p className="preview-warning" role="alert">Prévia pausada: corrija os campos inválidos. A última configuração válida permanece visível.</p>}
    {!config ? <span className="sr-only" role="status">Aguardando configuração da prévia…</span> :
      <div className="editor-page" data-admin-theme={config.adminTheme} style={eventThemeStyle(config.event) as CSSProperties}>
        <PhotoEditor event={config.event} assetUrls={config.assetUrls} assetBase={`/api/campaigns/${campaignId}/assets`} preferredArtworkId={config.selectedArtworkId} />
      </div>}
  </>
}

createRoot(document.getElementById('root')!).render(<Preview />)
