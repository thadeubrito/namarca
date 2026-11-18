'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { themeDefaults, type Artwork, type EventConfig, type Material } from '@/editor/shared/events/events';
import { clampReference, ReferenceCanvas } from '@/editor/reference-canvas';
import './campaign-editor.css';

type Snapshot = { event: EventConfig; revision: number };
type Kind = 'artwork' | 'sticker';
const labels: Record<keyof typeof themeDefaults, string> = { background: 'Fundo', surface: 'Painéis', text: 'Texto', mutedText: 'Texto secundário', primary: 'Botões', onPrimary: 'Texto dos botões', accent: 'Destaque', border: 'Bordas' };

export function CampaignEditor({ campaignId }: { campaignId: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const dirty = !!event && !!snapshot && JSON.stringify(event) !== JSON.stringify(snapshot.event);
  const assetURL = (file: string) => `/api/campaigns/${campaignId}/assets/${encodeURIComponent(file.replace(/\.png$/, ''))}`;
  const load = useCallback(async () => {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/editor`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível carregar a configuração.');
      const value: Snapshot = await response.json();
      setSnapshot(value); setEvent(value.event); setConflict(false); setSelected(value.event.artworks[0]?.id ?? '');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao carregar.'); }
    finally { setBusy(false); }
  }, [campaignId]);
  // Initial authenticated resource fetch; the request also powers explicit reloads.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const navigate = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest('a[href]') as HTMLAnchorElement | null : null;
      if (!link || link.target === '_blank' || link.hasAttribute('download') || link.href === window.location.href || link.getAttribute('href')?.startsWith('#')) return;
      if (!window.confirm('Você tem alterações não salvas no estúdio. Sair e descartá-las?')) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', navigate, true); };
  }, [dirty]);
  const sendPreview = useCallback(() => {
    if (event) frame.current?.contentWindow?.postMessage({ type: 'namarca:preview', campaignId, event }, window.location.origin);
  }, [campaignId, event]);
  useEffect(() => {
    sendPreview();
    const ready = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && e.data?.type === 'namarca:preview-ready' && e.data.campaignId === campaignId) sendPreview();
    };
    window.addEventListener('message', ready);
    return () => window.removeEventListener('message', ready);
  }, [sendPreview, campaignId]);
  const change = (next: EventConfig) => { setEvent(next); setMessage(''); };
  const save = async () => {
    if (!event || !snapshot) return;
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/editor`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, revision: snapshot.revision }) });
      if (response.status === 409) { setConflict(true); throw new Error('Outra sessão alterou esta configuração. Seu rascunho foi preservado. Recarregue a versão salva antes de continuar.'); }
      if (!response.ok) throw new Error('Não foi possível salvar. Confira nomes, referências e imagens e tente novamente.');
      const value: Snapshot = await response.json();
      setSnapshot(value); setEvent(value.event); setConflict(false); setMessage('Configuração salva. A campanha não foi publicada.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao salvar.'); }
    finally { setBusy(false); }
  };
  const upload = async (file: File | undefined, kind: Kind) => {
    if (!file || !event) return;
    if (file.type !== 'image/png') { setMessage('Selecione um arquivo PNG.'); return; }
    setBusy(true); setMessage('Enviando material PNG…');
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/assets?kind=${kind}`, { method: 'POST', headers: { 'Content-Type': 'image/png', 'X-Asset-Name': encodeURIComponent(file.name.replace(/\.png$/i, '')) }, body: file });
      if (!response.ok) throw new Error('Não foi possível enviar o PNG. Verifique o formato e o tamanho.');
      const { material } = await response.json() as { material: Artwork };
      if (kind === 'artwork') { setEvent(current => current && ({ ...current, artworks: [...current.artworks, material] })); setSelected(material.id); }
      else setEvent(current => current && ({ ...current, stickers: [...current.stickers, { id: material.id, name: material.name, file: material.file }] }));
      setMessage('Material enviado e adicionado ao rascunho. Salve a configuração para confirmar.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha no envio.'); }
    finally { setBusy(false); }
  };
  if (!event) return <section className="campaign-editor"><h2>Estúdio da campanha</h2><p role="status">{message || 'Carregando configuração…'}</p>{!busy && <button type="button" onClick={() => void load()}>Tentar novamente</button>}</section>;
  const artwork = event.artworks.find(a => a.id === selected) ?? event.artworks[0];
  const updateReference = (reference: Artwork['reference']) => {
    if (artwork) change({ ...event, artworks: event.artworks.map(a => a.id === artwork.id ? { ...a, reference: clampReference(reference, a.width, a.height) } : a) });
  };
  const gallery = (kind: Kind, items: Material[]) => {
    const key = kind === 'artwork' ? 'artworks' : 'stickers';
    const move = (index: number, delta: number) => {
      const list = [...event[key]];
      [list[index], list[index + delta]] = [list[index + delta], list[index]];
      change({ ...event, [key]: list });
    };
    return <section className="ce-section"><header><h3>{kind === 'artwork' ? 'Artes' : 'Stickers'}</h3><label className="ce-upload">{kind === 'artwork' ? 'Adicionar arte PNG' : 'Adicionar sticker PNG'}<input type="file" accept="image/png" disabled={busy} onChange={e => { void upload(e.currentTarget.files?.[0], kind); e.currentTarget.value = ''; }} /></label></header>
      {!items.length && <p className="ce-muted">{kind === 'artwork' ? 'Rascunho sem artes. Adicione um PNG para liberar a prévia.' : 'Nenhum sticker adicionado.'}</p>}
      <ol className="ce-materials">{items.map((item, index) => <li key={item.id} className={artwork?.id === item.id ? 'is-selected' : ''}>
        <button type="button" className="ce-thumbnail" disabled={kind === 'sticker' || busy} onClick={() => setSelected(item.id)} aria-label={`Editar área da foto: ${item.name}`}><img src={assetURL(item.file)} alt={item.name} /></button>
        <input aria-label={`Nome ${kind === 'artwork' ? 'da arte' : 'do sticker'} ${index + 1}`} value={item.name} disabled={busy} onChange={e => change({ ...event, [key]: event[key].map(a => a.id === item.id ? { ...a, name: e.target.value } : a) })} />
        <div className="ce-order"><button type="button" disabled={busy || !index} onClick={() => move(index, -1)} aria-label={`Mover ${item.name} para cima`}>↑</button><button type="button" disabled={busy || index === items.length - 1} onClick={() => move(index, 1)} aria-label={`Mover ${item.name} para baixo`}>↓</button><button type="button" disabled={busy} onClick={() => change({ ...event, [key]: event[key].filter(a => a.id !== item.id) })} aria-label={`Remover ${item.name}`}>Remover</button></div>
      </li>)}</ol></section>;
  };
  return <section className="campaign-editor" aria-label="Estúdio da campanha">
    <header className="ce-heading"><div><span className="ce-eyebrow">Estúdio / rascunho</span><h2>Materiais e experiência</h2><p>Configure o visual e experimente com uma foto local. Fotos e composições nunca são enviadas ao servidor.</p></div><button type="button" disabled={busy || !dirty || conflict} onClick={() => void save()}>{busy ? 'Aguarde…' : 'Salvar configuração'}</button></header>
    <div className="ce-feedback" role="status">{message || (dirty ? 'Alterações não salvas. A prévia mostra o rascunho atual.' : `Configuração salva · revisão ${snapshot?.revision}`)}</div>
    {conflict && <button type="button" disabled={busy} onClick={() => { if (window.confirm('Descartar suas alterações e carregar a configuração salva?')) void load(); }}>Recarregar versão salva</button>}
    <div className="ce-grid"><div className="ce-controls"><fieldset disabled={busy} className="ce-fieldset">{gallery('artwork', event.artworks)}{gallery('sticker', event.stickers)}
      {artwork && <section className="ce-section"><h3>Área da foto · {artwork.name}</h3><p className="ce-muted">Desenhe fora da seleção para criar uma área, arraste para mover ou use as alças para redimensionar.</p><ReferenceCanvas key={artwork.id} artwork={artwork} assetURL={assetURL(artwork.file)} onChange={updateReference} /><div className="ce-numbers">{(['x', 'y', 'width', 'height'] as const).map(key => <label key={key}>{({ x: 'X', y: 'Y', width: 'Largura', height: 'Altura' })[key]}<input type="number" step="1" min={key === 'x' || key === 'y' ? 0 : 1} max={key === 'x' || key === 'width' ? artwork.width : artwork.height} value={artwork.reference[key]} onChange={e => { if (Number.isFinite(e.currentTarget.valueAsNumber)) updateReference({ ...artwork.reference, [key]: e.currentTarget.valueAsNumber }); }} /></label>)}</div></section>}
      <section className="ce-section"><h3>Cores da experiência</h3><div className="ce-colors">{(Object.keys(themeDefaults) as Array<keyof typeof themeDefaults>).map(key => <label key={key}><input type="color" value={event.theme?.[key] ?? themeDefaults[key]} onChange={e => change({ ...event, theme: { ...event.theme, [key]: e.target.value } })} />{labels[key]}</label>)}<label><input type="color" value={event.color} onChange={e => change({ ...event, color: e.target.value })} />Cor da campanha</label></div></section>
    </fieldset></div><aside className="ce-preview"><header><h3>Prévia interativa</h3><span>Rascunho atual</span></header><p className="ce-muted">Envie uma foto neste editor, ajuste, adicione stickers e exporte um PNG no seu dispositivo.</p><iframe ref={frame} src={`/admin/campanhas/${campaignId}/previa`} title="Prévia real do editor da campanha" onLoad={sendPreview} allow="web-share" /></aside></div>
  </section>;
}
