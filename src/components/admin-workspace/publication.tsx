'use client';
import type { EventConfig } from '@namarca/editor/events';
import { PublicationDiff } from './publication-diff';
import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { publishWithoutPayment } from '@/app/(workspace)/campanhas/[id]/publication-actions';
import { useCampaignPending, usePublicationLock } from './campaign-sections';
import { Action, ActionLink, Notice, Surface } from './primitives';

export function CampaignPublication({ id, publicUrl, delivered, revision, published, updatedAt, unpublishedChanges, version, versions, draft }: { version: number; versions: { version: number; config: EventConfig; publishedBy: string; deliveredAt: string }[]; draft: EventConfig; id: string; publicUrl: string; delivered: boolean; revision: number; published: boolean; updatedAt: string; unpublishedChanges: boolean }) {
  const lock = usePublicationLock();
  const dirty = useCampaignPending();
  const [state, submit, busy] = useActionState(publishWithoutPayment.bind(null, id), {});
  const router = useRouter();
  const pendingDelivery = published && !delivered;
  const targetVersion = published && delivered ? version + 1 : version;
  const upToDate = delivered && !unpublishedChanges;
  useEffect(() => { lock(busy); return () => lock(false); }, [busy, lock]);
  useEffect(() => { const refresh = () => router.refresh(); window.addEventListener('namarca:editor-saved', refresh); return () => window.removeEventListener('namarca:editor-saved', refresh); }, [router]);
  useEffect(() => { if (state.published || state.error) router.refresh(); }, [state, router]);
  return <Surface className="ws-publication"><h2>{pendingDelivery ? 'Envio pendente' : !published ? 'Publicar campanha' : unpublishedChanges ? 'Alterações não publicadas' : 'Publicação atualizada'}</h2>
    {versions.length > 0 && <p className="ws-publication-caption">Versão pública: v{versions.at(-1)?.version}</p>}
    {versions.length > 0 && <PublicationDiff key={`${revision}:${updatedAt}:${version}`} campaignId={id} versions={versions} draft={draft} />}
    {delivered && <ActionLink href={publicUrl} target="_blank" rel="noopener noreferrer">Abrir campanha pública</ActionLink>}
    <form action={submit} className="ws-publication-form" data-campaign-navigation="true">
      <p>{pendingDelivery ? 'Conclua o envio da versão pendente. Novas edições do rascunho não entram nesse envio.' : !published ? 'Disponibilize a versão salva no site público. A publicação não exige pagamento e não altera as cobranças.' : unpublishedChanges ? 'As alterações salvas ainda não estão no site público. A versão anterior permanece disponível até a atualização terminar.' : 'O site público já está com a versão salva mais recente.'}</p>
      <input type="hidden" name="updatedAt" value={updatedAt} /><input type="hidden" name="revision" value={revision} />
      {!published && <label className="ws-publication-confirm"><input type="checkbox" name="confirm" value="yes" required disabled={busy || dirty} /><span>Autorizo disponibilizar publicamente os materiais salvos, sem exigir pagamento.</span></label>}
      {dirty && <Notice>Existem alterações ainda não salvas. Salve antes de atualizar a publicação.</Notice>}
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {(!upToDate || dirty) && <Action type="submit" disabled={busy || dirty || revision < 1}>{busy ? 'Enviando…' : pendingDelivery ? `Concluir v${targetVersion}` : `Publicar v${targetVersion}`}</Action>}
    </form></Surface>;
}
