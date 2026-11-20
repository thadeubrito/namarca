import { z } from 'zod';
import { paymentLabels } from './financial-report';

const day = z.iso.date();
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(value => value === '' || value === undefined ? undefined : value, schema.optional());
export const financialFiltersSchema = z.object({
  campaign: optional(z.uuid()),
  status: optional(z.enum(Object.keys(paymentLabels) as [keyof typeof paymentLabels, ...(keyof typeof paymentLabels)[]])),
  from: optional(day),
  to: optional(day),
}).refine(value => !value.from || !value.to || value.from <= value.to, { message: 'A data final deve ser igual ou posterior à inicial.' });
export type FinancialFilters = z.infer<typeof financialFiltersSchema>;

// Datas do filtro são dias de criação da tentativa em São Paulo (UTC−3).
export function financialDateBounds(filters: FinancialFilters) {
  return {
    from: filters.from ? new Date(`${filters.from}T00:00:00-03:00`) : undefined,
    until: filters.to ? new Date(new Date(`${filters.to}T00:00:00-03:00`).getTime() + 86400000) : undefined,
  };
}
export function financialFilterQuery(filters: FinancialFilters) {
  return new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => typeof entry[1] === 'string')).toString();
}
