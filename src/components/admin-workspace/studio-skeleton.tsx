import './studio.css';
import './campaign-skeleton.css';

/** Shared by bundle and configuration loading; mirrors the active visual section. */
export function StudioSkeleton({ activeSection = 'artes' }: { activeSection?: string }) {
  const colors = activeSection === 'cores';
  const stickers = activeSection === 'stickers';
  const label = colors ? 'cores' : stickers ? 'figurinhas' : 'artes';
  return <section className="campaign-editor ws-studio-root ws-studio-skeleton" aria-label={`Carregando ${label}`} aria-busy="true">
    <span className="sr-only" role="status">Carregando {label}…</span>
    <div className="ws-studio-columns" aria-hidden="true">
      <div className="ws-studio-controls">
        <div className="ws-studio-skeleton-toolbar"><span className="ws-skeleton-block ws-skeleton-heading" /><span className="ws-skeleton-block ws-skeleton-button" /></div>
        {colors ? <div className="ws-skeleton-color-list">{[0, 1, 2, 3].map(item => <div className="ws-skeleton-color-row" key={item}><span className="ws-skeleton-block ws-skeleton-swatch" /><div><span className="ws-skeleton-block ws-skeleton-label" /><span className="ws-skeleton-block ws-skeleton-line" /></div><span className="ws-skeleton-block ws-skeleton-hex" /></div>)}</div> : <div className="ws-studio-rail">{[0, 1].map(item => <div className="ws-studio-asset" key={item}>
          <div className="ws-skeleton-block ws-studio-skeleton-art" />
          <div className="ws-studio-skeleton-card-footer"><span className="ws-skeleton-block ws-skeleton-line" /><div>{Array.from({ length: stickers ? 1 : 2 }, (_, action) => <span className="ws-skeleton-block ws-skeleton-icon" key={action} />)}</div></div>
        </div>)}</div>}
        <div className="ws-skeleton-footer"><span className="ws-skeleton-block ws-skeleton-button" /></div>
      </div>
      <div className="ws-studio-preview">
        <div className="ws-studio-preview-bar"><span className="ws-skeleton-block ws-skeleton-button" /></div>
        <div className="ws-studio-preview-content"><div className="ws-studio-skeleton-device"><span className="ws-skeleton-block ws-skeleton-line" /><div className="ws-skeleton-block ws-studio-skeleton-canvas" /><div className="ws-studio-skeleton-preview-tools">{[0, 1, 2].map(item => <span className="ws-skeleton-block ws-skeleton-icon" key={item} />)}</div></div></div>
      </div>
    </div>
  </section>;
}
