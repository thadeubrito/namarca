import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { analyticsPayload, trackPublicEvent } from '../src/lib/public-analytics'

const config = { enabled: 'true', key: 'synthetic-project-key', host: 'https://eu.i.posthog.com', publicOrigin: 'https://namarca.test' }
const browser = { origin: 'https://namarca.test', pathname: '/exemplo' }

test('analytics opt-in fails closed for config, hosts, routes and privacy signals', () => {
  for (const override of [{ enabled: undefined }, { enabled: 'false' }, { key: '' }, { host: 'https://attacker.test' }, { publicOrigin: undefined }]) {
    assert.equal(analyticsPayload({ ...config, ...override }, browser, 'campaign_opened', 'ephemeral', 'exemplo'), null)
  }
  for (const override of [{ origin: 'https://admin.namarca.test' }, { pathname: '/checkout/token' }, { pathname: '/login' }, { pathname: '/exemplo/extra' }, { doNotTrack: '1' }, { globalPrivacyControl: true }]) {
    assert.equal(analyticsPayload(config, { ...browser, ...override }, 'campaign_opened', 'ephemeral', 'exemplo'), null)
  }
  for (const slug of ['../login', 'foo?token=secret', '', 'x'.repeat(101)]) assert.equal(analyticsPayload(config, browser, 'campaign_opened', 'ephemeral', slug), null)
})

test('payload allowlist has no URL, photo, filename, composition, user or error content', () => {
  assert.deepEqual(analyticsPayload(config, browser, 'export_generated', 'ephemeral', 'exemplo'), {
    api_key: 'synthetic-project-key', event: 'export_generated', properties: {
      distinct_id: 'ephemeral', $process_person_profile: false, $geoip_disable: true, surface: 'campaign', campaign_slug: 'exemplo',
    },
  })
  assert.equal(analyticsPayload(config, browser, 'contact_clicked', 'ephemeral'), null)
  const landing = analyticsPayload(config, { ...browser, pathname: '/' }, 'contact_clicked', 'ephemeral')
  assert.equal(landing?.properties.surface, 'landing')
  assert.equal(landing?.properties.campaign_slug, undefined)
  assert.equal(analyticsPayload(config, { ...browser, pathname: '/' }, 'campaign_opened', 'ephemeral', 'exemplo'), null)
  assert.equal(analyticsPayload(config, browser, 'arbitrary' as 'campaign_opened', 'ephemeral', 'exemplo'), null)
})

test('transport sends only allowed payload without credentials or referrer and swallows failures', async () => {
  const names = ['NEXT_PUBLIC_POSTHOG_ENABLED', 'NEXT_PUBLIC_POSTHOG_KEY', 'NEXT_PUBLIC_POSTHOG_HOST', 'NEXT_PUBLIC_POSTHOG_PUBLIC_ORIGIN']
  const saved = names.map(name => process.env[name])
  const globals = ['window', 'navigator', 'fetch'] as const
  const descriptors = globals.map(name => Object.getOwnPropertyDescriptor(globalThis, name))
  const requests: Array<{ url: unknown; options: RequestInit }> = []
  try {
    names.forEach((name, index) => { process.env[name] = ['true', config.key, config.host, config.publicOrigin][index] })
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { origin: browser.origin, pathname: '/exemplo', search: '?token=never-send' } } })
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: (url: unknown, options: RequestInit) => { requests.push({ url, options }); return Promise.reject(new Error('offline')) } })
    trackPublicEvent('photo_selected', 'exemplo')
    trackPublicEvent('export_generated', 'exemplo')
    await Promise.resolve()
    assert.equal(requests.length, 2)
    assert.equal(requests[0].url, 'https://eu.i.posthog.com/capture/')
    assert.equal(requests[0].options.credentials, 'omit')
    assert.equal(requests[0].options.referrerPolicy, 'no-referrer')
    const first = JSON.parse(String(requests[0].options.body))
    const second = JSON.parse(String(requests[1].options.body))
    assert.equal(first.properties.distinct_id, second.properties.distinct_id)
    assert.doesNotMatch(JSON.stringify(first), /never-send|token|location|photo_data|composition/)
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { globalPrivacyControl: true } })
    trackPublicEvent('photo_selected', 'exemplo')
    assert.equal(requests.length, 2)
  } finally {
    names.forEach((name, index) => { if (saved[index] === undefined) delete process.env[name]; else process.env[name] = saved[index] })
    globals.forEach((name, index) => { const descriptor = descriptors[index]; if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name) })
  }
})

test('server invocation is a no-op and private preview supplies no telemetry', () => {
  assert.doesNotThrow(() => trackPublicEvent('landing_viewed'))
  const preview = readFileSync('src/editor/CampaignPreview.tsx', 'utf8')
  assert.doesNotMatch(preview, /telemetry=|trackPublicEvent/)
  const editor = readFileSync('src/editor/PhotoEditor.tsx', 'utf8')
  const exporter = readFileSync('src/editor/ExportPanel.tsx', 'utf8')
  assert.doesNotMatch(editor + exporter, /trackPNGGenerated|trackEditingStarted/)
  assert.match(exporter, /telemetry\?\.\('export_generated'\)/)
})
