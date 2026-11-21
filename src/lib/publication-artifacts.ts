import { createHash } from 'node:crypto';
import { parseEvent, type EventConfig } from '@namarca/editor/events';

/** Stable asset identities; only a new publication intention advances the JSON version. */
export function publicationArtifacts(config: EventConfig, version = 1) {
  if (!Number.isSafeInteger(version) || version < 1) throw new Error('Invalid publication version');
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
  const revision = createHash('sha256').update(JSON.stringify(canonical(config))).digest('hex');
  const artworks = config.artworks.map(material => ({ ...material, file: `artworks/${material.id}.png` }));
  const stickers = config.stickers.map(material => ({ ...material, file: `stickers/${material.id}.png` }));
  const event = parseEvent({ ...config, artworks, stickers }, config.slug);
  return {
    event, revision, version,
    manifestKey: `public/events/${config.slug}/event.json`,
    versionKey: `public/events/${config.slug}/versions/v${version}.json`,
    assetKey: (id: string) => {
      const material = [...event.artworks, ...event.stickers].find(material => material.id === id);
      if (!material) throw new Error('Invalid publication asset');
      return `public/events/${config.slug}/${material.file}`;
    },
  };
}
