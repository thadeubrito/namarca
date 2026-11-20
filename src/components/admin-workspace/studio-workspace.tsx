'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { PanelRightClose, PanelRightOpen, ArrowUp, ArrowDown, Scan, Trash2, Upload, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useDarkTheme } from '@/components/theme-scope';
import { type Artwork, type EventConfig, type Material } from '@namarca/editor/events';
import { StudioColors } from './studio-colors';
import { SaveStatus } from './save-status';
import { StudioSkeleton } from './studio-skeleton';
import { StudioCleanup } from './studio-cleanup';
import { StudioRecoveryDialog } from './studio-recovery-dialog';
import { useCampaignRecovery } from './campaign-recovery';
import { StudioSaveProgress, type SaveProgress, type UploadItem } from './studio-save-progress';
import { sameDraftValue, claimDraftTab, localMaterialId, draftKey, readStudioDraft, writeStudioDraft, deleteStudioDraft, uploadPool, type LocalMaterial, type StudioDraft } from '@/lib/studio-draft';
import { clampReference, ReferenceCanvas } from '@/editor/reference-canvas';
import { uploadFailureMessage } from '@/lib/upload-feedback';
import { Action, Surface, TextInput, Notice, EmptyState, Workspace, WorkspaceTabs } from './primitives';
import './studio.css';

type Snapshot = { event: EventConfig; revision: number; draftOwner?: string; cleanupWarning?: string };
type Kind = 'artwork' | 'sticker';
type SaveScope = 'artworks' | 'stickers' | 'theme';
const scopeLabels: Record<SaveScope, string> = { artworks: 'artes', stickers: 'figurinhas', theme: 'cores' };

