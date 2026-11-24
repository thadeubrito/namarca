import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react'
import { Stage, Layer, Group, Image as CanvasImage, Rect as CanvasRect } from 'react-konva'
import { themeDefaults, type Artwork, type CampaignConfig, type Material } from '../campaigns/campaigns'
import { initialFrame } from './framing'
import { decodeImage, readArtwork, readPhoto } from './editor-images'
import { LoadingIndicator } from './LoadingIndicator'
import { ExportPanel, type ExportAction } from './ExportPanel'
import { trackEditingStarted } from '../analytics'
import { EditorIcon, EditorWorkspace, type EditorTool } from './EditorWorkspace'
import { StickerDragPreview, type StickerDragVisual } from './StickerDragPreview'
import { transformGesture, type Point } from './gestures'
import { changeArt, commit, hitSticker, photoSize, redo, sameComposition, syncArtworkReference, syncHistoryArtwork, undo, type Composition, type History } from './composition'

function Thumbnail({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false)
  return failed ? <span role="status">Material indisponível: {name}</span> : <img src={src} alt={name} onError={() => setFailed(true)} />
}

function EditorCanvas({ c, selected, select, selectionColor, blocked, start, preview, finish, cancel, trash, drag, dragVisual, showDrag }: {
  c: Composition; selected: number | null; select: (id: number | null) => void; selectionColor: string; blocked: boolean
  start: () => void; preview: (c: Composition) => void; finish: () => void; cancel: () => void
  trash?: RefObject<HTMLDivElement | null>; drag?: (active: boolean, over: boolean) => void
  dragVisual?: StickerDragVisual | null; showDrag?: (visual: StickerDragVisual | null) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState({ width: 0, height: 0 })
  const width = available.height ? Math.min(available.width, available.height * c.art.width / c.art.height) : available.width
  const gesture = useRef<{ points: Map<number, Point>; base: Point[]; c: Composition; latest: Composition; sticker: number | null; maximum: number; origin: Point; moved: boolean; multi: boolean } | null>(null)
  const ratio = width / c.art.width
  useEffect(() => {
    const element = host.current!
    const container = element.parentElement!
    const observer = new ResizeObserver(([entry]) => setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(container)
    return () => observer.disconnect()
  }, [])
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if ((!gesture.current && blocked) || e.button !== 0 || !ratio) return
    const rect = e.currentTarget.getBoundingClientRect()
    const point = { x: (e.clientX - rect.left) / ratio, y: (e.clientY - rect.top) / ratio }
    const existing = gesture.current
    if (existing) {
      if (existing.points.size >= 2) return
      e.currentTarget.setPointerCapture(e.pointerId)
      existing.multi = true; drag?.(false, false); showDrag?.(null)
      existing.points.set(e.pointerId, point)
      existing.base = [...existing.points.values()]; existing.c = existing.latest
      return
    }
    const sticker = [...c.stickers].reverse().find((s) => hitSticker(s, point.x, point.y))?.id ?? null
    select(sticker)
    if (sticker === null && !c.photo) return
    e.currentTarget.setPointerCapture(e.pointerId)
    start(); gesture.current = { origin: { x: e.clientX, y: e.clientY }, moved: false, multi: false, points: new Map([[e.pointerId, point]]), base: [point], c, latest: c, sticker, maximum: c.photo ? Math.max(c.frame.scale, initialFrame(photoSize(c.photo), c.art.reference).scale * 4) : 1 }
  }
  const over = (x: number, y: number) => {
    const target = trash?.current
    if (!target || target.hidden) return false
    const rect = target.getBoundingClientRect()
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (!g || !g.points.has(e.pointerId)) return
    const rect = e.currentTarget.getBoundingClientRect()
    g.points.set(e.pointerId, { x: (e.clientX - rect.left) / ratio, y: (e.clientY - rect.top) / ratio })
    g.latest = transformGesture(g.c, g.sticker, g.base, [...g.points.values()], g.maximum)
    preview(g.latest)
    if (g.sticker !== null && !g.multi) {
      g.moved ||= Math.hypot(e.clientX - g.origin.x, e.clientY - g.origin.y) >= 6
      drag?.(g.moved, g.moved && over(e.clientX, e.clientY))
      const sticker = g.c.stickers.find((s) => s.id === g.sticker)
      if (g.moved && sticker) showDrag?.({
        id: sticker.id, image: sticker.image,
        x: rect.left + sticker.x * ratio + e.clientX - g.origin.x,
        y: rect.top + sticker.y * ratio + e.clientY - g.origin.y,
        width: sticker.image.naturalWidth * sticker.scale * ratio,
        height: sticker.image.naturalHeight * sticker.scale * ratio, angle: sticker.angle,
      })
    }
  }
  const stop = (e: PointerEvent<HTMLDivElement>, abort = false) => {
    const g = gesture.current
    if (!g?.points.has(e.pointerId)) return
    if (abort) {
      gesture.current = null; drag?.(false, false); showDrag?.(null); cancel()
      for (const id of g.points.keys()) if (e.currentTarget.hasPointerCapture(id)) e.currentTarget.releasePointerCapture(id)
      return
    }
    g.points.delete(e.pointerId)
    if (g.points.size) { g.base = [...g.points.values()]; g.c = g.latest }
    else {
      const inTrash = over(e.clientX, e.clientY)
      const rect = e.currentTarget.getBoundingClientRect()
      const outside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom
      if (g.sticker !== null && !g.multi && g.moved && outside && !inTrash) {
        const original = g.c.stickers.find((s) => s.id === g.sticker)
        gesture.current = null; drag?.(false, false); cancel()
        if (original && dragVisual) showDrag?.({ ...dragVisual, returning: { x: rect.left + original.x * ratio, y: rect.top + original.y * ratio } })
        else showDrag?.(null)
        return
      }
      if (g.sticker !== null && !g.multi && g.moved && inTrash) {
        preview({ ...g.latest, stickers: g.latest.stickers.filter((s) => s.id !== g.sticker) }); select(null)
      }
      gesture.current = null; drag?.(false, false); showDrag?.(null); finish()
    }
  }
  const s = c.stickers.find((s) => s.id === selected)
  return <>
    <p id="canvas-help">Toque em um sticker para selecioná-lo e arraste para mover. Use dois dedos para zoom da foto ou tamanho e rotação do sticker. A arte permanece fixa.</p>
    <div ref={host} className={`composition ${c.photo || c.stickers.length ? 'has-photo' : ''}`} style={{ aspectRatio: `${c.art.width} / ${c.art.height}`, ...(available.height ? { width, height: c.art.height * ratio } : {}) }}
      data-drag-preview={dragVisual?.id} role="img" aria-label={`Composição com a arte ${c.art.name}${c.photo ? ' e sua foto' : ', sem foto'}`} aria-describedby="canvas-help"
      onPointerDown={down} onPointerMove={move} onPointerUp={(e) => stop(e)} onPointerCancel={(e) => stop(e, true)} onLostPointerCapture={(e) => stop(e, true)}>
      {width > 0 && <Stage width={width} height={c.art.height * ratio} scaleX={ratio} scaleY={ratio} listening={false}>
        <Layer listening={false}>
          {c.photo && <Group clipX={c.art.reference.x} clipY={c.art.reference.y} clipWidth={c.art.reference.width} clipHeight={c.art.reference.height}><CanvasImage image={c.photo} x={c.frame.x} y={c.frame.y} width={c.photo.naturalWidth * c.frame.scale} height={c.photo.naturalHeight * c.frame.scale} /></Group>}
          <CanvasImage image={c.image} width={c.art.width} height={c.art.height} />
          {c.stickers.filter((s) => s.id !== dragVisual?.id).map((s) => <CanvasImage key={s.id} image={s.image} x={s.x} y={s.y} offsetX={s.image.naturalWidth / 2} offsetY={s.image.naturalHeight / 2} scaleX={s.scale} scaleY={s.scale} rotation={s.angle} />)}
          {s && s.id !== dragVisual?.id && <CanvasRect x={s.x} y={s.y} width={s.image.naturalWidth * s.scale} height={s.image.naturalHeight * s.scale} offsetX={s.image.naturalWidth * s.scale / 2} offsetY={s.image.naturalHeight * s.scale / 2} rotation={s.angle} stroke={selectionColor} strokeWidth={2 / ratio} dash={[6 / ratio, 4 / ratio]} />}
        </Layer>
      </Stage>}
    </div>
  </>
}

export function PhotoEditor({ event, assetBase, assetUrls, preferredArtworkId, onInitialLoading }: { event: CampaignConfig; assetBase?: string; assetUrls?: Record<string, string>; preferredArtworkId?: string; onInitialLoading?: (label: string | null) => void }) {
  const previousPreference = useRef<string | undefined>(undefined);
  const [panel, setPanel] = useState<EditorTool>('')
  const photoInput = useRef<HTMLInputElement>(null)
  const editingTracked = useRef(false)
  const trash = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [overTrash, setOverTrash] = useState(false)
  const [dragVisual, showDrag] = useState<StickerDragVisual | null>(null)
  const drag = (active: boolean, over: boolean) => { setDragging(active); setOverTrash(over) }
  const [exportRevision, setExportRevision] = useState(0)
  const exportAction = useRef<ExportAction>(null)
  const [exportWorking, setExportWorking] = useState(false)
  const [history, setHistory] = useState<History<Composition> | null>(null)
  const current = useRef<History<Composition> | null>(null)
  const baseline = useRef<Composition | null>(null)
  const [draft, setDraft] = useState<Composition | null>(null)
  const draftRef = useRef<Composition | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const selectionColor = event.theme?.accent ?? themeDefaults.accent
  useEffect(() => {
    const deselectOutsideCanvas = (e: globalThis.PointerEvent) => {
      // Dentro do canvas, o hit test decide a seleção. Gestos ativos mantêm seu alvo.
      if (baseline.current || (e.target instanceof Element && e.target.closest('.composition'))) return
      setSelected(null)
    }
    document.addEventListener('pointerdown', deselectOutsideCanvas, true)
    return () => document.removeEventListener('pointerdown', deselectOutsideCanvas, true)
  }, [])
  const [busy, setBusy] = useState(false)
  const loading = useRef(false)
  const [loadingArt, setLoadingArt] = useState(false)
  const [message, setMessage] = useState('')
  const [operation, setOperation] = useState('')
  const [artError, setArtError] = useState<Artwork | null>(null)
  const request = useRef(0); const sequence = useRef(0)
  const stickerImages = useRef(new Map<string, HTMLImageElement>())
  const asset = useCallback((file: string) => assetUrls && Object.hasOwn(assetUrls, file) ? assetUrls[file] : assetBase ? `${assetBase}/${encodeURIComponent(file.replace(/\.png$/, ''))}` : `/campaigns/${event.slug}/${file}`, [assetUrls, assetBase, event.slug])
  const publish = (h: History<Composition>) => {
    if (h.present !== current.current?.present) setExportRevision((n) => n + 1)
    current.current = h; setHistory(h)
  }
  const apply = (next: Composition) => {
    if (current.current) publish(commit(current.current, sameComposition(current.current.present, next) ? current.current.present : next))
    else publish({ past: [], present: next, future: [] })
  }
  const start = () => {
    if (!baseline.current && current.current) {
      baseline.current = current.current.present; draftRef.current = current.current.present; setDraft(current.current.present)
    }
  }
  const preview = (next: Composition) => {
    if (baseline.current) { draftRef.current = next; setDraft(next) } else apply(next)
  }
  const finish = () => {
    const next = draftRef.current
    if (!baseline.current) return
    baseline.current = null; draftRef.current = null; setDraft(null)
    if (next) apply(next)
  }
  const cancel = () => { baseline.current = null; draftRef.current = null; setDraft(null) }
  const loadArt = async (art: Artwork) => {
    if (baseline.current) return
    const id = ++request.current
    loading.current = true; setBusy(true); setLoadingArt(true); setArtError(null); setOperation('Preparando arte…'); setMessage('')
    try {
      const loaded = await readArtwork(asset(art.file), art)
      if (request.current !== id) return
      const old = current.current?.present
      const next = old ? changeArt(old, art, loaded.image, loaded.bounds) : { art, ...loaded, photo: null, frame: { x: 0, y: 0, scale: 1 }, stickers: [] }
      apply(next)
      setPanel('')

    } catch {
      if (request.current === id) { setArtError(art); setMessage('') }
    } finally { if (request.current === id) { loading.current = false; setBusy(false); setOperation(''); setLoadingArt(false) } }
  }
  useEffect(() => {
    let active = true
    const existing = current.current
    if (!event.artworks.length) {
      request.current++
      current.current = null; baseline.current = null; draftRef.current = null
      loading.current = false
      // The private bridge can remove the last artwork; discard its stale composition.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistory(null); setDraft(null); setSelected(null); showDrag(null)
      setBusy(false); setLoadingArt(false); setArtError(null); setOperation(''); setMessage('')
      return () => { active = false }
    }
    const preferred = event.artworks.find(art => art.id === preferredArtworkId)
    const selectionChanged = previousPreference.current !== preferredArtworkId
    if (existing && preferred && selectionChanged && existing.present.art.id !== preferred.id && !baseline.current) {
      const token = ++request.current
      readArtwork(asset(preferred.file), preferred).then(loaded => {
        if (!active || !current.current || request.current !== token) return
        previousPreference.current = preferredArtworkId
        const next = changeArt(current.current.present, preferred, loaded.image, loaded.bounds)
        const updated = { past: [], present: next, future: [] }
        current.current = updated; setHistory(updated); setSelected(null); setPanel(''); setArtError(null)
        setExportRevision(revision => revision + 1)
      }, () => { if (active && request.current === token) setArtError(preferred) })
      return () => { active = false }
    }
    previousPreference.current = preferredArtworkId
    const activeArtwork = existing && event.artworks.find((art) => art.id === existing.present.art.id)
    if (existing && activeArtwork) {
      // A configuração DEV pode mudar enquanto a edição está aberta. Atualize os
      // snapshots sem recarregar o bitmap: a referência define a área retangular
      // ocupada pela foto e também o recorte da camada de foto.
      const synced = syncHistoryArtwork(existing, activeArtwork)
      if (synced !== existing) {
        current.current = synced
        setHistory(synced)
        if (synced.present !== existing.present) setExportRevision((revision) => revision + 1)
      }
      if (baseline.current) baseline.current = syncArtworkReference(baseline.current, activeArtwork, false)
      if (draftRef.current) {
        const draft = syncArtworkReference(draftRef.current, activeArtwork)
        draftRef.current = draft
        setDraft(draft)
      }
      return () => { active = false }
    }
    if (existing) {
      // Apenas a prévia técnica pode remover a arte ativa durante a edição.
      if (event.artworks[0]) {
        const replacement = event.artworks[0]
        readArtwork(asset(replacement.file), replacement).then((loaded) => {
          if (!active || !current.current) return
          const next = changeArt(current.current.present, replacement, loaded.image, loaded.bounds)
          const updated = { past: [], present: next, future: [] }
          current.current = updated; setHistory(updated); setExportRevision((revision) => revision + 1)
        }, () => { if (active) setArtError(replacement) })
      }
      return () => { active = false }
    }
    const art = preferred ?? event.artworks[0]
    const token = ++request.current
    readArtwork(asset(art.file), art).then((loaded) => {
      if (!active || current.current || request.current !== token) return
      const h = { past: [], present: { art, ...loaded, photo: null, frame: { x: 0, y: 0, scale: 1 }, stickers: [] }, future: [] }
      current.current = h; setHistory(h)
    }, () => { if (active && request.current === token) setArtError(art) })
    const counter = request
    return () => { active = false; counter.current++ }
  }, [event, asset, preferredArtworkId])
  const selectPhoto = async (file?: File) => {
    if (!file || loading.current || baseline.current || !current.current) return
    loading.current = true; setBusy(true); setOperation('Lendo foto no dispositivo…'); setMessage('')
    const id = ++request.current
    try {
      const photo = await readPhoto(file)
      if (request.current !== id) return
      const c = current.current!.present
      apply({ ...c, photo, frame: initialFrame(photoSize(photo), c.art.reference) })
      if (!editingTracked.current) { editingTracked.current = true; trackEditingStarted(event.slug) }
      setSelected(null); setPanel('')
    } catch (error) { if (request.current === id) setMessage(error instanceof Error ? error.message : 'Não foi possível ler a foto.') }
    finally { if (request.current === id) { loading.current = false; setBusy(false); setOperation('') } }
  }
  const addSticker = async (material: Material) => {
    if (loading.current || baseline.current || !current.current) return
    loading.current = true; setBusy(true); setOperation(`Carregando sticker ${material.name}…`); setMessage('')
    const id = ++request.current
    try {
      const image = stickerImages.current.get(material.id) ?? await decodeImage(asset(material.file))
      if (request.current !== id) return
      stickerImages.current.set(material.id, image)
      const c = current.current!.present; const instance = ++sequence.current
      apply({ ...c, stickers: [...c.stickers, { id: instance, materialId: material.id, name: material.name, image, x: c.art.width / 2, y: c.art.height / 2, scale: Math.min(c.art.width, c.art.height) * .25 / Math.max(image.naturalWidth, image.naturalHeight), angle: 0 }] })
      setSelected(instance); setPanel('')
    } catch { if (request.current === id) setMessage(`Não foi possível carregar o sticker ${material.name}. Tente adicioná-lo novamente.`) }
    finally { if (request.current === id) { loading.current = false; setBusy(false); setOperation('') } }
  }
  const hasArtwork = event.artworks.length > 0
  const c = hasArtwork ? draft ?? history?.present : undefined
  useEffect(() => {
    onInitialLoading?.(hasArtwork && !c && !artError ? 'Preparando arte…' : null)
  }, [hasArtwork, c, artError, onInitialLoading])
  const s = c?.stickers.find((s) => s.id === selected)
  const dirty = !!(c?.photo || c?.stickers.length)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const blocked = busy || !!draft || !!dragVisual?.returning || exportWorking
  const open = (tool: EditorTool) => {
    if ((tool === 'Salvar' || tool === 'Foto') && !c) return
    if (tool === 'Salvar') {
      setPanel('')
      exportAction.current?.save()
      return
    }
    if (tool === 'Foto') setSelected(null)
    setPanel(tool)
  }
  const fileInput = <input ref={photoInput} id="photo-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={!c || busy || !!draft} aria-label="Escolher ou substituir foto" hidden onChange={(e) => { void selectPhoto(e.target.files?.[0]); e.target.value = '' }} />
  const artTools = <div className="tool-panel art-tools" hidden={panel !== 'Artes'}>
    <h3 id="artworks-title">Artes do evento</h3>
    <p>Sua foto e stickers continuam aqui. Confira o enquadramento ao trocar.</p>
    <ul className="artworks material-grid" aria-labelledby="artworks-title">{event.artworks.map((art) => <li key={art.id}>
      <button className="art-choice" aria-label={`Arte ${art.name} ${art.width} × ${art.height} px`} aria-pressed={c?.art.id === art.id} disabled={!!draft || (busy && !loadingArt)} onClick={() => { void loadArt(art) }}>
        <Thumbnail src={asset(art.file)} name={`Arte ${art.name}`} /><span>{art.name}</span><span>{art.width} × {art.height} px</span>
      </button>
    </li>)}</ul>
    </div>
  const feedback = <>
    {artError && <div role="alert"><p>Não foi possível preparar a arte {artError.name}. Escolha outra arte ou tente novamente. Sua composição foi preservada.</p><button disabled={!!draft || (busy && !loadingArt)} onClick={() => { void loadArt(artError) }}>Tentar carregar arte novamente</button></div>}
    <p className="editor-message" role="status" aria-live="polite">{message}</p>
    {hasArtwork && history && <ExportPanel key={exportRevision} actionRef={exportAction} onWorking={setExportWorking} composition={history.present} slug={event.slug} blocked={blocked} />}
  </>
  const historyControls = <div className="direction-controls history-controls" aria-label="Histórico">
        <button aria-label="Desfazer" title="Desfazer" disabled={!c || blocked || !history?.past.length} onClick={() => { publish(undo(current.current!)); setSelected(null) }}><EditorIcon name="Desfazer" /></button>
        <button aria-label="Refazer" title="Refazer" disabled={!c || blocked || !history?.future.length} onClick={() => { publish(redo(current.current!)); setSelected(null) }}><EditorIcon name="Refazer" /></button>
      </div>
  const canvas = <>{exportWorking && <LoadingIndicator label="Salvando sua imagem…" />}{!hasArtwork && <div className="preview-empty-artwork" role="img" aria-label="Prévia sem arte, fundo quadriculado de transparência" />}{(hasArtwork && ((!onInitialLoading && !c && !artError) || (busy && (!!c || !!artError)))) && <LoadingIndicator label={operation || 'Preparando arte…'} />}{c && <div className="canvas-space"><EditorCanvas c={c} selected={s?.id ?? null} select={setSelected} selectionColor={selectionColor} blocked={blocked} start={start} preview={preview} finish={finish} cancel={cancel} trash={trash} drag={drag} dragVisual={dragVisual} showDrag={showDrag} /></div>}</>
  const stickerTools = <div className="tool-panel sticker-tools" hidden={panel !== 'Stickers'}><h3 id="stickers-title">Stickers</h3>
    <p>Toque para adicionar. Stickers ficam sobre a arte, inclusive logos.</p>
    {event.stickers.length ? <ul className="stickers material-grid" aria-labelledby="stickers-title">{event.stickers.map((item) => <li key={item.id}>
      <button className="sticker-choice" disabled={!c || busy || !!draft} onClick={() => { void addSticker(item) }} aria-label={`Adicionar sticker ${item.name}`}>
        <Thumbnail src={asset(item.file)} name={`Sticker ${item.name}`} /><span>{item.name}</span>
      </button>
    </li>)}</ul> : <p>Este evento não possui stickers.</p>}
    </div>
  return <>{dragVisual && <StickerDragPreview visual={dragVisual} overTrash={overTrash} trash={trash} onReturnComplete={() => showDrag((currentVisual) => currentVisual?.returning ? null : currentVisual)} />}<EditorWorkspace event={event} panel={panel} open={open} blocked={blocked} compositionReady={!!c}
    canvas={canvas} history={historyControls} feedback={feedback} fileInput={fileInput} trash={trash} dragging={dragging} overTrash={overTrash}
    choosePhoto={() => photoInput.current?.click()}
    tools={<>{artTools}{stickerTools}<div className="tool-panel help-tools" hidden={panel !== 'Ajuda'}>
      <p><strong>{event.name}</strong>{event.demo && ' — Demonstração fictícia'}. Criado com Namarca.</p>
      <h3>Foto e stickers</h3><p>Arraste com um dedo. Use dois dedos para ampliar a foto ou ampliar e girar o sticker selecionado. Toque em um sticker para selecioná-lo; o menu Foto volta à foto.</p>
      <p>Ícones do menu: Foto abre o seletor do dispositivo; Artes escolhe a arte; Stickers adiciona decoração; Salvar compartilha sua imagem diretamente quando o navegador permite; caso contrário, inicia o download. O fundo escuro identifica o painel aberto. Toque fora para fechar sem alterar a composição.</p>
      <p>Para excluir um sticker, arraste com um dedo até a lixeira no rodapé e solte nela. Passar por cima sem soltar não exclui. Desfazer restaura o sticker como estava antes do arraste.</p>
      <p>Esta versão usa somente gestos para editar. Não oferece controles de transformação por teclado ou zoom/rotação por mouse; stickers sobrepostos são selecionados pelo toque no elemento visível.</p>
      <p>Use JPEG, PNG ou WebP estáticos. Para HEIC/HEIF, converta para JPEG antes de selecionar. A foto fica neste dispositivo; sair ou recarregar perde a edição.</p>
      <h3>Artes e histórico</h3><p>Trocar de arte preserva seus elementos. Confira o enquadramento, especialmente ao mudar de proporção. Stickers podem cobrir logos. Desfazer e refazer recuperam ajustes desta sessão.</p>
      <h3>Salvar e privacidade</h3><p>Toque em Salvar no menu para compartilhar ou baixar diretamente, conforme o suporte do navegador. O compartilhamento entrega o arquivo ao aplicativo escolhido, sem publicação automática. Se o navegador abrir a imagem, use a opção de salvar imagem.</p><p>A foto e a composição ficam neste navegador, sem envio ao servidor. Ao sair ou recarregar, você perde a edição e o histórico; não há recuperação.</p>
    </div></>} /></>
}
