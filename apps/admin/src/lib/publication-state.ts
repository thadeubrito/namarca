import type { CampaignConfig } from '@namarca/editor/campaigns';
import { comparePublicationCampaigns } from './publication-diff';

// One semantic contract for the publication badge and the administrative comparison.
export function hasUnpublishedChanges(draft: CampaignConfig, published: CampaignConfig): boolean {
  return comparePublicationCampaigns(published, draft).hasChanges;
}
