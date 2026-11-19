'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { PanelRightClose, PanelRightOpen, ArrowUp, ArrowDown, Scan, Trash2, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useDarkTheme } from '@/components/theme-scope';
import { type Artwork, type EventConfig, type Material } from '@namarca/editor/events';
import { StudioColors } from './studio-colors';
import { clampReference, ReferenceCanvas } from '@/editor/reference-canvas';
import { uploadFailureMessage } from '@/lib/upload-feedback';
import { Action, Surface, Field, TextInput, Notice, EmptyState, Workspace, Pill, WorkspaceTabs } from './primitives';
import './studio.css';

type Snapshot = { event: EventConfig; revision: number };
type Kind = 'artwork' | 'sticker';

export function StudioWorkspace({ campaignId }: { campaignId: string }) {
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const dark = useDarkTheme();
  const referenceTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!referenceOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [referenceOpen]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [selected, setSelected] = useState('');
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
      if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && e.data?.type === 'namarca:preview-ready' && e.data.campaignId === campaignId) { sendPreview(); }
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

  if (!event) return <section className="campaign-editor ws-studio-root" aria-label="Estúdio da campanha"><Surface><p role="status">{message || 'Carregando estúdio…'}</p>{!busy && <Action type="button" onClick={() => void load()}>Tentar novamente</Action>}</Surface></section>;

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
          <div className="ws-studio-asset-top"><span className="ws-studio-index">{String(index + 1).padStart(2, '0')}</span>{kind === 'artwork' && artwork?.id === item.id && <Pill tone="success">Selecionada</Pill>}</div>
          {kind === 'artwork' ? <Action type="button" variant="ghost" className="ws-studio-thumbnail" disabled={busy} onClick={() => setSelected(item.id)} aria-pressed={artwork?.id === item.id} aria-label={`Selecionar arte: ${item.name}`}><img src={assetURL(item.file)} alt={item.name} /></Action> : <div className="ws-studio-thumbnail"><img src={assetURL(item.file)} alt={item.name} /></div>}
          <TextInput aria-label={`Nome ${kind === 'artwork' ? 'da arte' : 'do sticker'} ${index + 1}`} value={item.name} disabled={busy} onChange={e => change({ ...event, [key]: event[key].map(a => a.id === item.id ? { ...a, name: e.target.value } : a) })} />
          <div className="ws-studio-asset-actions"><Action type="button" variant="ghost" disabled={busy || !index} onClick={() => move(index, -1)} aria-label={`Mover ${item.name} para cima`}><ArrowUp aria-hidden /></Action><Action type="button" variant="ghost" disabled={busy || index === items.length - 1} onClick={() => move(index, 1)} aria-label={`Mover ${item.name} para baixo`}><ArrowDown aria-hidden /></Action>{kind === 'artwork' && <Action type="button" variant="ghost" disabled={busy} aria-label={`Editar área da foto: ${item.name}`} title="Editar área da foto" onClick={e => { referenceTrigger.current = e.currentTarget; setSelected(item.id); setReferenceOpen(true); }}><Scan aria-hidden /></Action>}<Action type="button" variant="danger" disabled={busy} onClick={() => change({ ...event, [key]: event[key].filter(a => a.id !== item.id) })} aria-label={`Remover ${item.name}`}><Trash2 aria-hidden /></Action></div>
        </li>)}</ol>}
    </div>;
  };
  const colors = <StudioColors event={event} disabled={busy} onChange={change} />;

  return <section className="campaign-editor ws-studio-root" data-preview-collapsed={previewCollapsed} aria-label="Estúdio da campanha"><div className="ws-studio-workspace"><Workspace>
    <div className="sr-only" role="status" aria-live="polite">{message || (dirty ? 'Alterações não salvas.' : 'Configuração salva.')}</div>
    <div className="ws-studio-columns"><div className="ws-studio-controls"><div className="ws-studio-library-panel"><fieldset className="ws-studio-fields" disabled={busy}><WorkspaceTabs label="Configuração do estúdio" items={[{ id: 'artes', label: 'Artes', content: library('artwork', event.artworks) }, { id: 'stickers', label: 'Figurinhas', content: library('sticker', event.stickers) }, { id: 'cores', label: 'Cores', content: colors }]} /></fieldset></div>
      <Dialog.Root open={referenceOpen} onOpenChange={setReferenceOpen}><Dialog.Portal><Dialog.Overlay className="ws-client-dialog-overlay" /><Dialog.Content className={`ui-scope campaign-editor ws-studio-root ws-studio-reference-dialog ${dark ? 'dark' : ''}`} onInteractOutside={e => e.preventDefault()} onCloseAutoFocus={e => { e.preventDefault(); referenceTrigger.current?.focus(); }}><header className="ws-studio-dialog-heading"><Dialog.Title>Editar área da foto</Dialog.Title><Dialog.Close asChild><button type="button" className="ws-action ws-action-ghost" aria-label="Fechar ajuste da área da foto"><X aria-hidden /></button></Dialog.Close></header><Dialog.Description className="sr-only">Ajuste a área da foto arrastando o retângulo ou suas alças.</Dialog.Description>{referenceOpen && <div className="ws-studio-reference">{artwork ? <><fieldset className="ws-studio-fields" disabled={busy}><div className="ws-studio-reference-stage" style={{ '--artwork-ratio': artwork.width / artwork.height } as React.CSSProperties}><ReferenceCanvas key={artwork.id} artwork={artwork} assetURL={assetURL(artwork.file)} onChange={updateReference} /></div></fieldset></> : <EmptyState title="Selecione uma arte" description="A área da foto será definida aqui, separada da prévia do participante." />}</div>}<footer className="ws-studio-dialog-footer"><Dialog.Close asChild><button type="button" className="ws-action ws-action-primary">Concluir ajuste</button></Dialog.Close></footer></Dialog.Content></Dialog.Portal></Dialog.Root>
      </div><motion.aside id={`studio-preview-${campaignId}`} className="ws-studio-preview" aria-label="Prévia da campanha" initial={false} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
        <div className="ws-studio-preview-bar"><Action variant="ghost" className="ws-studio-toggle-preview" aria-expanded={!previewCollapsed} aria-controls={`studio-preview-content-${campaignId}`} onClick={() => setPreviewCollapsed(value => !value)}>{previewCollapsed ? <PanelRightOpen aria-hidden /> : <PanelRightClose aria-hidden />}{previewCollapsed ? 'Mostrar prévia' : 'Ocultar prévia'}</Action></div>
        <div id={`studio-preview-content-${campaignId}`} className="ws-studio-preview-content" hidden={previewCollapsed}>
        <div className="ws-studio-device"><iframe ref={frame} src={`/event-runtime/preview.html?campaignId=${campaignId}`} title="Prévia real do editor da campanha" onLoad={sendPreview} allow="web-share" /></div>
        <p className="ws-studio-privacy">Fotos e composições ficam no navegador.</p></div>
      </motion.aside>
    </div>
    <footer className="ws-studio-footer">
      {failure && <Notice tone="error" role="alert">{message}</Notice>}
      <div className="ws-studio-footer-actions">{conflict && <Action type="button" variant="secondary" disabled={busy} onClick={() => { if (window.confirm('Descartar suas alterações e carregar a configuração salva?')) void load(); }}>Recarregar versão salva</Action>}<Action type="button" variant="primary" disabled={busy || !dirty || conflict} onClick={() => void save()}>{busy ? 'Aguarde…' : 'Salvar configuração'}</Action></div>
    </footer>
  </Workspace></div></section>;
}
