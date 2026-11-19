import { useEffect, useState, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import { PhotoEditor } from '../../../packages/editor/src/editor/PhotoEditor'
import { eventThemeStyle, parseEvent, type EventConfig } from '../../../packages/editor/src/events/events'
import '../../../packages/editor/src/styles.css'

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

function Preview() {
  const [config, setConfig] = useState<{ event: EventConfig; selectedArtworkId?: string } | null>(null)
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
        setConfig({ event, selectedArtworkId: selectedArtworkId as string | undefined })
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
    {!config ? <p role="status">Aguardando configuração da prévia…</p> :
      <div className="editor-page" style={eventThemeStyle(config.event) as CSSProperties}>
        {config.event.artworks.length ? <PhotoEditor event={config.event} assetBase={`/api/campaigns/${campaignId}/assets`} preferredArtworkId={config.selectedArtworkId} /> : <p>Adicione uma arte PNG para experimentar o editor.</p>}
      </div>}
  </>
}

createRoot(document.getElementById('root')!).render(<Preview />)
