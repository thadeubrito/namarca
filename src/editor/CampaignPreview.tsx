'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, type CSSProperties } from 'react';
import { campaignThemeStyle } from '@/lib/campaigns/campaigns';
import { validatePreview, type PreviewInput } from './preview-config';
import './isolated.css';

const PhotoEditor = dynamic(() => import('./PhotoEditor').then(module => module.PhotoEditor), { ssr: false, loading: () => <span className="sr-only" role="status">Preparando editor…</span> });
export function CampaignPreview(input: PreviewInput) {
  return <PreviewSession key={input.campaignId} {...input} />;
}
function PreviewSession(input: PreviewInput) {
  const [config, setConfig] = useState<(ReturnType<typeof validatePreview> & { campaignId: string }) | null>(null);
  const [warning, setWarning] = useState(false);
  const { campaignId, event, selectedArtworkId, localAssets, adminTheme } = input;
  useEffect(() => {
    try {
      // Validation depends on the browser origin and preserves the last valid draft.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfig({ ...validatePreview({ campaignId, event, selectedArtworkId, localAssets, adminTheme }, window.location.origin), campaignId });
      setWarning(false);
    } catch { setWarning(true); }
  }, [campaignId, event, selectedArtworkId, localAssets, adminTheme]);
  return <div className="campaign-editor-scope editor-preview" aria-label="Prévia real do editor da campanha">
    {warning && <p className="preview-warning" role="alert">Prévia pausada: corrija os campos inválidos. A última configuração válida permanece visível.</p>}
    {!config ? <span className="sr-only" role="status">Aguardando configuração da prévia…</span> :
      <div className="editor-page" data-admin-theme={config.adminTheme} style={campaignThemeStyle(config.event) as CSSProperties}>
        <PhotoEditor event={config.event} assetUrls={config.assetUrls} assetBase={`/api/campaigns/${config.campaignId}/assets`} preferredArtworkId={config.selectedArtworkId} />
      </div>}
  </div>;
}
