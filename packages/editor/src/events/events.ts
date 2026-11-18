export interface Material { id: string; name: string; file: string }
export interface Artwork extends Material {
  width: number; height: number
  reference: { x: number; y: number; width: number; height: number }
}
export const themeDefaults = {
  background: '#202522', surface: '#fafbf8', text: '#263b2e', mutedText: '#59645c',
  primary: '#173f35', onPrimary: '#ffffff', accent: '#e7a15b', border: '#d8dfd7',
}
export type EventTheme = typeof themeDefaults
export function eventThemeStyle(event: EventConfig): Record<string, string> {
  const variables: Record<string, string> = { '--event-color': event.color }
  if (event.theme) for (const [key, value] of Object.entries({ ...themeDefaults, ...event.theme })) {
    variables[`--theme-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`] = value
  }
  return variables
}

export interface EventConfig {
  slug: string; name: string; color: string; demo: boolean; endsAt: string
  artworks: Artwork[]; stickers: Material[]; theme?: Partial<EventTheme>
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
  let theme: Partial<EventTheme> | undefined
  if (o.theme !== undefined) {
    const input = object(o.theme)
    theme = {}
    for (const key of Object.keys(input)) {
      if (!(key in themeDefaults) || !Object.hasOwn(themeDefaults, key)) return fail()
      const value = input[key]
      if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) return fail()
      theme[key as keyof EventTheme] = value
    }
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
  const response = await fetch(`/events/${slug}/event.json`, { signal })
  // Servidores SPA podem retornar index.html (200) quando o JSON não existe.
  if (response.status === 404) throw new MissingEventError()
  if (!response.ok) throw new Error('Falha de rede')
  if (response.headers.get('content-type')?.includes('text/html')) throw new MissingEventError()
  return parseEvent(await response.json(), slug)
}
