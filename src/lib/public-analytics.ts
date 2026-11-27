// Explicit PostHog capture API only: no SDK, DOM capture, replay, cookies or profiles.
export type CampaignAnalyticsEvent = 'campaign_opened' | 'editor_started' | 'photo_selected' | 'export_generated' | 'export_failed' | 'artwork_load_failed' | 'sticker_load_failed' | 'campaign_load_failed'
export type PublicAnalyticsEvent = CampaignAnalyticsEvent | 'landing_viewed' | 'example_clicked' | 'contact_clicked'
export type CampaignTelemetry = (event: CampaignAnalyticsEvent) => void
export interface AnalyticsConfig { enabled?: string; key?: string; host?: string; publicOrigin?: string }
interface BrowserContext { origin: string; pathname: string; doNotTrack?: string | null; globalPrivacyControl?: boolean }
const hosts = new Set(['https://us.i.posthog.com', 'https://eu.i.posthog.com'])
const campaignEvents = new Set<string>(['campaign_opened', 'editor_started', 'photo_selected', 'export_generated', 'export_failed', 'artwork_load_failed', 'sticker_load_failed', 'campaign_load_failed'])
const landingEvents = new Set<string>(['landing_viewed', 'example_clicked', 'contact_clicked'])

export function analyticsPayload(config: AnalyticsConfig, context: BrowserContext, event: PublicAnalyticsEvent, distinctId: string, slug?: string) {
  if (config.enabled !== 'true' || !config.key || !hosts.has(config.host ?? '') || context.origin !== config.publicOrigin || context.doNotTrack === '1' || context.globalPrivacyControl) return null
  const campaign = campaignEvents.has(event)
  if (campaign ? !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100 || context.pathname !== `/${slug}` : !landingEvents.has(event) || context.pathname !== '/') return null
  return {
    api_key: config.key,
    event,
    properties: {
      distinct_id: distinctId,
      $process_person_profile: false,
      $geoip_disable: true,
      surface: campaign ? 'campaign' : 'landing',
      ...(campaign ? { campaign_slug: slug } : {}),
    },
  }
}

let pageId: string | undefined
export function trackPublicEvent(event: PublicAnalyticsEvent, slug?: string): void {
  try {
    if (typeof window === 'undefined') return
    const config: AnalyticsConfig = {
      enabled: process.env.NEXT_PUBLIC_POSTHOG_ENABLED,
      key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      publicOrigin: process.env.NEXT_PUBLIC_POSTHOG_PUBLIC_ORIGIN,
    }
    const context = { origin: window.location.origin, pathname: window.location.pathname, doNotTrack: navigator.doNotTrack, globalPrivacyControl: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl }
    // No persistent identity; a reload starts a new measurement session.
    const payload = analyticsPayload(config, context, event, pageId ?? 'disabled', slug)
    if (!payload) return
    pageId ??= crypto.randomUUID()
    payload.properties.distinct_id = pageId
    void fetch(`${config.host}/capture/`, {
      method: 'POST', body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true,
    }).catch(() => { /* Analytics must never interrupt the product. No retry or log. */ })
  } catch { /* Includes unavailable crypto, blocked fetch and browser privacy controls. */ }
}