export function StudioWorkspace({ campaignId, activeSection, onPendingChange }: { campaignId: string; activeSection?: string; onPendingChange?: (section: string, pending: boolean) => void }) {
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const dark = useDarkTheme();
  const referenceTrigger = useRef<HTMLButtonElement | null>(null);
  const studioRoot = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!referenceOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [referenceOpen]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [selected, setSelected] = useState('');
  const [materials, setMaterials] = useState<LocalMaterial[]>([]);
  const materialsRef = useRef<LocalMaterial[]>([]);
  const [localAssets, setLocalAssets] = useState<Record<string, string>>({});
  const objectURLs = useRef(new Map<string, { file: Blob; url: string }>());
  const [recovery, setRecovery] = useState<StudioDraft | null>(null);
  const registerRecovery = useCampaignRecovery();
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const [draftStorageKey, setDraftStorageKey] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const [progress, setProgress] = useState<SaveProgress | null>(null);
  const [operationScope, setOperationScope] = useState<SaveScope>('artworks');
  const [savedTokens, setSavedTokens] = useState<Partial<Record<SaveScope, string>>>({});
  const storageQueue = useRef(Promise.resolve());
  const tabClaim = useRef<Promise<{ token: string; release: () => void }> | null>(null);
  const changeMaterials = (next: LocalMaterial[]) => {
    const cache = objectURLs.current;
    const ids = new Set(next.map(item => item.id));
    for (const [id, entry] of cache) {
      if (!ids.has(id)) { URL.revokeObjectURL(entry.url); cache.delete(id); }
    }
    for (const material of next) {
      if (cache.get(material.id)?.file !== material.file) {
        const previous = cache.get(material.id);
        if (previous) URL.revokeObjectURL(previous.url);
        cache.set(material.id, { file: material.file, url: URL.createObjectURL(material.file) });
      }
    }
    setLocalAssets(Object.fromEntries([...cache].map(([id, entry]) => [`${id}.png`, entry.url])));
    materialsRef.current = next; setMaterials(next);
  };
  const persist = useCallback((key: string, draft: StudioDraft | null) => {
    storageQueue.current = storageQueue.current.catch(() => {}).then(async () => {
      if (draft) await writeStudioDraft(key, draft); else await deleteStudioDraft(key);
    }).catch(() => { setStorageWarning('Não foi possível guardar o rascunho neste navegador. Não atualize nem feche a página antes de salvar.'); });
    return storageQueue.current;
  }, []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const [failure, setFailure] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const reducedMotion = useReducedMotion();
  const sectionDirty = (scope: SaveScope) => !!event && !!snapshot && !sameDraftValue(event[scope], snapshot.event[scope]);
  const artworksDirty = sectionDirty('artworks');
  const stickersDirty = sectionDirty('stickers');
  const themeDirty = sectionDirty('theme');
  const dirty = artworksDirty || stickersDirty || themeDirty;
  useEffect(() => {
    onPendingChange?.('artes', artworksDirty);
    onPendingChange?.('stickers', stickersDirty);
    onPendingChange?.('cores', themeDirty);
  }, [artworksDirty, stickersDirty, themeDirty, onPendingChange]);
  const assetURL = (file: string) => localAssets[file] ?? `/api/campaigns/${campaignId}/assets/${encodeURIComponent(file.replace(/\.png$/, ''))}`;

  const load = useCallback(async () => {
    setBusy(true); setMessage(''); setFailure(false);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/editor`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível carregar a configuração.');
      const value: Snapshot = await response.json();
      // Tab-scoped key prevents another tab from silently replacing this local draft.
      let tab = '';
      try {
        tabClaim.current ??= claimDraftTab();
        tab = (await tabClaim.current).token;
      } catch { /* Editing remains available when browser storage is blocked. */ }
      const key = value.draftOwner && tab ? `${draftKey(value.draftOwner, campaignId)}:${tab}` : '';
      setDraftStorageKey(key);
      try {
        const recoveredValue = key ? await readStudioDraft(key) : undefined;
        if (recoveredValue && sameDraftValue(recoveredValue.event, value.event)) {
          setRecovery(null); await persist(key, null);
        } else setRecovery(recoveredValue ?? null);
      } catch { setStorageWarning('Recuperação local indisponível. Não feche a página antes de salvar.'); }
      if (!key) setStorageWarning('Recuperação local indisponível. Não feche a página antes de salvar.');
      setSnapshot(value); setEvent(value.event); changeMaterials([]); setConflict(false); setSelected(value.event.artworks[0]?.id ?? '');
    } catch (error) { setFailure(true); setMessage(error instanceof Error ? error.message : 'Falha ao carregar.'); }
    finally { setBusy(false); setRecoveryChecked(true); }
  }, [campaignId, persist]);
  useEffect(() => () => {
    const claim = tabClaim.current;
    tabClaim.current = null;
    void claim?.then(owner => owner.release());
  }, []);
  // Fetch inicial e recarga explícita usam o mesmo recurso autenticado.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const navigate = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest('a[href]') as HTMLAnchorElement | null : null;
      if (!link || link.target === '_blank' || link.hasAttribute('download') || link.href === window.location.href || link.getAttribute('href')?.startsWith('#')) return;
      if (!window.confirm('Você tem alterações não salvas no estúdio. Sair e descartá-las?')) { e.preventDefault(); e.stopPropagation(); }
    };
    const submit = (e: SubmitEvent) => {
      if (e.defaultPrevented || !(e.target instanceof HTMLFormElement)) return;
      if (e.target.dataset.campaignSave === 'details' || e.target.dataset.campaignNavigation !== 'true') return;
      if (!window.confirm('Você tem alterações não salvas no estúdio. Salvar os dados da campanha pode descartá-las. Continuar sem salvar o estúdio?')) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', navigate, true);
    document.addEventListener('submit', submit, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', navigate, true); document.removeEventListener('submit', submit, true); };
  }, [dirty, busy]);

  useEffect(() => {
    const cache = objectURLs.current;
    return () => { for (const entry of cache.values()) URL.revokeObjectURL(entry.url); cache.clear(); };
  }, []);

  useEffect(() => {
    if (!event || !snapshot || !draftStorageKey || recovery) return;
    void persist(draftStorageKey, dirty ? { event, revision: snapshot.revision, materials, updatedAt: Date.now() } : null);
  }, [event, snapshot, materials, draftStorageKey, recovery, dirty, persist]);

  const sendPreview = useCallback(() => {
    if (event) frame.current?.contentWindow?.postMessage({ type: 'namarca:preview', campaignId, event, localAssets, selectedArtworkId: event.artworks.some(art => art.id === selected) ? selected : event.artworks[0]?.id }, window.location.origin);
  }, [campaignId, event, selected, localAssets]);
  useEffect(() => {
    sendPreview();
    const ready = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && e.data?.type === 'namarca:preview-ready' && e.data.campaignId === campaignId) { sendPreview(); }
    };
    window.addEventListener('message', ready);
    return () => window.removeEventListener('message', ready);
  }, [sendPreview, campaignId]);

  const change = (next: EventConfig) => {
    const ids = new Set([...next.artworks, ...next.stickers].map(item => item.id));
    const retained = materials.filter(item => ids.has(item.id));
    if (retained.length !== materials.length) changeMaterials(retained);
    setEvent(next); setMessage(''); setFailure(false);
  };
  const save = async (scope: SaveScope) => {
    if (!event || !snapshot || busy || conflict || recovery) return;
    setOperationScope(scope);
    setBusy(true); setMessage(''); setFailure(false); setProgress({ phase: 'preparing', completed: 0, total: 0 });
    try {
      const activeIds = new Set(scope === 'theme' ? [] : event[scope].map(item => item.id));
      // A recovered upload may have been removed by a later manual cleanup.
      for (const item of materialsRef.current.filter(item => activeIds.has(item.id) && item.uploaded)) {
        const check = await fetch(`/api/campaigns/${campaignId}/assets/${item.id}`, { cache: 'no-store' });
        if (check.status === 404) changeMaterials(materialsRef.current.map(value => value.id === item.id ? { ...value, uploaded: false } : value));
        else if (!check.ok) throw new Error('Não foi possível verificar os arquivos enviados. Tente novamente.');
        await check.body?.cancel();
      }
      const pending = materialsRef.current.filter(item => activeIds.has(item.id) && !item.uploaded);
      let completed = 0;
      const uploadItems: UploadItem[] = pending.map(item => ({ id: item.id, name: [...event.artworks, ...event.stickers].find(material => material.id === item.id)!.name, status: 'waiting' }));
      const reportUpload = (id: string, status: UploadItem['status']) => {
        const entry = uploadItems.find(item => item.id === id)!;
        entry.status = status;
        setProgress({ phase: 'uploading', completed, total: pending.length, files: uploadItems.map(item => ({ ...item })) });
      };
      if (pending.length) setProgress({ phase: 'uploading', completed: 0, total: pending.length, files: uploadItems });
      const errors: string[] = [];
      await uploadPool(pending, async item => {
        const material = [...event.artworks, ...event.stickers].find(value => value.id === item.id)!;
        reportUpload(item.id, 'uploading');
        let succeeded = false;
        try {
          const response = await fetch(`/api/campaigns/${campaignId}/assets?kind=${item.kind}`, { method: 'POST', headers: { 'Content-Type': 'image/png', 'X-Asset-Name': encodeURIComponent(material.name), 'X-Upload-Id': item.id }, body: item.file });
          if (!response.ok) throw new Error(await uploadFailureMessage(response));
          const result = await response.json() as { material: { id: string } };
          if (result.material.id !== item.id) throw new Error('Não foi possível confirmar o arquivo.');
          const next = materialsRef.current.map(value => value.id === item.id ? { ...value, uploaded: true } : value);
          changeMaterials(next);
          if (draftStorageKey) await persist(draftStorageKey, { event, revision: snapshot.revision, materials: next, updatedAt: Date.now() });
          succeeded = true;
        } catch (error) {
          errors.push(`${material.name}: ${error instanceof Error ? error.message : 'Falha no envio.'}`);
          throw error;
        } finally { completed++; reportUpload(item.id, succeeded ? 'done' : 'failed'); }
      }).catch(() => { throw new Error(errors.join(' ')); });
      setProgress({ phase: 'saving', completed: pending.length, total: pending.length, files: uploadItems.map(item => ({ ...item })) });
      const response = await fetch(`/api/campaigns/${campaignId}/editor`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, revision: snapshot.revision, scope }) });
      if (response.status === 409) { setConflict(true); throw new Error('Outra sessão alterou esta configuração. Seu rascunho foi preservado. Recarregue a versão salva antes de continuar.'); }
      if (!response.ok) throw new Error('Não foi possível salvar. Confira nomes, referências e imagens e tente novamente.');
      const value: Snapshot = await response.json();
      const merged = { ...event, [scope]: value.event[scope] };
      const savedIds = new Set(scope === 'theme' ? [] : value.event[scope].map(item => item.id));
      const remaining = materialsRef.current.filter(item => !savedIds.has(item.id));
      setSnapshot(value); setEvent(merged); changeMaterials(remaining); setConflict(false); setStorageWarning('');
      const stillDirty = (['artworks', 'stickers', 'theme'] as const).some(key => !sameDraftValue(merged[key], value.event[key]));
      // This code runs only after the section save request, never while rendering.
      // eslint-disable-next-line react-hooks/purity
      if (draftStorageKey) await persist(draftStorageKey, stillDirty ? { event: merged, revision: value.revision, materials: remaining, updatedAt: Date.now() } : null);
      setSavedTokens(current => ({ ...current, [scope]: localMaterialId() }));
      setMessage(value.cleanupWarning || `${scopeLabels[scope][0].toUpperCase()}${scopeLabels[scope].slice(1)} salvas. A campanha não foi publicada.`);
      if (value.cleanupWarning) setFailure(true);
      setProgress({ phase: 'success', completed: pending.length, total: pending.length, files: uploadItems.map(item => ({ ...item })) });
    } catch (error) { setProgress(null); setFailure(true); setMessage(error instanceof Error ? error.message : 'Falha ao salvar.'); }
    finally { setBusy(false); }
  };
  const upload = async (file: File | undefined, kind: Kind) => {
    if (!file || !event) return;
    if (file.type !== 'image/png') { setFailure(true); setMessage('Selecione um arquivo PNG.'); return; }
    if (file.size > 25 * 1024 * 1024) { setFailure(true); setMessage('O PNG excede o limite de 25 MiB. Reduza o arquivo e tente novamente.'); return; }
    try {
      const image = await createImageBitmap(file);
      const { width, height } = image;
      image.close();
      if (!width || !height || width * height > 40_000_000) throw new Error('PNG excede o limite de 40 milhões de pixels.');
      const id = localMaterialId();
      const name = file.name.replace(/\.png$/i, '').replace(/[/\\\\\u0000-\u001f\u007f]/g, '').trim().slice(0, 200) || 'Material';
      const material: Artwork = { id, name, file: `${id}.png`, width, height, reference: { x: 0, y: 0, width, height } };
      changeMaterials([...materialsRef.current, { id, file, kind, uploaded: false }]);
      if (kind === 'artwork') { setEvent(current => current && ({ ...current, artworks: [...current.artworks, material] })); setSelected(id); }
      else setEvent(current => current && ({ ...current, stickers: [...current.stickers, { id, name, file: material.file }] }));

    } catch { setFailure(true); setMessage('Não foi possível abrir o PNG. Confira o arquivo e o limite de 40 milhões de pixels.'); }
  };
  const selectFiles = async (files: File[], kind: Kind) => {
    setOperationScope(kind === 'artwork' ? 'artworks' : 'stickers');
    setBusy(true); setFailure(false); setMessage(''); setProgress(null);
    try { for (const file of files) await upload(file, kind); }
    finally { setBusy(false); }
  };

  const recoveryActions = useRef({ recover: () => {}, discard: async () => {} });
  useEffect(() => {
    recoveryActions.current = {
      recover: () => {
        if (!recovery) return;
        setEvent(recovery.event); changeMaterials(recovery.materials); setSelected(recovery.event.artworks[0]?.id ?? '');
        if (recovery.revision !== snapshot?.revision) {
          setSnapshot(current => current && ({ ...current, revision: recovery.revision }));
          setConflict(true); setFailure(true);
          setMessage('A configuração no servidor mudou. Seu rascunho foi recuperado, mas não pode sobrescrevê-la. Recarregue a versão salva para continuar.');
        }
        setRecovery(null);
      },
      discard: async () => { if (draftStorageKey) await persist(draftStorageKey, null); setRecovery(null); },
    };
  });
  useEffect(() => {
    if (!registerRecovery || !recoveryChecked) return;
    registerRecovery('studio', recovery ? { recover: () => recoveryActions.current.recover(), discard: () => recoveryActions.current.discard(), conflict: recovery.revision !== snapshot?.revision } : null);
  }, [registerRecovery, recoveryChecked, recovery, snapshot?.revision]);

  if (!event) {
    if (!failure) return <StudioSkeleton />;
    return <section className="campaign-editor ws-studio-root" aria-label="Estúdio da campanha"><Surface><Notice tone="error" role="alert">{message}</Notice><Action type="button" onClick={() => void load()}>Tentar novamente</Action></Surface></section>;
  }

  const artwork = event.artworks.find(a => a.id === selected) ?? event.artworks[0];
  const updateReference = (reference: Artwork['reference']) => {
    if (artwork) change({ ...event, artworks: event.artworks.map(a => a.id === artwork.id ? { ...a, reference: clampReference(reference, a.width, a.height) } : a) });
  };
  const library = (kind: Kind, items: Material[]) => {
    const key = kind === 'artwork' ? 'artworks' : 'stickers';
    const move = (index: number, delta: number) => {
      const list = [...event[key]];
      [list[index], list[index + delta]] = [list[index + delta], list[index]];
      // Invoked only by the move button, never during library rendering.
      // eslint-disable-next-line react-hooks/refs
      change({ ...event, [key]: list });
    };
    return <div className="ws-studio-library">
      <div className="ws-studio-library-bar"><div className="ws-studio-library-title"><h3>{kind === 'artwork' ? 'Artes' : 'Figurinhas'}</h3><span className="ws-studio-library-count" aria-label={`${items.length} materiais`}>{items.length}</span></div>
        <div className="ws-studio-upload-tools"><small>PNG · até 25 MiB · envio ao salvar</small><label className="ws-studio-upload" data-disabled={busy}><Upload aria-hidden /><span>{kind === 'artwork' ? 'Adicionar arte' : 'Adicionar figurinha'}</span><TextInput type="file" aria-label={kind === 'artwork' ? 'Adicionar arte PNG' : 'Adicionar sticker PNG'} accept="image/png" multiple disabled={busy || !!recovery} onChange={e => { void selectFiles(Array.from(e.currentTarget.files ?? []), kind); e.currentTarget.value = ''; }} /></label></div>
      </div>
      {!items.length ? <EmptyState title={kind === 'artwork' ? 'Sua biblioteca de artes está vazia' : 'Nenhum sticker adicionado.'} description={kind === 'artwork' ? 'Adicione uma arte PNG para abrir a prévia.' : 'Adicione arquivos PNG para disponibilizá-los na composição.'} /> :
        <ol className="ws-studio-rail" aria-label={kind === 'artwork' ? 'Artes da campanha' : 'Stickers da campanha'}>{items.map((item, index) => <li key={item.id} className="ws-studio-asset" data-selected={kind === 'artwork' && artwork?.id === item.id}>
          {kind === 'artwork' ? <Action type="button" variant="ghost" className="ws-studio-thumbnail" disabled={busy} onClick={() => setSelected(item.id)} aria-pressed={artwork?.id === item.id} aria-label={`Selecionar arte: ${item.name}`}><img src={assetURL(item.file)} alt={item.name} /></Action> : <div className="ws-studio-thumbnail"><img src={assetURL(item.file)} alt={item.name} /></div>}
          <TextInput aria-label={`Nome ${kind === 'artwork' ? 'da arte' : 'do sticker'} ${index + 1}`} value={item.name} disabled={busy} onChange={e => change({ ...event, [key]: event[key].map(a => a.id === item.id ? { ...a, name: e.target.value } : a) })} />
          <div className="ws-studio-asset-actions"><Action type="button" variant="ghost" disabled={busy || !index} onClick={() => move(index, -1)} aria-label={`Mover ${item.name} para cima`}><ArrowUp aria-hidden /></Action><Action type="button" variant="ghost" disabled={busy || index === items.length - 1} onClick={() => move(index, 1)} aria-label={`Mover ${item.name} para baixo`}><ArrowDown aria-hidden /></Action>{kind === 'artwork' && <Action type="button" variant="ghost" disabled={busy} aria-label={`Editar área da foto: ${item.name}`} title="Editar área da foto" onClick={e => { referenceTrigger.current = e.currentTarget; setSelected(item.id); setReferenceOpen(true); }}><Scan aria-hidden /></Action>}<Action type="button" variant="danger" disabled={busy} onClick={() => change({ ...event, [key]: event[key].filter(a => a.id !== item.id) })} aria-label={`Remover ${item.name}`}><Trash2 aria-hidden /></Action></div>
        </li>)}</ol>}
    </div>;
  };
  const colors = <StudioColors event={event} disabled={busy} onChange={change} />;
  const section = (scope: SaveScope, content: React.ReactNode) => <>{content}<footer className="ws-studio-footer ws-studio-section-footer">
    {operationScope === scope && failure && <Notice tone="error" role="alert">{message}</Notice>}
    <AnimatePresence initial={false}>{operationScope === scope && progress && <motion.div key="save-progress" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .28, ease: 'easeInOut' }} style={{ overflow: 'hidden' }}><StudioSaveProgress progress={{ ...progress, sectionLabel: `${scopeLabels[scope][0].toUpperCase()}${scopeLabels[scope].slice(1)}` }} onClose={() => setProgress(null)} /></motion.div>}</AnimatePresence>
    <div className="ws-studio-footer-actions"><SaveStatus dirty={sectionDirty(scope)} saving={busy && operationScope === scope} successToken={savedTokens[scope]} /><Action type="button" disabled={busy || !sectionDirty(scope) || conflict || !!recovery} onClick={() => void save(scope)}>{busy && operationScope === scope ? 'Salvando…' : `Salvar ${scopeLabels[scope]}`}</Action></div>
  </footer></>;

  return <section ref={studioRoot} tabIndex={-1} className="campaign-editor ws-studio-root" data-preview-collapsed={previewCollapsed} aria-label="Estúdio da campanha"><div className="ws-studio-workspace"><Workspace>
    <div className="sr-only" role="status" aria-live="polite">{message || (dirty ? 'Alterações não salvas.' : 'Configuração salva.')}</div>
    {recovery && !registerRecovery && <StudioRecoveryDialog draft={recovery} conflict={recovery.revision !== snapshot?.revision} onDone={() => studioRoot.current?.focus()} onRecover={() => {
      setEvent(recovery.event); changeMaterials(recovery.materials); setSelected(recovery.event.artworks[0]?.id ?? '');
      if (recovery.revision !== snapshot?.revision) { setSnapshot(current => current && ({ ...current, revision: recovery.revision })); setConflict(true); setFailure(true); setMessage('A configuração no servidor mudou. Seu rascunho foi recuperado, mas não pode sobrescrevê-la. Recarregue a versão salva para continuar.'); }
      setRecovery(null);
    }} onDiscard={async () => { if (draftStorageKey) await persist(draftStorageKey, null); setRecovery(null); }} />}
    {storageWarning && <Notice role="alert">{storageWarning}</Notice>}
    <div className="ws-studio-columns"><div className="ws-studio-controls"><div className="ws-studio-library-panel"><fieldset className="ws-studio-fields" disabled={busy || !!recovery}>{activeSection ? <div className="ws-studio-section"><div hidden={activeSection !== 'artes'}>{section('artworks', library('artwork', event.artworks))}</div><div hidden={activeSection !== 'stickers'}>{section('stickers', library('sticker', event.stickers))}</div><div hidden={activeSection !== 'cores'}>{section('theme', colors)}</div></div> : <WorkspaceTabs label="Configuração do estúdio" items={[{ id: 'artes', label: 'Artes', pending: sectionDirty('artworks'), content: section('artworks', library('artwork', event.artworks)) }, { id: 'stickers', label: 'Figurinhas', pending: sectionDirty('stickers'), content: section('stickers', library('sticker', event.stickers)) }, { id: 'cores', label: 'Cores', pending: sectionDirty('theme'), content: section('theme', colors) }]} />}</fieldset></div>
    {conflict && <div className="ws-studio-footer"><Notice tone="error">{message}</Notice><Action type="button" variant="secondary" disabled={busy} onClick={() => { if (window.confirm('Descartar suas alterações de todas as abas e carregar a configuração salva?')) { if (draftStorageKey) void persist(draftStorageKey, null).then(() => load()); else void load(); } }}>Recarregar versão salva</Action></div>}
      <Dialog.Root open={referenceOpen} onOpenChange={setReferenceOpen}><Dialog.Portal><Dialog.Overlay className="ws-client-dialog-overlay" /><Dialog.Content className={`ui-scope campaign-editor ws-studio-root ws-studio-reference-dialog ${dark ? 'dark' : ''}`} onInteractOutside={e => e.preventDefault()} onCloseAutoFocus={e => { e.preventDefault(); referenceTrigger.current?.focus(); }}><header className="ws-studio-dialog-heading"><Dialog.Title>Editar área da foto</Dialog.Title><Dialog.Close asChild><button type="button" className="ws-action ws-action-ghost" aria-label="Fechar ajuste da área da foto"><X aria-hidden /></button></Dialog.Close></header><Dialog.Description className="sr-only">Ajuste a área da foto arrastando o retângulo ou suas alças.</Dialog.Description>{referenceOpen && <div className="ws-studio-reference">{artwork ? <><fieldset className="ws-studio-fields" disabled={busy}><div className="ws-studio-reference-stage" style={{ '--artwork-ratio': artwork.width / artwork.height } as React.CSSProperties}><ReferenceCanvas key={artwork.id} artwork={artwork} assetURL={assetURL(artwork.file)} onChange={updateReference} /></div></fieldset></> : <EmptyState title="Selecione uma arte" description="A área da foto será definida aqui, separada da prévia do participante." />}</div>}<footer className="ws-studio-dialog-footer"><Dialog.Close asChild><button type="button" className="ws-action ws-action-primary">Concluir ajuste</button></Dialog.Close></footer></Dialog.Content></Dialog.Portal></Dialog.Root>
      </div><motion.aside id={`studio-preview-${campaignId}`} className="ws-studio-preview" aria-label="Prévia da campanha" initial={false} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
        <div className="ws-studio-preview-bar"><Action variant="ghost" className="ws-studio-toggle-preview" aria-expanded={!previewCollapsed} aria-controls={`studio-preview-content-${campaignId}`} onClick={() => setPreviewCollapsed(value => !value)}>{previewCollapsed ? <PanelRightOpen aria-hidden /> : <PanelRightClose aria-hidden />}{previewCollapsed ? 'Mostrar prévia' : 'Ocultar prévia'}</Action></div>
        <div id={`studio-preview-content-${campaignId}`} className="ws-studio-preview-content" hidden={previewCollapsed}>
        <div className="ws-studio-device"><iframe ref={frame} src={`/event-runtime/preview.html?campaignId=${campaignId}`} title="Prévia real do editor da campanha" onLoad={sendPreview} allow="web-share" /></div>
        </div>
      </motion.aside>
    </div>

    <StudioCleanup campaignId={campaignId} disabled={busy || dirty || !!recovery} />
  </Workspace></div></section>;
}
