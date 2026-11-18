import { z } from 'zod';
import type { EventConfig } from '@namarca/editor/events';
import { validateCampaignEvent, type CampaignIdentity, type EditorAsset } from './campaign-editor';

export const packageApprovalInput = z.object({
  revision: z.coerce.number().int().positive(),
  identity: z.string().min(1).max(2000),
  approvedBy: z.string().trim().min(1, 'Informe quem aprovou o pacote.').max(200),
  channel: z.enum(['whatsapp', 'email', 'presencial', 'outro']),
  approvedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rights: z.literal('on', { error: 'Confirme a autorização de uso dos materiais.' }),
}).strict();
export function packageIdentity(campaign: CampaignIdentity) {
  return JSON.stringify([campaign.name, campaign.slug, campaign.endsAt.toISOString()]);
}
export function validatePackage(config: unknown, campaign: CampaignIdentity, assets: readonly EditorAsset[], now = new Date()): EventConfig {
  if (campaign.endsAt <= now) throw new Error('A campanha precisa ter encerramento futuro.');
  const event = validateCampaignEvent(config, campaign, assets);
  if (!event.artworks.length) throw new Error('Salve ao menos uma arte antes de registrar a aprovação.');
  if (event.demo) throw new Error('O pacote aprovado não pode estar em modo de demonstração.');
  return event;
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}
export function packageMatches(config: EventConfig, current: EventConfig) {
  // PostgreSQL JSONB does not preserve object key order; array order remains significant.
  return JSON.stringify(canonical(config)) === JSON.stringify(canonical(current));
}
