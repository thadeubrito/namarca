import './studio.css';

/** Shared by bundle and configuration loading; no fake interactive controls. */
export function StudioSkeleton() {
  return <section className="campaign-editor ws-studio-root ws-studio-skeleton" aria-label="Estúdio da campanha" aria-busy="true">
    <span className="sr-only" role="status">Carregando estúdio…</span>
    <div className="ws-studio-columns" aria-hidden="true">
      <div className="ws-studio-controls">
        <div className="ws-studio-skeleton-tabs"><span /><span /><span /></div>
        <div className="ws-studio-skeleton-toolbar"><span /><span /></div>
        <div className="ws-studio-rail">
          {[0, 1].map(item => <div className="ws-studio-asset" key={item}>
            <div className="ws-studio-skeleton-index" />
            <div className="ws-studio-skeleton-art" />
            <div className="ws-studio-skeleton-input" />
            <div className="ws-studio-skeleton-actions">{[0, 1, 2, 3].map(action => <span key={action} />)}</div>
          </div>)}
        </div>
        <div className="ws-studio-footer"><div className="ws-studio-skeleton-save" /></div>
      </div>
      <div className="ws-studio-preview">
        <div className="ws-studio-preview-bar"><span className="ws-studio-skeleton-toggle" /></div>
        <div className="ws-studio-preview-content"><div className="ws-studio-skeleton-device">
          <div className="ws-studio-skeleton-canvas" />
          <div className="ws-studio-skeleton-input" />
          <div className="ws-studio-skeleton-preview-tools"><span /><span /><span /></div>
        </div></div>
      </div>
    </div>
  </section>;
}
