export interface Material { id: string; name: string; file: string }
export interface Artwork extends Material {
  width: number; height: number
  reference: { x: number; y: number; width: number; height: number }
}
export const themeDefaults = {
  background: '#ffffff', surface: '#dedede', accent: '#494fdf', text: '#191c1f',
}
export type EventTheme = { version: 1 } & typeof themeDefaults
export function contrastText(color: string): string {
  const channels = color.slice(1).match(/../g)!.map(hex => {
    const value = parseInt(hex, 16) / 255
    return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4
  })
  const luminance = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
  return (luminance + .05) / .05 >= 1.05 / (luminance + .05) ? '#000000' : '#ffffff'
}
export function eventThemeStyle(event: EventConfig): Record<string, string> {
  const { background, surface, accent, text } = event.theme ?? { version: 1, ...themeDefaults }
  return {
    '--event-color': accent,
    '--theme-background': background, '--theme-surface': surface,
    '--theme-text': text, '--theme-muted-text': text,
    '--theme-primary': accent, '--theme-accent': accent,
    '--theme-on-primary': contrastText(accent),
    '--theme-on-background': contrastText(background),
    '--theme-border': `color-mix(in srgb, ${surface} 80%, ${contrastText(surface)})`,
  }
}

export interface EventConfig {
  slug: string; name: string; color: string; demo: boolean; endsAt: string
  artworks: Artwork[]; stickers: Material[]; theme?: EventTheme
}

export function resolveSlug(path: string): string | null {
  const match = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(path)
  return match?.[1] ?? null
}

export function parseEvent(value: unknown, slug: string, options: { allowEmptyArtworks?: boolean } = {}): EventConfig {
  const fail = (detail?: string): never => { throw new Error(`Configuração inválida${detail ? `: ${detail}` : ''}`) }
  const object = (v: unknown): Record<string, unknown> => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return fail()
    return v as Record<string, unknown>
  }
  const text = (v: unknown): string => typeof v === 'string' && v.trim() ? v : fail()
  const number = (v: unknown, minimum = 1): number => typeof v === 'number' && Number.isFinite(v) && v >= minimum ? v : fail()
  const file = (v: unknown): string => {
    const s = text(v)
    return /^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(png|jpg|jpeg|svg)$/.test(s) ? s : fail()
  }
  const materials = (v: unknown): Material[] => {
    if (!Array.isArray(v)) return fail()
    const result = v.map((item) => { const o = object(item); return { id: text(o.id), name: text(o.name), file: file(o.file) } })
    if (new Set(result.map((m) => m.id)).size !== result.length) return fail('IDs duplicados na galeria')
    return result
  }
  const o = object(value)
  if (o.slug !== slug || resolveSlug(`/${slug}`) !== slug) return fail('slug deve coincidir com a pasta e a URL')
  if (typeof o.demo !== 'boolean') return fail('demo deve ser booleano')
  const color = text(o.color)
  const endsAt = text(o.endsAt)
  if (!/^#[0-9a-f]{6}$/i.test(color) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(endsAt) || !Number.isFinite(Date.parse(endsAt))) return fail()
  let theme: EventTheme | undefined
  if (o.theme !== undefined) {
    const input = object(o.theme)
    if (input.version !== 1 || Object.keys(input).length !== 5) return fail('versão ou campos do tema inválidos')
    for (const key of Object.keys(themeDefaults)) {
      const value = input[key]
      if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) return fail('cor inválida')
    }
    theme = { version: 1, background: input.background as string, surface: input.surface as string, accent: input.accent as string, text: input.text as string }
  }
  const base = materials(o.artworks)
  const stickers = materials(o.stickers)
  if ([...base, ...stickers].some((material) => !material.file.endsWith('.png'))) return fail()
  if (!base.length && !options.allowEmptyArtworks) return fail('ao menos uma arte é obrigatória')
  const artworks = base.map((m, index) => {
    const a = object((o.artworks as unknown[])[index]); const r = object(a.reference)
    const width = number(a.width); const height = number(a.height)
    const reference = { x: number(r.x, 0), y: number(r.y, 0), width: number(r.width), height: number(r.height) }
    if (!Number.isInteger(width) || !Number.isInteger(height)) return fail(`${m.id}: dimensões devem ser pixels inteiros`)
    if (reference.x + reference.width > width || reference.y + reference.height > height) return fail(`${m.id}: referência fora da arte`)
    return { ...m, width, height, reference }
  })
  return { slug, name: text(o.name), theme, color, demo: o.demo, endsAt, artworks, stickers }
}

export class MissingEventError extends Error {}
export async function loadEvent(slug: string, signal: AbortSignal): Promise<EventConfig> {
  const read = async (path: string, pointer = false): Promise<unknown> => {
    const response = await fetch(path, { signal, ...(pointer ? { cache: 'no-store' as const } : {}) })
    // Servidores SPA podem retornar index.html (200) quando o JSON não existe.
    if (response.status === 404) throw new MissingEventError()
    if (!response.ok) throw new Error('Falha de rede')
    if (response.headers.get('content-type')?.includes('text/html')) throw new MissingEventError()
    return response.json()
  }
  const manifest = await read(`/events/${slug}/event.json`, true)
  if (manifest && typeof manifest === 'object' && !Array.isArray(manifest) && 'version' in manifest) {
    const { version } = manifest
    if (Object.keys(manifest).length !== 1 || typeof version !== 'number' || !Number.isSafeInteger(version) || version < 1) throw new Error('Configuração inválida: versão de publicação')
    return parseEvent(await read(`/events/${slug}/versions/v${version}.json`), slug)
  }
  return parseEvent(manifest, slug)
}
