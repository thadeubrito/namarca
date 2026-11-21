import type { EventConfig } from '@namarca/editor/events';
import { sameDraftValue, type LocalMaterial } from './studio-draft';

export type StudioScope = 'artworks' | 'stickers' | 'theme';

/** Restore one local section; identity, saved revision and other blobs stay untouched. */
export function discardStudioScope(event: EventConfig, saved: EventConfig, materials: LocalMaterial[], scope: StudioScope) {
  // Scoped saves ignore incoming legacy color and retain the saved envelope value.
  const next = scope === 'theme'
    ? { ...event, theme: saved.theme, color: saved.color }
    : { ...event, [scope]: saved[scope] };
  const kind = scope === 'artworks' ? 'artwork' : scope === 'stickers' ? 'sticker' : null;
  const savedIds = new Set(scope === 'theme' ? [] : saved[scope].map(item => item.id));
  const remaining = materials.filter(item => item.kind !== kind || savedIds.has(item.id));
  const dirty = (['artworks', 'stickers', 'theme'] as const).some(key => !sameDraftValue(next[key], saved[key]));
  return { event: next, materials: remaining, dirty };
}
