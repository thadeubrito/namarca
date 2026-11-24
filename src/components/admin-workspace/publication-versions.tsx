'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import type { CampaignConfig } from '@/lib/campaigns/campaigns';
import { useRouter } from 'next/navigation';
import { useHistoricalVersion } from '@/app/admin/(workspace)/campanhas/[id]/publication-actions';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useCampaignAnyPending, usePublicationLock } from './campaign-sections';
import { SelectField } from './form-controls';
import { Notice } from './primitives';

export function PublicationVersions({ id, version, revision, updatedAt, versions }: { id: string; version: number; revision: number; updatedAt: string; versions: { version: number; config: CampaignConfig; publishedBy: string; deliveredAt: string }[] }) {
  const [selected, setSelected] = useState(String(version));
  const [operation, setOperation] = useState<'publish' | 'restore' | null>(null);
  const [state, submit, busy] = useActionState(useHistoricalVersion.bind(null, id), {});
  const dirty = useCampaignAnyPending();
  const lock = usePublicationLock();
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const origin = useRef<HTMLButtonElement | null>(null);
  const authorized = useRef(false);
  const target = versions.find(item => item.version === Number(selected));
  useEffect(() => { lock(busy); return () => lock(false); }, [busy, lock]);
  useEffect(() => { if (state.restored) window.location.reload(); else if (state.success || state.error) router.refresh(); }, [state, router]);
  const blocked = busy || dirty || !target;
  return <details className="ws-publication-history">
    <summary><span><strong>Versões publicadas</strong><small>Troque o conteúdo público ou recupere uma versão para editar</small></span><span className="ws-publication-history-count">{versions.length}</span></summary>
    <section className="ws-publication-versions" aria-label="Gerenciar versões">
    <div className="ws-publication-version-selection"><h3>Escolher versão</h3><fieldset disabled={busy}>
      <SelectField name="selectedPublicationVersion" label="Selecionar versão" value={selected} onValueChange={setSelected} options={[...versions].reverse().map(item => ({ value: String(item.version), label: `Versão ${item.version}${item.version === version ? ' · publicada atualmente' : ''}` }))} />
    </fieldset></div>
    {target && <p className="ws-publication-caption">Publicada em {new Date(target.deliveredAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · {target.publishedBy}</p>}
    <div className="ws-publication-version-actions">
      <div className="ws-publication-version-operation"><div><h4>Alterar a publicação atual</h4><p>{Number(selected) === version ? `A Versão ${selected} já é a publicação atual.` : `Substitui a Versão ${version} pela Versão ${selected} no link público. Não cria uma nova versão nem altera o rascunho.`}</p></div>
      <button type="button" className="ws-action ws-action-secondary" disabled={blocked || Number(selected) === version} onClick={event => { origin.current = event.currentTarget; setOperation('publish'); }}>Publicar esta versão</button></div>
      <div className="ws-publication-version-operation"><div><h4>Recuperar conteúdo para editar</h4><p>Copia esta versão para o rascunho do administrativo. O link público não muda; publicar continua sendo uma ação separada.</p></div>
      <button type="button" className="ws-action ws-action-secondary" disabled={blocked} onClick={event => { origin.current = event.currentTarget; setOperation('restore'); }}>Restaurar no rascunho</button></div>
    </div>
    {dirty && <p className="ws-publication-caption">Salve ou descarte as edições locais antes de usar uma versão.</p>}
    {state.error && <Notice tone="error">{state.error}</Notice>}
    {state.success && <p role="status">{state.success}</p>}
    {busy && <p role="status">Aplicando versão…</p>}
    <form ref={form} hidden action={submit} data-campaign-navigation="true" onSubmit={event => { if (blocked || !authorized.current) event.preventDefault(); authorized.current = false; }}>
      <input type="hidden" name="confirm" value="yes" /><input type="hidden" name="operation" value={operation ?? ''} />
      <input type="hidden" name="targetVersion" value={selected} /><input type="hidden" name="version" value={version} />
      <input type="hidden" name="revision" value={revision} /><input type="hidden" name="updatedAt" value={updatedAt} />
    </form>
    <AlertDialog open={operation !== null} onOpenChange={open => { if (!open) setOperation(null); }}>
      <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); origin.current?.focus(); }}>
        <header><AlertDialogTitle>{operation === 'publish' ? `Publicar a Versão ${selected}?` : `Restaurar a Versão ${selected} no rascunho?`}</AlertDialogTitle>
          <AlertDialogDescription>{operation === 'publish' ? 'O link público usará esta versão. O rascunho e a suspensão não serão alterados. O histórico será preservado.' : 'Nome, encerramento, artes, figurinhas e cores do rascunho serão substituídos. A página pública, cliente, observações, cobranças e suspensão não serão alterados.'}</AlertDialogDescription></header>
        <footer><AlertDialogCancel asChild><button type="button" className="ws-action ws-action-secondary">Cancelar</button></AlertDialogCancel>
          <AlertDialogAction asChild><button type="button" className="ws-action ws-action-primary" disabled={blocked} onClick={() => { if (blocked) return; authorized.current = true; form.current?.requestSubmit(); }}>{operation === 'publish' ? 'Publicar esta versão' : 'Restaurar no rascunho'}</button></AlertDialogAction></footer>
      </AlertDialogContent>
    </AlertDialog>
  </section></details>;
}
