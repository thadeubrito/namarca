'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, type CSSProperties } from 'react';
import { eventThemeStyle, parseEvent, type EventConfig } from '@/editor/shared/events/events';
import '@/editor/editor.css';
import '@/editor/preview.css';

const PhotoEditor = dynamic(() => import('@/editor/shared/editor/PhotoEditor').then(module => module.PhotoEditor), { ssr: false, loading: () => <p>Preparando editor…</p> });

export function CampaignPreview({ campaignId, initialEvent }: { campaignId: string; initialEvent?: EventConfig }) {
  const [event, setEvent] = useState<EventConfig | null>(initialEvent ?? null);
  useEffect(() => {
    if (initialEvent) return;
    const receive = (message: MessageEvent) => {
      if (message.origin !== window.location.origin || message.source !== window.parent || message.data?.type !== 'namarca:preview' || message.data.campaignId !== campaignId) return;
      // Only configuration crosses this bridge. Participant photos remain in this frame.
      try {
        const value = message.data.event as EventConfig;
        const valid = parseEvent(value, value.slug, { allowEmptyArtworks: true });
        const privateFile = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i;
        if ([...valid.artworks, ...valid.stickers].some(material => !privateFile.test(material.file))) return;
        setEvent(valid);
      } catch { /* Keep the last valid preview while an input is incomplete. */ }
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'namarca:preview-ready', campaignId }, window.location.origin);
    return () => window.removeEventListener('message', receive);
  }, [campaignId, initialEvent]);
  if (!event) return <p role="status">Aguardando configuração da prévia…</p>;
  if (!event.artworks.length) return <p>Adicione uma arte PNG para experimentar o editor.</p>;
  return <div className="editor-page" style={eventThemeStyle(event) as CSSProperties}><PhotoEditor event={event} assetBase={`/api/campaigns/${campaignId}/assets`} /></div>;
}
