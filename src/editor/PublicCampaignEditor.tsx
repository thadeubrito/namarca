'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { checkCampaignSuspended, campaignThemeStyle, loadCampaign, MissingCampaignError, SuspendedCampaignError, type CampaignConfig } from '@/lib/campaigns/campaigns'
import { CampaignEditorClient } from './CampaignEditorClient'
import { trackPublicEvent, type CampaignTelemetry } from '@/lib/public-analytics'
import './isolated.css'

type State = { status: 'loading' | 'missing' | 'error' | 'suspended' } | { status: 'ready'; event: CampaignConfig }

export function PublicCampaignEditor({ slug }: { slug: string }) {
  // Changing routes must discard the previous campaign, never briefly show its composition.
  return <div className="campaign-editor-scope"><CampaignSession key={slug} slug={slug} /></div>
}

function CampaignSession({ slug }: { slug: string }) {
  const telemetry: CampaignTelemetry = event => trackPublicEvent(event, slug)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    loadCampaign(slug, controller.signal).then(event => {
      if (!controller.signal.aborted) { setNow(Date.now()); setState({ status: 'ready', event }); if (Date.parse(event.endsAt) > Date.now()) trackPublicEvent('campaign_opened', slug) }
    }).catch(error => {
      if (!controller.signal.aborted) {
        if (!(error instanceof SuspendedCampaignError) && !(error instanceof MissingCampaignError)) trackPublicEvent('campaign_load_failed', slug)
        setState({ status: error instanceof SuspendedCampaignError ? 'suspended' : error instanceof MissingCampaignError ? 'missing' : 'error' })
      }
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
    if (state.status !== 'ready') return
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
        const suspended = await checkCampaignSuspended(slug, controller.signal)
        if (!disposed && !controller.signal.aborted && suspended) setState({ status: 'suspended' })
        // Active checks do not replace the campaign or remount the local composition.
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

  if (state.status === 'ready' && now !== null && Date.parse(state.event.endsAt) > now) {
    return <div className="editor-page" style={campaignThemeStyle(state.event) as CSSProperties}>{state.event.demo && <p style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 2, margin: 0, padding: '4px 10px', borderRadius: '0 0 8px 8px', background: 'var(--theme-background)', color: 'var(--theme-text)', fontSize: 12, whiteSpace: 'nowrap', pointerEvents: 'none' }}>Exemplo fictício · {state.event.name.split(' — ')[0]}</p>}<CampaignEditorClient event={state.event} telemetry={telemetry} /></div>
  }
  // Initial SSR and hydration are deterministic and visually quiet.
  if (state.status === 'loading' || (state.status === 'ready' && now === null)) return <span className="sr-only" role="status">Preparando editor…</span>
  if (state.status === 'missing') return <main className="campaign-not-found"><h1>Campanha não encontrada</h1><p>Confira o link enviado pela organização.</p></main>
  return <div className="event-status-page"><main>
    <p className="brand">na<span>marca</span></p>
    {state.status === 'suspended' && <><h1>Ativação temporariamente indisponível</h1><p>Entre em contato com a organização para mais informações.</p><button type="button" onClick={() => { setState({ status: 'loading' }); setAttempt(value => value + 1) }}>Tentar novamente</button></>}
    {state.status === 'error' && <><h1>Não foi possível abrir a campanha</h1><p role="alert">Confira sua conexão e tente novamente.</p><button type="button" onClick={() => { setState({ status: 'loading' }); setAttempt(value => value + 1) }}>Tentar novamente</button></>}
    {state.status === 'ready' && <><h1>Ativação encerrada</h1><p>A ativação de {state.event.name} já terminou.</p></>}
  </main></div>
}
