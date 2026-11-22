import { parseEvent, type EventConfig } from '@namarca/editor/events';
import { publicationPointer } from './publication-access';

/** Access changes never adopt a draft or rewrite asset references from a delivered snapshot. */
export async function deliverPublicationAccess(
  publication: { config: EventConfig; version: number },
  suspended: boolean,
  storage: {
    exists: (key: string) => Promise<boolean>;
    put: (key: string, body: Uint8Array, contentType: 'application/json') => Promise<unknown>;
  },
) {
  const { version } = publication;
  const pointer = publicationPointer(version, suspended);
  const event = parseEvent(publication.config, publication.config.slug);
  const base = `public/events/${event.slug}`;
  const versionKey = `${base}/versions/v${version}.json`;
  // Migration 0014 numbered DB rows, not storage objects. Delivered legacy
  // manifests use releases/hash assets, which must remain unchanged here.
  // Also repairs a pointer previously written by the buggy access action.
  // Existing immutable versions must never be overwritten on an access toggle.
  if (!await storage.exists(versionKey)) {
    await storage.put(versionKey, Buffer.from(JSON.stringify(event)), 'application/json');
  }
  await storage.put(`${base}/event.json`, Buffer.from(JSON.stringify(pointer)), 'application/json');
}
