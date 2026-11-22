'use client';

import dynamic from 'next/dynamic';
import { createContext, useContext } from 'react';
import { StudioSkeleton } from './studio-skeleton';

const LoadingSection = createContext<string | undefined>('artes');
function StudioLoading() {
  return <StudioSkeleton activeSection={useContext(LoadingSection)} />;
}

// Mounted once for recovery, then retained with its draft/photo.
const LazyWorkspace = dynamic(() => import('./studio-workspace').then(module => module.StudioWorkspace), {
  ssr: false,
  loading: () => <StudioLoading />,
});

export function CampaignStudio(props: { campaignId: string; activeSection?: string; onPendingChange?: (section: string, pending: boolean) => void }) {
  return <LoadingSection.Provider value={props.activeSection}><LazyWorkspace {...props} /></LoadingSection.Provider>;
}
