'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { themeDefaults, type EventConfig } from '@namarca/editor/events';
import { Action } from './primitives';

type ThemeKey = keyof typeof themeDefaults;
const groups: { title: string; fields: { key: ThemeKey; label: string }[] }[] = [
  { title: 'Superfícies', fields: [{ key: 'background', label: 'Fundo' }, { key: 'surface', label: 'Painéis' }, { key: 'border', label: 'Bordas' }] },
  { title: 'Textos', fields: [{ key: 'text', label: 'Texto' }, { key: 'mutedText', label: 'Texto secundário' }] },
  { title: 'Ações e destaque', fields: [{ key: 'primary', label: 'Botões' }, { key: 'onPrimary', label: 'Texto dos botões' }, { key: 'accent', label: 'Destaque' }] },
];

function ColorControl({ label, value, disabled, onChange }: { label: string; value: string; disabled: boolean; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft !== null && !/^#[0-9a-f]{6}$/i.test(draft);
  return <div className="ws-color-control">
    <label className="ws-color-picker" style={{ backgroundColor: value }}>
      <input type="color" aria-label={label} value={value} disabled={disabled} onChange={e => { setDraft(null); onChange(e.target.value); }} />
      <span className="sr-only">Escolher {label.toLowerCase()}</span>
    </label>
    <label className="ws-color-value"><span>{label}</span><input aria-label={`Código HEX: ${label}`} type="text" value={draft ?? value.toUpperCase()} disabled={disabled} maxLength={7} spellCheck={false} autoComplete="off" aria-invalid={invalid} onChange={e => {
      const next = e.target.value;
      setDraft(next);
      if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next.toLowerCase());
    }} onBlur={() => setDraft(null)} onKeyDown={e => {
      if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); setDraft(null); e.currentTarget.blur(); }
    }} /></label>
  </div>;
}

export function StudioColors({ event, disabled, onChange }: { event: EventConfig; disabled: boolean; onChange: (event: EventConfig) => void }) {
  const customized = event.color.toLowerCase() !== '#173f35' || (Object.keys(themeDefaults) as ThemeKey[]).some(key => (event.theme?.[key] ?? themeDefaults[key]).toLowerCase() !== themeDefaults[key].toLowerCase());
  return <div className="ws-studio-palette">
    <header className="ws-colors-heading"><div><h3>Cores da experiência</h3></div><Action variant="ghost" disabled={disabled || !customized} onClick={() => {
      if (window.confirm('Restaurar todas as cores padrão? A mudança só será gravada ao salvar o estúdio.')) onChange({ ...event, color: '#173f35', theme: { ...themeDefaults } });
    }}><RotateCcw size={16} aria-hidden />Restaurar padrão</Action></header>
    <section className="ws-color-section ws-color-brand"><div><h4>Identidade da campanha</h4></div><ColorControl label="Cor da campanha" value={event.color} disabled={disabled} onChange={color => onChange({ ...event, color })} /></section>
    {groups.map(group => <section className="ws-color-section" key={group.title}><h4>{group.title}</h4><div className="ws-color-grid">{group.fields.map(({ key, label }) => <ColorControl key={key} label={label} value={event.theme?.[key] ?? themeDefaults[key]} disabled={disabled} onChange={value => onChange({ ...event, theme: { ...event.theme, [key]: value } })} />)}</div></section>)}
  </div>;
}
