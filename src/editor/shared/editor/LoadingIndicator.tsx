import type { CSSProperties } from 'react'

export function LoadingIndicator({ label, style }: { label: string; style?: CSSProperties }) {
  return <div className="loading-overlay" style={style} role="status" aria-live="polite">
    <span className="loading-spinner" aria-hidden="true" />
    <span className="sr-only">{label}</span>
  </div>
}
