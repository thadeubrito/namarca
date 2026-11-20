import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { db } from '@/db';
import { campaigns, payments } from '@/db/schema';
import { financialDateBounds, type FinancialFilters } from './financial-filters';


// Chamadores devem exigir requireAdmin antes da leitura.
export function globalFinancialRows(filters: FinancialFilters) {
  const bounds = financialDateBounds(filters);
  return db.select({
    id: payments.id, campaignId: campaigns.id, campaignName: campaigns.name,
    externalId: payments.externalId, status: payments.status, amountCents: payments.amountCents,
    createdAt: payments.createdAt, updatedAt: payments.updatedAt, paidAt: payments.paidAt,
  }).from(payments).innerJoin(campaigns, eq(campaigns.id, payments.campaignId)).where(and(
    filters.campaign ? eq(payments.campaignId, filters.campaign) : undefined,
    filters.status ? eq(payments.status, filters.status) : undefined,
    bounds.from ? gte(payments.createdAt, bounds.from) : undefined,
    bounds.until ? lt(payments.createdAt, bounds.until) : undefined,
  )).orderBy(desc(payments.createdAt), desc(payments.id));
}
