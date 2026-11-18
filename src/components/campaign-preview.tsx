'use client';

/** Historical previews load their snapshot themselves, never from a mutable bridge. */
export function CampaignPreview({ campaignId, packageId }: { campaignId: string; packageId: string }) {
  return <iframe className="campaign-snapshot-frame" src={`/event-runtime/preview.html?campaignId=${encodeURIComponent(campaignId)}&packageId=${encodeURIComponent(packageId)}`} title="Prévia do pacote aprovado" allow="web-share" style={{ display: 'block', width: '100%', height: 'min(844px, 90dvh)', border: 0, marginTop: 16 }} />;
}
