import { parseEvent, themeDefaults, type Artwork, type EventConfig, type Material } from '@namarca/editor/events';

export type ValueChange<T> = { before: T; after: T };
export type PublicationField = 'slug' | 'name' | 'endsAt' | 'demo' | 'color' | `theme.${keyof typeof themeDefaults}`;
export type PublicationFieldChange = ValueChange<string | boolean> & { field: PublicationField };
export type MaterialFieldChange =
  | ({ field: 'name' } & ValueChange<string>)
  | ({ field: 'width' | 'height' } & ValueChange<number>)
  | ({ field: 'reference' } & ValueChange<Artwork['reference']>);
export type MaterialChanges<T extends Material> = {
  added: T[];
  removed: T[];
  modified: { id: string; before: T; after: T; changes: MaterialFieldChange[] }[];
  reordered: { id: string; name: string; before: number; after: number }[];
};
export type PublicationEventDiff = {
  hasChanges: boolean;
  fields: PublicationFieldChange[];
  artworks: MaterialChanges<Artwork>;
  stickers: MaterialChanges<Material>;
};

// Public parsing strips unknown/private fields; file paths never identify a material.
function normalize(event: EventConfig): EventConfig {
  return parseEvent({ ...event,
    artworks: event.artworks.map(item => ({ ...item, file: 'material.png' })),
    stickers: event.stickers.map(item => ({ ...item, file: 'material.png' })),
  }, event.slug, { allowEmptyArtworks: true });
}
function materials<T extends Material>(before: T[], after: T[]): MaterialChanges<T> {
  const old = new Map(before.map(item => [item.id, item]));
  const next = new Map(after.map(item => [item.id, item]));
  const commonBefore = before.filter(item => next.has(item.id)).map(item => item.id);
  const commonAfter = after.filter(item => old.has(item.id)).map(item => item.id);
  const result: MaterialChanges<T> = { added: after.filter(item => !old.has(item.id)), removed: before.filter(item => !next.has(item.id)), modified: [], reordered: [] };
  for (const item of after) {
    const previous = old.get(item.id);
    if (!previous) continue;
    const changes: MaterialFieldChange[] = [];
    if (previous.name !== item.name) changes.push({ field: 'name', before: previous.name, after: item.name });
    if ('reference' in previous && 'reference' in item) {
      const a = previous as unknown as Artwork, b = item as unknown as Artwork;
      for (const field of ['width', 'height'] as const) if (a[field] !== b[field]) changes.push({ field, before: a[field], after: b[field] });
      if ((['x', 'y', 'width', 'height'] as const).some(key => a.reference[key] !== b.reference[key])) changes.push({ field: 'reference', before: a.reference, after: b.reference });
    }
    if (changes.length) result.modified.push({ id: item.id, before: previous, after: item, changes });
    // Insertions/removals alone do not mean existing items were reordered.
    if (commonBefore.indexOf(item.id) !== commonAfter.indexOf(item.id)) result.reordered.push({ id: item.id, name: item.name, before: before.findIndex(value => value.id === item.id) + 1, after: after.indexOf(item) + 1 });
  }
  return result;
}

/** Pure, ID-based comparison of saved public content. Throws for invalid public configs. */
export function comparePublicationEvents(before: EventConfig, after: EventConfig): PublicationEventDiff {
  const a = normalize(before), b = normalize(after);
  const fields: PublicationFieldChange[] = [];
  for (const field of ['slug', 'name', 'endsAt', 'demo', 'color'] as const) {
    const old = field === 'color' ? a[field].toLowerCase() : a[field];
    const next = field === 'color' ? b[field].toLowerCase() : b[field];
    if (old !== next) fields.push({ field, before: old, after: next });
  }
  for (const key of Object.keys(themeDefaults) as (keyof typeof themeDefaults)[]) {
    const old = (a.theme ?? themeDefaults)[key].toLowerCase(), next = (b.theme ?? themeDefaults)[key].toLowerCase();
    if (old !== next) fields.push({ field: `theme.${key}`, before: old, after: next });
  }
  const artworks = materials(a.artworks, b.artworks), stickers = materials(a.stickers, b.stickers);
  const changed = (group: MaterialChanges<Material>) => Object.values(group).some(items => items.length > 0);
  return { fields, artworks, stickers, hasChanges: fields.length > 0 || changed(artworks) || changed(stickers) };
}
