'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertDialog } from 'radix-ui';
import { FileClock, ImageIcon, Shapes, AlertTriangle } from 'lucide-react';
import { useDarkTheme } from '@/components/theme-scope';
import type { StudioDraft } from '@/lib/studio-draft';
import { Action } from './primitives';

export function StudioRecoveryDialog({ draft, conflict, onRecover, onDiscard, onDone }: {
  draft: StudioDraft; conflict: boolean; onRecover: () => void; onDiscard: () => Promise<void>; onDone: () => void;
}) {
  const dark = useDarkTheme();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const locked = useRef(false);
  const recoverButton = useRef<HTMLButtonElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirmDiscard) backButton.current?.focus(); else recoverButton.current?.focus();
  }, [confirmDiscard]);
  const date = new Date(draft.updatedAt);
  const formatted = Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date) : null;
  return <AlertDialog.Root open><AlertDialog.Portal>
    <AlertDialog.Overlay className="ws-client-dialog-overlay" />
    <AlertDialog.Content className={`ui-scope ws-recovery-dialog ${dark ? 'dark' : ''}`} onOpenAutoFocus={event => { event.preventDefault(); recoverButton.current?.focus(); }} onEscapeKeyDown={event => { event.preventDefault(); if (!discarding) setConfirmDiscard(false); }} onCloseAutoFocus={event => { event.preventDefault(); onDone(); }}>
      <div className="ws-recovery-icon" aria-hidden="true"><FileClock /></div>
      <header><AlertDialog.Title>{confirmDiscard ? 'Descartar este rascunho?' : 'Continuar de onde parou?'}</AlertDialog.Title>
      <AlertDialog.Description>{confirmDiscard ? 'As alterações e os arquivos deste rascunho serão removidos deste navegador. A configuração salva no servidor não será alterada.' : 'Encontramos alterações não salvas neste navegador. Recupere o rascunho para continuar editando.'}</AlertDialog.Description></header>
      {!confirmDiscard && <>
        <div className="ws-recovery-summary"><div><span>Rascunho local</span>{formatted && <time dateTime={date.toISOString()}>{formatted}</time>}</div><ul><li><ImageIcon aria-hidden="true" />{draft.event.artworks.length} arte(s)</li><li><Shapes aria-hidden="true" />{draft.event.stickers.length} figurinha(s)</li></ul></div>
        {conflict && <div className="ws-recovery-warning"><AlertTriangle aria-hidden="true" /><p>A configuração no servidor mudou. Você pode recuperar o rascunho para conferi-lo, mas não poderá sobrescrever a versão salva.</p></div>}
        <p className="ws-recovery-hint">Recuperar não envia arquivos nem salva a campanha.</p>
      </>}
      <footer>{confirmDiscard ? <><Action ref={backButton} variant="secondary" disabled={discarding} onClick={() => setConfirmDiscard(false)}>Voltar</Action><Action variant="danger" disabled={discarding} onClick={async () => {
        if (locked.current) return;
        locked.current = true; setDiscarding(true);
        try { await onDiscard(); } finally { locked.current = false; setDiscarding(false); }
      }}>{discarding ? 'Descartando…' : 'Descartar rascunho'}</Action></> : <><Action variant="secondary" onClick={() => setConfirmDiscard(true)}>Descartar</Action><Action ref={recoverButton} onClick={onRecover}>Recuperar rascunho</Action></>}</footer>
    </AlertDialog.Content>
  </AlertDialog.Portal></AlertDialog.Root>;
}
