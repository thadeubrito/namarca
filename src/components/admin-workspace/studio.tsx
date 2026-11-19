'use client';

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';

// The editor bundle, resource fetch and iframe mount only after the first click.
// Keep the loaded workspace mounted on close to preserve local draft/photo state.
const LazyWorkspace = dynamic(() => import('./studio-workspace').then(module => module.StudioWorkspace), { ssr: false });

export function CampaignStudio({ campaignId, campaignName }: { campaignId: string; campaignName?: string }) {
  const [opened, setOpened] = useState(false);
  const [visited, setVisited] = useState(false);
  const launch = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpened(false);
    requestAnimationFrame(() => launch.current?.focus({ preventScroll: true }));
  };
  return <>
    <button ref={launch} type="button" className="ws-action ws-action-primary" onClick={() => { setVisited(true); setOpened(true); }}><Maximize2 aria-hidden />Abrir estúdio</button>
    {visited && <LazyWorkspace campaignId={campaignId} campaignName={campaignName} fullscreen={opened} onClose={close} />}
  </>;
}
