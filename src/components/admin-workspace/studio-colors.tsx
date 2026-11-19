'use client';

import { useState } from 'react';
import { Pipette, RotateCcw } from 'lucide-react';
import { contrastText, themeDefaults, type EventConfig } from '@namarca/editor/events';
import { Action } from './primitives';

type ThemeKey = keyof typeof themeDefaults;
const fields: { key: ThemeKey; label: string; hint: string }[] = [
  { key: 'background', label: 'Fundo', hint: 'Área ao redor da composição' },
  { key: 'surface', label: 'Painéis', hint: 'Menus e barra de ferramentas' },
  { key: 'accent', label: 'Destaque', hint: 'Botões, seleção e foco' },
  { key: 'text', label: 'Texto', hint: 'Textos e ícones dos painéis' },
];

function ColorControl({ label, hint, value, disabled, onChange }: { label: string; hint: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft !== null && !/^#[0-9a-f]{6}$/i.test(draft);
  return <div className="ws-color-control">
    <label className="ws-color-picker" style={{ backgroundColor: value, color: contrastText(value) }}>
      <span className="ws-color-swatch-name" aria-hidden="true">{label}</span><Pipette size={18} aria-hidden="true" />
      <input type="color" aria-label={label} value={value} disabled={disabled} onChange={e => { setDraft(null); onChange(e.target.value); }} />
      <span className="sr-only">Escolher {label.toLowerCase()}</span>
    </label>
    <label className="ws-color-value"><span>{hint}</span><input aria-label={`Código HEX: ${label}`} type="text" value={draft ?? value.toUpperCase()} disabled={disabled} maxLength={7} spellCheck={false} autoComplete="off" aria-invalid={invalid} onChange={e => {
      const next = e.target.value;
      setDraft(next);
      if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next.toLowerCase());
    }} onBlur={() => setDraft(null)} onKeyDown={e => {
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); setDraft(null); e.currentTarget.blur(); }
    }} /></label>
  </div>;
}

export function StudioColors({ event, disabled, onChange }: { event: EventConfig; disabled: boolean; onChange: (event: EventConfig) => void }) {
  const theme = event.theme ?? { version: 1, ...themeDefaults };
  const customized = (Object.keys(themeDefaults) as ThemeKey[]).some(key => (event.theme?.[key] ?? themeDefaults[key]).toLowerCase() !== themeDefaults[key].toLowerCase());
  return <div className="ws-studio-palette">
    <header className="ws-colors-heading"><div><h3>Cores da experiência</h3></div><Action variant="ghost" disabled={disabled || !customized} onClick={() => {
      if (window.confirm('Restaurar todas as cores padrão? A mudança só será gravada ao salvar o estúdio.')) onChange({ ...event, theme: { version: 1, ...themeDefaults } });
    }}><RotateCcw size={16} aria-hidden />Restaurar padrão</Action></header>
    <div className="ws-color-grid">{fields.map(({ key, label, hint }) => <ColorControl key={key} label={label} hint={hint} value={theme[key]} disabled={disabled} onChange={value => onChange({ ...event, theme: { ...theme, [key]: value } })} />)}</div>
  </div>;
}
