'use client';

import dynamic from 'next/dynamic';
import { StudioSkeleton } from './studio-skeleton';

// Mounted on the first visit to the campaign tab, then retained with its draft/photo.
const LazyWorkspace = dynamic(() => import('./studio-workspace').then(module => module.StudioWorkspace), {
  ssr: false,
  loading: () => <StudioSkeleton />,
});

export function CampaignStudio({ campaignId }: { campaignId: string }) {
  return <LazyWorkspace campaignId={campaignId} />;
}
