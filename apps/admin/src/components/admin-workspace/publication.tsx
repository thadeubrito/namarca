'use client';
import type { EventConfig } from '@namarca/editor/events';
import { PublicationDiff } from './publication-diff';
import { PublicationVersions } from './publication-versions';
import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeCampaignAccess, discardUnpublishedChanges, publishWithoutPayment } from '@/app/(workspace)/campanhas/[id]/publication-actions';
import { useCampaignAnyPending, useCampaignPending, usePublicationLock } from './campaign-sections';
import { Action, Notice, Surface } from './primitives';
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';

export function CampaignPublication({ suspended = false, ended = false, id, delivered, revision, published, updatedAt, unpublishedChanges, version, versions, draft }: { suspended?: boolean; ended?: boolean; version: number; versions: { version: number; config: EventConfig; publishedBy: string; deliveredAt: string }[]; draft: EventConfig; id: string; delivered: boolean; revision: number; published: boolean; updatedAt: string; unpublishedChanges: boolean }) {
  const lock = usePublicationLock();
  const [confirmation, setConfirmation] = useState<'publish' | 'discard' | 'access' | null>(null);
  const confirmed = useRef(false);
  const confirmationOrigin = useRef<'publish' | 'discard' | 'access'>('publish');
  const discardButton = useRef<HTMLButtonElement>(null);
  const accessButton = useRef<HTMLButtonElement>(null);
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
  const currentVersion = delivered ? version : [...versions].sort((a, b) => Date.parse(b.deliveredAt) - Date.parse(a.deliveredAt))[0]?.version;
  const nextVersion = published && delivered ? Math.max(version, ...versions.map(item => item.version)) + 1 : version;
  const displayedVersion = currentVersion ?? version;
  const publicVersion = versions.find(item => item.version === currentVersion);
  useEffect(() => { lock(working); return () => lock(false); }, [working, lock]);
  useEffect(() => { const refresh = () => router.refresh(); window.addEventListener('namarca:editor-saved', refresh); return () => window.removeEventListener('namarca:editor-saved', refresh); }, [router]);
  useEffect(() => { if (state.published || state.error) router.refresh(); }, [state, router]);
  useEffect(() => { if (access.success || access.error) router.refresh(); }, [access, router]);
  useEffect(() => { if (discard.restored) window.location.reload(); }, [discard]);
  return <Surface className="ws-publication">
    <div className="ws-publication-overview">
    <section className="ws-publication-live" aria-label="Publicação atual">
    <div className="ws-publication-top">
      <header className="ws-publication-heading">
        <p className="ws-publication-label">{currentVersion ? 'Publicada atualmente' : 'Publicação atual'}</p>
        <h2>{currentVersion ? `Versão ${currentVersion}` : 'Ainda não publicada'}</h2>
      </header>
    </div>
    <p className="ws-publication-caption">{currentVersion ? ended ? 'Prazo encerrado. O editor público está encerrado.' : suspended ? 'Acesso suspenso. Esta versão será usada ao reativar.' : 'Esta é a versão disponível no link público.' : 'Nenhuma versão está disponível no link público.'}</p>
    {publicVersion && <p className="ws-publication-caption">Última publicação em <time dateTime={publicVersion.deliveredAt}>{new Date(publicVersion.deliveredAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</time></p>}
    {delivered && (!ended || !suspended) && <div className="ws-publication-live-actions"><Action ref={accessButton} variant="secondary" disabled={working} onClick={() => { confirmationOrigin.current = 'access'; setConfirmation('access'); }}>{suspended ? 'Reativar campanha' : 'Suspender campanha'}</Action></div>}
    </section>
    <section className="ws-publication-draft" aria-label={pendingDelivery ? 'Envio pendente' : 'Próxima publicação'}>
      <header className="ws-publication-heading">
        <p className="ws-publication-label">{pendingDelivery ? 'Envio pendente' : 'Próxima publicação'}</p>
        <h2>{pendingDelivery ? `Versão ${version}` : upToDate && !dirty ? 'Sem alterações' : `Versão ${nextVersion}`}</h2>
      </header>
      <p className="ws-publication-caption" role="status">{pendingDelivery ? 'Conclua o envio do conteúdo já preparado, sem incluir novas edições.' : dirty ? 'Salve as alterações nas abas editadas para continuar.' : upToDate ? `O rascunho está igual à Versão ${currentVersion} publicada.` : currentVersion ? `As alterações salvas substituirão a Versão ${currentVersion} no link público.` : 'O conteúdo salvo ficará disponível no link público.'}</p>
    <form ref={publishForm} action={submit} className="ws-publication-form" data-campaign-navigation="true" onSubmit={event => {
      if (working || dirty || revision < 1) { event.preventDefault(); return; }
      if (!published && !confirmed.current) { event.preventDefault(); confirmationOrigin.current = 'publish'; setConfirmation('publish'); }
      confirmed.current = false;
    }}>
      {!pendingDelivery && suspended && !upToDate && <p className="ws-publication-caption">A campanha permanece suspensa ao publicar alterações.</p>}
      <input type="hidden" name="updatedAt" value={updatedAt} /><input type="hidden" name="revision" value={revision} />
      {!published && <input type="hidden" name="confirm" value="yes" />}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.published && <p role="status">{suspended ? 'Versão publicada. A campanha permanece suspensa.' : 'Versão publicada com sucesso.'}</p>}
      <div className="ws-publication-draft-actions">
        {(!upToDate || dirty) && <Action ref={publishButton} type="submit" disabled={working || dirty || revision < 1}>{busy ? 'Enviando…' : pendingDelivery ? 'Concluir envio' : published ? 'Publicar alterações' : 'Publicar campanha'}</Action>}
        {delivered && unpublishedChanges && <Action ref={discardButton} variant="ghost" disabled={working || anyDirty} onClick={() => { confirmationOrigin.current = 'discard'; setConfirmation('discard'); }}>Restaurar versão publicada</Action>}
      </div>
    </form>
    </section>
    </div>
    {versions.length > 0 && <PublicationDiff key={`diff:${revision}:${updatedAt}:${version}`} campaignId={id} versions={versions} draft={draft} currentVersion={currentVersion} />}
    {delivered && <PublicationVersions key={`versions:${revision}:${updatedAt}:${version}`} id={id} version={version} revision={revision} updatedAt={updatedAt} versions={versions} />}
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
    {delivered && unpublishedChanges && anyDirty && <p className="ws-publication-caption">Para restaurar a versão publicada, salve ou descarte primeiro as edições locais.</p>}
    {ended && suspended && <p className="ws-publication-caption">Publique um prazo futuro antes de reativar.</p>}
    {discard.error && <Notice tone="error">{discard.error}</Notice>}
    {access.error && <Notice tone="error">{access.error}</Notice>}
    {(discardBusy || accessBusy) && <p role="status" className="ws-publication-caption">{discardBusy ? 'Restaurando rascunho…' : 'Atualizando acesso…'}</p>}
    {access.success && <p role="status">{access.success}</p>}
    <AlertDialog open={confirmation !== null} onOpenChange={open => { if (!open) setConfirmation(null); }}>
      <AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); (confirmationOrigin.current === 'publish' ? publishButton : confirmationOrigin.current === 'discard' ? discardButton : accessButton).current?.focus(); }}>
        <header>
          <AlertDialogTitle>{confirmation === 'publish' ? 'Publicar campanha?' : confirmation === 'discard' ? 'Restaurar versão publicada?' : suspended ? 'Reativar campanha?' : 'Suspender campanha?'}</AlertDialogTitle>
          <AlertDialogDescription>{confirmation === 'publish' ? `Os materiais da Versão ${displayedVersion} ficarão disponíveis no link público.` : confirmation === 'discard' ? `O rascunho será restaurado para a Versão ${currentVersion}. Cliente, observações, cobranças e disponibilidade não serão alterados.` : suspended ? `A Versão ${version} voltará a ficar disponível. Alterações não publicadas não serão incluídas.` : 'O acesso público será interrompido. O conteúdo e o histórico serão preservados. O prazo de encerramento não será pausado.'}</AlertDialogDescription>
        </header>
        <footer>
          <AlertDialogCancel asChild><button type="button" className="ws-action ws-action-secondary">Cancelar</button></AlertDialogCancel>
          <AlertDialogAction asChild><button type="button" className="ws-action ws-action-primary" disabled={working || confirmation === 'discard' && anyDirty || confirmation === 'publish' && dirty} onClick={() => {
            if (working || confirmation === 'discard' && anyDirty || confirmation === 'publish' && dirty) return;
            confirmed.current = true;
            (confirmation === 'publish' ? publishForm : confirmation === 'discard' ? discardForm : accessForm).current?.requestSubmit();
          }}>{confirmation === 'publish' ? 'Publicar campanha' : confirmation === 'discard' ? 'Restaurar versão publicada' : suspended ? 'Reativar' : 'Suspender'}</button></AlertDialogAction>
        </footer>
      </AlertDialogContent>
    </AlertDialog>
    </Surface>;
}
