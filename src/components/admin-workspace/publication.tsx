'use client';
import type { EventConfig } from '@namarca/editor/events';
import { PublicationDiff } from './publication-diff';
import { useActionState, useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Pause, Play, Undo2 } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useDarkTheme } from '@/components/theme-scope';
import { useRouter } from 'next/navigation';
import { changeCampaignAccess, discardUnpublishedChanges, publishWithoutPayment } from '@/app/(workspace)/campanhas/[id]/publication-actions';
import { useCampaignAnyPending, useCampaignPending, usePublicationLock } from './campaign-sections';
import { Action, Notice, Surface } from './primitives';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

export function CampaignPublication({ suspended = false, ended = false, id, delivered, revision, published, updatedAt, unpublishedChanges, version, versions, draft }: { suspended?: boolean; ended?: boolean; version: number; versions: { version: number; config: EventConfig; publishedBy: string; deliveredAt: string }[]; draft: EventConfig; id: string; delivered: boolean; revision: number; published: boolean; updatedAt: string; unpublishedChanges: boolean }) {
  const lock = usePublicationLock();
  const dark = useDarkTheme();
  const [confirmation, setConfirmation] = useState<'publish' | 'discard' | 'access' | null>(null);
  const confirmed = useRef(false);
  const confirmationOrigin = useRef<'publish' | 'options'>('options');
  const optionsTrigger = useRef<HTMLButtonElement>(null);
  const publishForm = useRef<HTMLFormElement>(null);
  const publishButton = useRef<HTMLButtonElement>(null);
  const discardForm = useRef<HTMLFormElement>(null);
  const accessForm = useRef<HTMLFormElement>(null);
  const dirty = useCampaignPending();
  const anyDirty = useCampaignAnyPending();
  const [state, submit, busy] = useActionState(publishWithoutPayment.bind(null, id), {});
  const [access, accessSubmit, accessBusy] = useActionState(changeCampaignAccess.bind(null, id), {});
  const [discard, discardSubmit, discardBusy] = useActionState(discardUnpublishedChanges.bind(null, id), {});
  const working = busy || accessBusy || discardBusy;
  const router = useRouter();
  const pendingDelivery = published && !delivered;
  const upToDate = delivered && !unpublishedChanges;
  const currentVersion = versions.at(-1)?.version;
  const nextVersion = published && delivered ? version + 1 : version;
  const displayedVersion = upToDate ? currentVersion ?? version : nextVersion;
  useEffect(() => { lock(working); return () => lock(false); }, [working, lock]);
  useEffect(() => { const refresh = () => router.refresh(); window.addEventListener('namarca:editor-saved', refresh); return () => window.removeEventListener('namarca:editor-saved', refresh); }, [router]);
  useEffect(() => { if (state.published || state.error) router.refresh(); }, [state, router]);
  useEffect(() => { if (access.success || access.error) router.refresh(); }, [access, router]);
  useEffect(() => { if (discard.restored) window.location.reload(); }, [discard]);
  return <Surface className="ws-publication">
    <div className="ws-publication-top">
      <header className="ws-publication-heading">
        <h2>Versão {displayedVersion}</h2>
        <p>{pendingDelivery ? `Envio pendente${currentVersion ? ` · versão ${currentVersion} publicada` : ' · primeira publicação'}` : upToDate ? 'Publicação atualizada' : currentVersion ? `Versão ${currentVersion} publicada atualmente` : 'Ainda não publicada'}</p>
      </header>
      {delivered && (unpublishedChanges || !ended || !suspended) && <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild><button ref={optionsTrigger} type="button" className="ws-action ws-action-secondary ws-publication-more" aria-label="Mais opções de publicação" disabled={working}><span>Opções</span><MoreHorizontal aria-hidden /></button></DropdownMenu.Trigger>
        <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={6} className={`ui-scope ws-share-menu${dark ? ' dark' : ''}`}>
          {unpublishedChanges && <DropdownMenu.Item disabled={anyDirty} onSelect={() => { confirmationOrigin.current = 'options'; setConfirmation('discard'); }}><Undo2 aria-hidden />Descartar alterações</DropdownMenu.Item>}
          {unpublishedChanges && (!ended || !suspended) && <DropdownMenu.Separator className="ws-publication-menu-separator" />}
          {(!ended || !suspended) && <DropdownMenu.Item onSelect={() => { confirmationOrigin.current = 'options'; setConfirmation('access'); }}>{suspended ? <Play aria-hidden /> : <Pause aria-hidden />}{suspended ? 'Reativar campanha' : 'Suspender campanha'}</DropdownMenu.Item>}
        </DropdownMenu.Content></DropdownMenu.Portal>
      </DropdownMenu.Root>}
    </div>
    {versions.length > 0 && <PublicationDiff key={`${revision}:${updatedAt}:${version}`} campaignId={id} versions={versions} draft={draft} />}
    <form ref={publishForm} action={submit} className="ws-publication-form" data-campaign-navigation="true" onSubmit={event => {
      if (working || dirty || revision < 1) { event.preventDefault(); return; }
      if (!published && !confirmed.current) { event.preventDefault(); confirmationOrigin.current = 'publish'; setConfirmation('publish'); }
      confirmed.current = false;
    }}>
      {pendingDelivery ? <p>Conclua o envio da versão {version}, sem incluir novas edições.</p> : suspended && <p>A campanha permanece suspensa ao publicar alterações.</p>}
      <input type="hidden" name="updatedAt" value={updatedAt} /><input type="hidden" name="revision" value={revision} />
      {!published && <input type="hidden" name="confirm" value="yes" />}
      {dirty && <Notice>Salve as alterações para publicar.</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.published && <p role="status">{suspended ? 'Versão publicada. A campanha permanece suspensa.' : 'Versão publicada com sucesso.'}</p>}
      {(!upToDate || dirty) && <Action ref={publishButton} type="submit" disabled={working || dirty || revision < 1}>{busy ? 'Enviando…' : pendingDelivery ? 'Concluir envio' : published ? 'Publicar alterações' : 'Publicar campanha'}</Action>}
    </form>
    {delivered && unpublishedChanges && <form ref={discardForm} hidden action={discardSubmit} data-campaign-navigation="true" onSubmit={event => {
      if (working || anyDirty || !confirmed.current) event.preventDefault();
      confirmed.current = false;
    }}>
      <input type="hidden" name="confirm" value="yes" />
      <input type="hidden" name="revision" value={revision} />
      <input type="hidden" name="updatedAt" value={updatedAt} />
      <input type="hidden" name="version" value={currentVersion} />
    </form>}
    {delivered && <form ref={accessForm} hidden action={accessSubmit} data-campaign-navigation="true" onSubmit={event => {
      if (working || !confirmed.current) event.preventDefault();
      confirmed.current = false;
    }}>
      <input type="hidden" name="updatedAt" value={updatedAt} />
      <input type="hidden" name="suspended" value={suspended ? 'no' : 'yes'} />
    </form>}
    {delivered && unpublishedChanges && anyDirty && <p className="ws-publication-caption">Para descartar alterações, salve ou descarte primeiro as edições locais.</p>}
    {ended && suspended && <p className="ws-publication-caption">Publique um prazo futuro antes de reativar.</p>}
    {discard.error && <Notice tone="error">{discard.error}</Notice>}
    {access.error && <Notice tone="error">{access.error}</Notice>}
    {(discardBusy || accessBusy) && <p role="status" className="ws-publication-caption">{discardBusy ? 'Descartando alterações…' : 'Atualizando acesso…'}</p>}
    {access.success && <p role="status">{access.success}</p>}
    <AlertDialog open={confirmation !== null} onOpenChange={open => { if (!open) setConfirmation(null); }}>
      <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); (confirmationOrigin.current === 'publish' ? publishButton : optionsTrigger).current?.focus(); }}>
        <header>
          <AlertDialogTitle>{confirmation === 'publish' ? 'Publicar campanha?' : confirmation === 'discard' ? 'Descartar alterações?' : suspended ? 'Reativar campanha?' : 'Suspender campanha?'}</AlertDialogTitle>
          <AlertDialogDescription>{confirmation === 'publish' ? `Os materiais da Versão ${displayedVersion} ficarão disponíveis no link público.` : confirmation === 'discard' ? `O rascunho será restaurado para a Versão ${currentVersion}. Cliente, observações, cobranças e disponibilidade não serão alterados.` : suspended ? `A Versão ${version} voltará a ficar disponível. Alterações não publicadas não serão incluídas.` : 'O acesso público será interrompido. O conteúdo e o histórico serão preservados. O prazo de encerramento não será pausado.'}</AlertDialogDescription>
        </header>
        <footer>
          <AlertDialogCancel asChild><button type="button" className="ws-action ws-action-secondary">Cancelar</button></AlertDialogCancel>
          <AlertDialogAction asChild><button type="button" className="ws-action ws-action-primary" disabled={working || confirmation === 'discard' && anyDirty || confirmation === 'publish' && dirty} onClick={() => {
            if (working || confirmation === 'discard' && anyDirty || confirmation === 'publish' && dirty) return;
            confirmed.current = true;
            (confirmation === 'publish' ? publishForm : confirmation === 'discard' ? discardForm : accessForm).current?.requestSubmit();
          }}>{confirmation === 'publish' ? 'Publicar campanha' : confirmation === 'discard' ? 'Descartar alterações' : suspended ? 'Reativar' : 'Suspender'}</button></AlertDialogAction>
        </footer>
      </AlertDialogContent>
    </AlertDialog>
    </Surface>;
}
