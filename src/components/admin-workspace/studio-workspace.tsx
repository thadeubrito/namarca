'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { themeDefaults, type Artwork, type EventConfig, type Material } from '@namarca/editor/events';
import { clampReference, ReferenceCanvas } from '@/editor/reference-canvas';
import { uploadFailureMessage } from '@/lib/upload-feedback';
import { Action, Surface, Field, TextInput, Notice, EmptyState, Workspace, Pill, WorkspaceTabs } from './primitives';
import './studio.css';

type Snapshot = { event: EventConfig; revision: number };
type Kind = 'artwork' | 'sticker';
const labels: Record<keyof typeof themeDefaults, string> = { background: 'Fundo', surface: 'Painéis', text: 'Texto', mutedText: 'Texto secundário', primary: 'Botões', onPrimary: 'Texto dos botões', accent: 'Destaque', border: 'Bordas' };

export function StudioWorkspace({ campaignId, campaignName = 'Campanha', fullscreen, onClose }: { campaignId: string; campaignName?: string; fullscreen: boolean; onClose: () => void }) {
  const [mobileArea, setMobileArea] = useState('materials');
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const root = useRef<HTMLElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!fullscreen || !root.current) return;
    const previousOverflow = document.body.style.overflow;
    const isolated: { node: HTMLElement; inert: boolean }[] = [];
    let node: HTMLElement = root.current;
    while (node.parentElement && node.parentElement !== document.body) {
      for (const sibling of node.parentElement.children) {
        if (sibling !== node && sibling instanceof HTMLElement && !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) {
          isolated.push({ node: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      node = node.parentElement;
    }
    document.body.style.overflow = 'hidden';
    back.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      for (const item of isolated) item.node.inert = item.inert;
    };
  }, [fullscreen]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [selected, setSelected] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const [failure, setFailure] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const reducedMotion = useReducedMotion();
  const dirty = !!event && !!snapshot && JSON.stringify(event) !== JSON.stringify(snapshot.event);
  const assetURL = (file: string) => `/api/campaigns/${campaignId}/assets/${encodeURIComponent(file.replace(/\.png$/, ''))}`;

  const load = useCallback(async () => {
    setBusy(true); setMessage(''); setFailure(false);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/editor`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível carregar a configuração.');
      const value: Snapshot = await response.json();
      setSnapshot(value); setEvent(value.event); setConflict(false); setSelected(value.event.artworks[0]?.id ?? '');
    } catch (error) { setFailure(true); setMessage(error instanceof Error ? error.message : 'Falha ao carregar.'); }
    finally { setBusy(false); }
  }, [campaignId]);
  // Fetch inicial e recarga explícita usam o mesmo recurso autenticado.
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
    const submit = (e: SubmitEvent) => {
      if (e.defaultPrevented || !(e.target instanceof HTMLFormElement)) return;
      if (e.target.dataset.campaignApproval === 'true') {
        e.preventDefault(); e.stopPropagation();
        window.alert('Salve as alterações do estúdio e recarregue a página antes de registrar a aprovação. A prévia atual ainda não está salva.');
        return;
      }
      if (e.target.dataset.campaignNavigation !== 'true') return;
      if (!window.confirm('Você tem alterações não salvas no estúdio. Salvar os dados da campanha pode descartá-las. Continuar sem salvar o estúdio?')) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', navigate, true);
    document.addEventListener('submit', submit, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', navigate, true); document.removeEventListener('submit', submit, true); };
  }, [dirty]);

  const sendPreview = useCallback(() => {
    if (event) frame.current?.contentWindow?.postMessage({ type: 'namarca:preview', campaignId, event, selectedArtworkId: event.artworks.some(art => art.id === selected) ? selected : event.artworks[0]?.id }, window.location.origin);
  }, [campaignId, event, selected]);
  useEffect(() => {
    sendPreview();
    const ready = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && e.data?.type === 'namarca:preview-ready' && e.data.campaignId === campaignId) { setPreviewReady(true); sendPreview(); }
    };
    window.addEventListener('message', ready);
    return () => window.removeEventListener('message', ready);
  }, [sendPreview, campaignId]);

  const change = (next: EventConfig) => { setEvent(next); setMessage(''); setFailure(false); };
  const save = async () => {
    if (!event || !snapshot) return;
    setBusy(true); setMessage(''); setFailure(false);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/editor`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, revision: snapshot.revision }) });
      if (response.status === 409) { setConflict(true); throw new Error('Outra sessão alterou esta configuração. Seu rascunho foi preservado. Recarregue a versão salva antes de continuar.'); }
      if (!response.ok) throw new Error('Não foi possível salvar. Confira nomes, referências e imagens e tente novamente.');
      const value: Snapshot = await response.json();
      setSnapshot(value); setEvent(value.event); setConflict(false); setMessage('Configuração salva. A campanha não foi publicada.');
    } catch (error) { setFailure(true); setMessage(error instanceof Error ? error.message : 'Falha ao salvar.'); }
    finally { setBusy(false); }
  };
  const upload = async (file: File | undefined, kind: Kind) => {
    if (!file || !event) return;
    setFailure(false);
    if (file.type !== 'image/png') { setFailure(true); setMessage('Selecione um arquivo PNG.'); return; }
    if (file.size > 25 * 1024 * 1024) { setFailure(true); setMessage('O PNG excede o limite de 25 MiB. Reduza o arquivo e tente novamente.'); return; }
    setBusy(true); setMessage('Enviando material PNG…');
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/assets?kind=${kind}`, { method: 'POST', headers: { 'Content-Type': 'image/png', 'X-Asset-Name': encodeURIComponent(file.name.replace(/\.png$/i, '')) }, body: file });
      if (!response.ok) throw new Error(await uploadFailureMessage(response));
      const { material } = await response.json() as { material: Artwork };
      if (kind === 'artwork') { setEvent(current => current && ({ ...current, artworks: [...current.artworks, material] })); setSelected(material.id); }
      else setEvent(current => current && ({ ...current, stickers: [...current.stickers, { id: material.id, name: material.name, file: material.file }] }));
      setMessage('Material adicionado. Salve para confirmar.');
    } catch (error) { setFailure(true); setMessage(error instanceof Error ? error.message : 'Falha no envio.'); }
    finally { setBusy(false); }
  };

  if (!event) return <section ref={root} className="campaign-editor ws-studio-root" data-fullscreen={fullscreen} aria-label="Estúdio da campanha" hidden={!fullscreen}><div className="ws-studio-workspace"><Workspace><div className="ws-studio-toolbar"><button ref={back} type="button" className="ws-action ws-action-ghost" onClick={onClose}><ArrowLeft aria-hidden />Voltar à campanha</button><h2>Estúdio</h2></div><Surface><p role="status">{message || 'Carregando estúdio…'}</p>{!busy && <Action type="button" onClick={() => void load()}>Tentar novamente</Action>}</Surface></Workspace></div></section>;

  const artwork = event.artworks.find(a => a.id === selected) ?? event.artworks[0];
  const updateReference = (reference: Artwork['reference']) => {
    if (artwork) change({ ...event, artworks: event.artworks.map(a => a.id === artwork.id ? { ...a, reference: clampReference(reference, a.width, a.height) } : a) });
  };
  const library = (kind: Kind, items: Material[]) => {
    const key = kind === 'artwork' ? 'artworks' : 'stickers';
    const move = (index: number, delta: number) => {
      const list = [...event[key]];
      [list[index], list[index + delta]] = [list[index + delta], list[index]];
      change({ ...event, [key]: list });
    };
    return <div className="ws-studio-library">
      <div className="ws-studio-library-bar"><div><h3>{kind === 'artwork' ? 'Biblioteca de artes' : 'Biblioteca de stickers'}</h3><span>{items.length} {items.length === 1 ? 'material' : 'materiais'}</span></div>
        <Field label={kind === 'artwork' ? 'Adicionar arte PNG' : 'Adicionar sticker PNG'} hint="PNG · até 25 MiB"><TextInput type="file" accept="image/png" disabled={busy} onChange={e => { void upload(e.currentTarget.files?.[0], kind); e.currentTarget.value = ''; }} /></Field>
      </div>
      {!items.length ? <EmptyState title={kind === 'artwork' ? 'Sua biblioteca de artes está vazia' : 'Nenhum sticker adicionado.'} description={kind === 'artwork' ? 'Adicione uma arte PNG para abrir a prévia.' : 'Adicione arquivos PNG para disponibilizá-los na composição.'} /> :
        <ol className="ws-studio-rail" aria-label={kind === 'artwork' ? 'Artes da campanha' : 'Stickers da campanha'}>{items.map((item, index) => <li key={item.id} className="ws-studio-asset" data-selected={kind === 'artwork' && artwork?.id === item.id}>
          <div className="ws-studio-asset-top"><span className="ws-studio-index">{String(index + 1).padStart(2, '0')}</span>{kind === 'artwork' && artwork?.id === item.id && <Pill tone="success">Em edição</Pill>}</div>
          {kind === 'artwork' ? <Action type="button" variant="ghost" className="ws-studio-thumbnail" disabled={busy} onClick={() => setSelected(item.id)} aria-pressed={artwork?.id === item.id} aria-label={`Editar área da foto: ${item.name}`}><img src={assetURL(item.file)} alt={item.name} /></Action> : <div className="ws-studio-thumbnail"><img src={assetURL(item.file)} alt={item.name} /></div>}
          <TextInput aria-label={`Nome ${kind === 'artwork' ? 'da arte' : 'do sticker'} ${index + 1}`} value={item.name} disabled={busy} onChange={e => change({ ...event, [key]: event[key].map(a => a.id === item.id ? { ...a, name: e.target.value } : a) })} />
          <div className="ws-studio-asset-actions"><Action type="button" variant="ghost" disabled={busy || !index} onClick={() => move(index, -1)} aria-label={`Mover ${item.name} para cima`}>↑</Action><Action type="button" variant="ghost" disabled={busy || index === items.length - 1} onClick={() => move(index, 1)} aria-label={`Mover ${item.name} para baixo`}>↓</Action><Action type="button" variant="danger" disabled={busy} onClick={() => change({ ...event, [key]: event[key].filter(a => a.id !== item.id) })} aria-label={`Remover ${item.name}`}>Remover</Action></div>
        </li>)}</ol>}
    </div>;
  };
  const colors = <div className="ws-studio-palette"><div className="ws-studio-panel-heading"><h3>Paleta do editor</h3><p>As cores são aplicadas à experiência da campanha.</p></div><div className="ws-studio-swatches">{(Object.keys(themeDefaults) as Array<keyof typeof themeDefaults>).map(key => <Field key={key} label={labels[key]}><TextInput type="color" aria-label={labels[key]} value={event.theme?.[key] ?? themeDefaults[key]} onChange={e => change({ ...event, theme: { ...event.theme, [key]: e.target.value } })} /></Field>)}<Field label="Cor da campanha"><TextInput type="color" aria-label="Cor da campanha" value={event.color} onChange={e => change({ ...event, color: e.target.value })} /></Field></div></div>;

  return <section ref={root} className="campaign-editor ws-studio-root" data-standalone="true" data-fullscreen={fullscreen} data-mobile-area={mobileArea} data-preview-collapsed={previewCollapsed} aria-label="Estúdio da campanha"><div className="ws-studio-workspace" hidden={!fullscreen}><Workspace>
    <div className="ws-studio-toolbar"><div className="ws-studio-title">{fullscreen && <button ref={back} type="button" aria-label="Voltar à campanha" className="ws-action ws-action-ghost ws-studio-back" onClick={() => { onClose(); setExpanded(false); }}><ArrowLeft aria-hidden /><span>Voltar à campanha</span></button>}<div><h2>{fullscreen ? campaignName : 'Estúdio'}</h2>{fullscreen && <p className="ws-studio-context">Estúdio da campanha</p>}</div><Pill tone={conflict || dirty ? 'warning' : 'success'}>{conflict ? 'Revisão em conflito' : dirty ? 'Rascunho alterado' : 'Salvo'}</Pill></div><div className="ws-studio-toolbar-actions">{fullscreen && <Action variant="ghost" className="ws-studio-toggle-preview" aria-pressed={!previewCollapsed} onClick={() => setPreviewCollapsed(value => !value)}>{previewCollapsed ? <PanelRightOpen aria-hidden /> : <PanelRightClose aria-hidden />}{previewCollapsed ? 'Mostrar prévia' : 'Ocultar prévia'}</Action>}{conflict && <Action type="button" variant="secondary" disabled={busy} onClick={() => { if (window.confirm('Descartar suas alterações e carregar a configuração salva?')) void load(); }}>Recarregar versão salva</Action>}<Action type="button" variant="primary" disabled={busy || !dirty || conflict} onClick={() => void save()}>{busy ? 'Aguarde…' : 'Salvar configuração'}</Action></div></div>
    <div className="ws-studio-feedback" role="status" aria-live="polite"><Notice role="presentation" tone={failure ? 'error' : 'info'}>{message || (dirty ? 'Alterações não salvas.' : 'Configuração salva.')}</Notice></div>
    {fullscreen && <nav className="ws-studio-mobile-nav" aria-label="Áreas do estúdio">{[['materials', 'Materiais'], ['reference', 'Área da foto'], ['preview', 'Prévia']].map(([id, label]) => <Action key={id} variant={mobileArea === id ? 'primary' : 'ghost'} style={{ background: mobileArea === id ? 'var(--primary)' : 'transparent', color: mobileArea === id ? 'var(--primary-foreground)' : 'var(--muted)' }} aria-pressed={mobileArea === id} onClick={() => setMobileArea(id)}>{label}</Action>)}</nav>}
    <Surface className="ws-studio-library-panel"><fieldset className="ws-studio-fields" disabled={busy}><WorkspaceTabs label="Configuração do estúdio" items={[{ id: 'artes', label: 'Artes', content: library('artwork', event.artworks) }, { id: 'stickers', label: 'Stickers', content: library('sticker', event.stickers) }, { id: 'cores', label: 'Cores', content: colors }]} /></fieldset></Surface>
    <div className="ws-studio-desks">
      <Surface className="ws-studio-reference"><div className="ws-studio-panel-heading"><div><span className="ws-studio-kicker">Referência</span><h3>{artwork ? `Área da foto · ${artwork.name}` : 'Referência da composição'}</h3></div><Pill tone="neutral">{artwork ? `${artwork.width} × ${artwork.height}` : 'Sem arte'}</Pill></div>{artwork ? <><p className="ws-studio-instruction">Desenhe a área da foto. Arraste ou ajuste pelas alças.</p><fieldset className="ws-studio-fields" disabled={busy}><div className="ws-studio-reference-stage"><ReferenceCanvas key={artwork.id} artwork={artwork} assetURL={assetURL(artwork.file)} onChange={updateReference} /></div></fieldset></> : <EmptyState title="Selecione uma arte" description="A área da foto será definida aqui, separada da prévia do participante." />}</Surface>
      <motion.aside className="ws-studio-preview" data-expanded={expanded} aria-label="Prévia da campanha" initial={false} animate={{ backgroundColor: expanded ? '#101c20' : '#17272b' }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
        <div className="ws-studio-preview-bar"><div><span className="ws-studio-kicker">Experiência do participante</span><h3>Prévia</h3></div><Action type="button" variant="secondary" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Recolher prévia' : 'Ampliar prévia'}</Action></div>
        <p className="ws-studio-preview-status" aria-live="polite">{previewReady ? 'Rascunho atual · foto local' : 'Carregando prévia…'}</p>
        <div className="ws-studio-device"><iframe ref={frame} src={`/event-runtime/preview.html?campaignId=${campaignId}`} title="Prévia real do editor da campanha" onLoad={sendPreview} allow="web-share" /></div>
        <p className="ws-studio-privacy">Fotos e composições ficam no navegador.</p>
      </motion.aside>
    </div>
  </Workspace></div></section>;
}
