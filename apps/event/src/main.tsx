import { useEffect, useState, type CSSProperties } from 'react'
import { createRoot } from 'react-dom/client'
import { PhotoEditor } from '../../../packages/editor/src/editor/PhotoEditor'
import { checkEventSuspended, eventThemeStyle, loadEvent, MissingEventError, SuspendedEventError, resolveSlug, type EventConfig } from '../../../packages/editor/src/events/events'
import '../../../packages/editor/src/styles.css'

type State = { status: 'loading' | 'missing' | 'error' | 'suspended' } | { status: 'ready'; event: EventConfig }

function App() {
  const [state, setState] = useState<State>(() => ({ status: resolveSlug(window.location.pathname) ? 'loading' : 'missing' }))
  const [attempt, setAttempt] = useState(0)
  const [now, setNow] = useState(Date.now)
  const slug = resolveSlug(window.location.pathname)

  useEffect(() => {
    const controller = new AbortController()
    if (!slug) return () => controller.abort()
    loadEvent(slug, controller.signal).then(event => {
      if (!controller.signal.aborted) { setNow(Date.now()); setState({ status: 'ready', event }) }
    }).catch(error => {
      if (!controller.signal.aborted) setState({ status: error instanceof SuspendedEventError ? 'suspended' : error instanceof MissingEventError ? 'missing' : 'error' })
    })
    return () => controller.abort()
  }, [slug, attempt])

  useEffect(() => {
    if (state.status !== 'ready') return
    const update = () => setNow(Date.now())
    const timer = window.setInterval(update, 1000)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [state])

  useEffect(() => {
    if (!slug || state.status !== 'ready') return
    let disposed = false
    let lastCheck = Date.now()
    let pending: AbortController | null = null
    const check = async () => {
      // Focus/visibility bursts share the polling budget and never overlap.
      if (disposed || pending || Date.now() - lastCheck < 15_000) return
      lastCheck = Date.now()
      const controller = new AbortController()
      pending = controller
      const timeout = window.setTimeout(() => controller.abort(), 10_000)
      try {
        const suspended = await checkEventSuspended(slug, controller.signal)
        if (!disposed && !controller.signal.aborted && suspended) setState({ status: 'suspended' })
        // Active checks do not replace the event or remount the local composition.
      } catch {
        // Offline/malformed responses are unknown, not activation or reactivation.
      } finally {
        window.clearTimeout(timeout)
        if (pending === controller) pending = null
      }
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') void check() }
    const timer = window.setInterval(() => { void check() }, 15_000)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      disposed = true
      window.clearInterval(timer)
      pending?.abort()
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [slug, state])

  if (state.status === 'ready' && Date.parse(state.event.endsAt) > now) {
    return <div className="editor-page" style={eventThemeStyle(state.event) as CSSProperties}><PhotoEditor event={state.event} /></div>
  }
  return <div className="event-status-page"><main>
    <p className="brand">na<span>marca</span></p>
    {state.status === 'loading' && <p role="status">Preparando editor…</p>}
    {state.status === 'missing' && <><h1>Evento não encontrado</h1><p>Confira o link enviado pela organização.</p></>}
    {state.status === 'suspended' && <><h1>Ativação temporariamente indisponível</h1><p>Entre em contato com a organização para mais informações.</p><button type="button" onClick={() => { setState({ status: 'loading' }); setAttempt(value => value + 1) }}>Tentar novamente</button></>}
    {state.status === 'error' && <><h1>Não foi possível abrir o evento</h1><p role="alert">Confira sua conexão e tente novamente.</p><button type="button" onClick={() => { setState({ status: 'loading' }); setAttempt(value => value + 1) }}>Tentar novamente</button></>}
    {state.status === 'ready' && <><h1>Ativação encerrada</h1><p>A ativação de {state.event.name} já terminou.</p></>}
  </main></div>
}

createRoot(document.getElementById('root')!).render(<App />)
