import { CampaignEditorError } from './campaign-editor';

export function publicationPointer(version: number, suspended: boolean) {
  if (!Number.isSafeInteger(version) || version < 1) throw new CampaignEditorError(422, 'Versão pública inválida.');
  return suspended ? { version, suspended: true as const } : { version };
}

// Used under the campaign row lock. Pending deliveries are deliberately blocked:
// they must finish before access can be changed (including explicit retries).
export function validatePublicationAccess(
  campaign: { updatedAt: Date; publicationStatus: string },
  publication: { deliveredAt: Date | null; config: { endsAt: string } } | undefined,
  suspended: boolean,
  actor: string,
  expectedUpdatedAt: string,
  now = new Date(),
): asserts publication is { deliveredAt: Date; config: { endsAt: string } } {
  if (typeof suspended !== 'boolean' || typeof actor !== 'string' || !actor.trim()) throw new CampaignEditorError(422, 'Alteração de acesso inválida.');
  if (typeof expectedUpdatedAt !== 'string' || campaign.updatedAt.toISOString() !== expectedUpdatedAt) throw new CampaignEditorError(409, 'A campanha mudou. Recarregue antes de alterar o acesso.');
  if (campaign.publicationStatus !== 'published' || !publication) throw new CampaignEditorError(422, 'Publique a campanha antes de alterar o acesso.');
  if (!publication.deliveredAt) throw new CampaignEditorError(409, 'Conclua a publicação pendente antes de alterar o acesso.');
  const endsAt = Date.parse(publication.config.endsAt);
  if (!suspended && (!Number.isFinite(endsAt) || endsAt <= now.getTime())) throw new CampaignEditorError(422, 'A versão pública está encerrada. Publique uma versão com prazo futuro antes de reativar.');
}
