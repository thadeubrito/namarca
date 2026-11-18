import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { IconArrowBackUp, IconArrowForwardUp, IconCamera, IconDownload, IconInfoCircle, IconPhotoSquareRounded, IconSticker, IconTrash, IconX } from '@tabler/icons-react'
import { motion, useReducedMotion } from 'motion/react'
import type { EventConfig } from '../events/events'

export type EditorTool = '' | 'Foto' | 'Artes' | 'Stickers' | 'Salvar' | 'Ajuda'

const editorIcons = {
  Foto: IconCamera,
  Artes: IconPhotoSquareRounded,
  Stickers: IconSticker,
  Desfazer: IconArrowBackUp,
  Refazer: IconArrowForwardUp,
  Fechar: IconX,
  Ajuda: IconInfoCircle,
  Lixeira: IconTrash,
  Salvar: IconDownload,
}

export function EditorIcon({ name }: { name: string }) {
  const Icon = editorIcons[name as keyof typeof editorIcons]
  return Icon ? <Icon size={22} stroke={1.7} color="currentColor" aria-hidden="true" /> : null
}

// Ferramentas sobrepostas não participam do dimensionamento da composição.
export function EditorWorkspace({ event, panel, open, blocked, tools, canvas, history, feedback, fileInput, choosePhoto, trash, dragging, overTrash }: {
  event: EventConfig; panel: EditorTool; open: (tool: EditorTool) => void; blocked: boolean
  tools: ReactNode; canvas: ReactNode; history: ReactNode; feedback: ReactNode; fileInput: ReactNode
  choosePhoto: () => void; trash: RefObject<HTMLDivElement | null>; dragging: boolean; overTrash: boolean
}) {
  const reducedMotion = useReducedMotion()
  const root = useRef<HTMLElement>(null)
  const [lastPanel, setLastPanel] = useState<EditorTool>(panel)
  if (panel && panel !== lastPanel) setLastPanel(panel)
  const visiblePanel = panel || lastPanel
  const trigger = useRef<HTMLButtonElement | null>(null)
  const lastFocused = useRef<HTMLElement | null>(null)
  const restoreFocus = useRef(false)
  const closingClick = useRef(false)
  // Só move o foco se a ação acabou de ocultar o controle que o possuía.
  useLayoutEffect(() => {
    if (restoreFocus.current) {
      restoreFocus.current = false
      if (trigger.current?.isConnected) trigger.current.focus()
    }
    const active = document.activeElement
    const hiddenFocus = active instanceof HTMLElement && root.current?.contains(active) && (!active.getClientRects().length || !!active.closest('[inert]'))
    // Chromium pode devolver foco ao body ao desabilitar o botão durante a leitura.
    const lostFocus = active === document.body && lastFocused.current && (!lastFocused.current.getClientRects().length || !!lastFocused.current.closest('[inert]'))
    if (!blocked && (hiddenFocus || lostFocus)) {
      const fallback = !panel && trigger.current?.isConnected ? trigger.current : root.current?.querySelector<HTMLButtonElement>(panel ? '.workspace-panel button:not(:disabled):not([hidden])' : '.editor-tabs button')
      fallback?.focus()
    }
  }, [panel, blocked])
  const close = () => { restoreFocus.current = true; open('') }
  const toggle = (tool: EditorTool, button: HTMLButtonElement) => {
    trigger.current = button
    open(panel === tool ? '' : tool)
  }
  return <section ref={root} className="dedicated-editor" data-panel={panel} aria-label="Editor de composição" style={{ '--event-color': event.color } as CSSProperties}
    onPointerDownCapture={(e) => {
      closingClick.current = false
      const target = e.target as HTMLElement
      if (panel && !blocked && !target.closest('.workspace-panel, .workspace-feedback, .editor-tabs, .help-trigger')) {
        closingClick.current = true; e.preventDefault(); e.stopPropagation(); close()
      }
    }}
    onFocusCapture={(e) => { lastFocused.current = e.target }}
    onClickCapture={(e) => {
      if (closingClick.current) { closingClick.current = false; e.preventDefault(); e.stopPropagation(); return }
      const target = e.target as HTMLElement
      const button = target.closest<HTMLButtonElement>('button[aria-controls="editor-tool-panel"]')
      if (button) trigger.current = button
    }}
    onKeyDown={(e) => {
      if (e.key === 'Escape' && panel && !blocked) { e.preventDefault(); close() }
    }}>
    <header className="editor-header">
      {history}
      <button className="icon-button help-trigger" aria-label="Ajuda" title="Informações e ajuda" aria-expanded={panel === 'Ajuda'} aria-controls="editor-tool-panel" disabled={blocked} onClick={(e) => toggle('Ajuda', e.currentTarget)}><EditorIcon name="Ajuda" /></button>
    </header>
    {fileInput}
    <div className="workspace-stage">{canvas}
    <div className="floating-tools">
    <div className="workspace-feedback">{feedback}</div>
    <aside id="editor-tool-panel" className="workspace-panel" aria-label={panel || 'Ferramentas'} data-visible-panel={visiblePanel}
      inert={!panel} aria-hidden={!panel}>
      {visiblePanel !== 'Artes' && visiblePanel !== 'Stickers' && <div className="panel-heading"><h2 className={visiblePanel === 'Foto' ? 'sr-only' : undefined}>{visiblePanel === 'Salvar' ? 'Sua arte pronta para levar' : visiblePanel === 'Foto' ? 'Ajustar foto' : 'Como funciona'}</h2><button className="icon-button" aria-label="Fechar painel" disabled={blocked} onClick={close}><EditorIcon name="Fechar" /></button></div>}
      <div className="panel-content">{tools}</div>
    </aside>
    </div>
    </div>
    <footer className="editor-footer">
      <nav className="editor-tabs" aria-label="Ferramentas" hidden={dragging}>{(['Foto', 'Artes', 'Stickers', 'Salvar'] as const).map((name) => <button key={name} aria-label={name} title={name} disabled={blocked} aria-expanded={name === 'Foto' || name === 'Salvar' ? undefined : panel === name} aria-controls={name === 'Foto' || name === 'Salvar' ? undefined : 'editor-tool-panel'} onClick={(e) => {
        if (name === 'Foto') { trigger.current = e.currentTarget; open(''); choosePhoto() }
        else if (name === 'Salvar') { trigger.current = e.currentTarget; open('Salvar') }
        else toggle(name, e.currentTarget)
      }}><EditorIcon name={name} /></button>)}</nav>
      <div className="trash-container" hidden={!dragging}>
      <motion.span className="trash-balloon" aria-hidden="true" initial={false}
        animate={{ opacity: overTrash ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.14 }}
        style={{ visibility: overTrash ? 'visible' : 'hidden' }}>Solte para excluir</motion.span>
      <div ref={trash} className="trash-target" data-active={overTrash} hidden={!dragging} role="img" aria-label={overTrash ? 'Solte para excluir sticker' : 'Arraste até a lixeira'}>
        <motion.span className="trash-icon" initial={false}
          animate={{ opacity: dragging ? 1 : 0, y: dragging || reducedMotion ? 0 : 8, scale: overTrash && !reducedMotion ? 1.15 : 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.16, ease: 'easeOut' }}><EditorIcon name="Lixeira" /></motion.span>
      </div>
      </div>
    </footer>
  </section>
}
