import type { ReactNode } from 'react';
import { StudioSkeleton } from './studio-skeleton';
import './workspace.css';
import './campaign-skeleton.css';

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <span className={`ws-skeleton-block ${className}`} />;
}

function FieldSkeleton({ multiline = false }: { multiline?: boolean }) {
  return <div className="ws-skeleton-field"><SkeletonBlock className="ws-skeleton-label" /><SkeletonBlock className={multiline ? 'ws-skeleton-textarea' : 'ws-skeleton-control'} /></div>;
}

function FooterSkeleton() {
  return <div className="ws-skeleton-footer"><SkeletonBlock className="ws-skeleton-button" /></div>;
}

function Group({ children }: { children: ReactNode }) {
  return <div className="ws-form-group"><SkeletonBlock className="ws-skeleton-heading" />{children}</div>;
}

export function CampaignTabSkeleton({ section = 'dados' }: { section?: string }) {
  if (['artes', 'stickers', 'cores'].includes(section)) return <StudioSkeleton activeSection={section} />;
  const label = section === 'publicacao' ? 'publicação' : section === 'cobranca' ? 'cobrança' : 'detalhes';
  return <section className="ws-campaign-tab-skeleton" aria-busy="true" aria-label={`Carregando ${label}`}>
    <span className="sr-only" role="status">Carregando {label}…</span>
    <div aria-hidden="true">
      {section === 'publicacao' ? <>
        <div className="ws-skeleton-publication">{[0, 1].map(item => <Group key={item}><SkeletonBlock className="ws-skeleton-version" /><SkeletonBlock className="ws-skeleton-line" /><SkeletonBlock className="ws-skeleton-line ws-skeleton-short" /><FooterSkeleton /></Group>)}</div>
        {[0, 1].map(item => <div className="ws-skeleton-disclosure" key={item}><SkeletonBlock className="ws-skeleton-heading" /><SkeletonBlock className="ws-skeleton-line" /></div>)}
      </> : section === 'cobranca' ? <>
        <Group><div className="ws-skeleton-billing-form"><FieldSkeleton /><FieldSkeleton /><SkeletonBlock className="ws-skeleton-button" /></div><SkeletonBlock className="ws-skeleton-line" /></Group>
        {[0, 1].map(item => <Group key={item}><div className="ws-skeleton-ledger">{[0, 1, 2].map(row => <div className="ws-skeleton-ledger-row" key={row}>{[0, 1, 2, 3].map(cell => <SkeletonBlock className="ws-skeleton-line" key={cell} />)}</div>)}</div></Group>)}
      </> : <>
        <div className="ws-form-groups"><Group><FieldSkeleton /><FieldSkeleton /><FieldSkeleton /></Group><Group><FieldSkeleton /><FieldSkeleton multiline /></Group></div>
        <SkeletonBlock className="ws-skeleton-line ws-skeleton-privacy" /><FooterSkeleton />
      </>}
    </div>
  </section>;
}

export function CampaignPageSkeleton({ section = 'dados' }: { section?: string }) {
  return <div className="workspace ws-campaign-detail ws-campaign-page-skeleton" aria-busy="true">
    <div className="ws-skeleton-page-heading" aria-hidden="true"><SkeletonBlock className="ws-skeleton-back" /><SkeletonBlock className="ws-skeleton-page-title" /><SkeletonBlock className="ws-skeleton-badge" /></div>
    <div className="ws-tabs-workbench"><div className="ws-skeleton-navigation" aria-hidden="true">{Array.from({ length: 6 }, (_, item) => <SkeletonBlock className="ws-skeleton-nav-item" key={item} />)}</div><div className="ws-skeleton-panel"><CampaignTabSkeleton section={section} /></div></div>
  </div>;
}
