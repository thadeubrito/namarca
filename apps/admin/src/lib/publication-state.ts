import type { EventConfig } from '@namarca/editor/events';
import { comparePublicationEvents } from './publication-diff';

// One semantic contract for the publication badge and the administrative comparison.
export function hasUnpublishedChanges(draft: EventConfig, published: EventConfig): boolean {
  return comparePublicationEvents(published, draft).hasChanges;
}
