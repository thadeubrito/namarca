'use client';

import { useSearchParams } from 'next/navigation';
import { CampaignPageSkeleton } from '@/components/admin-workspace/campaign-skeleton';
import { campaignSection } from '@/lib/campaign-section';

export default function CampaignLoading() {
  const searchParams = useSearchParams();
  // Availability is resolved by the page; this boundary contains no campaign data.
  return <CampaignPageSkeleton section={campaignSection(searchParams.get('aba'), true, true)} />;
}
