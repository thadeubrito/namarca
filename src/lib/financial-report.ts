export const paymentLabels = { pending: 'Pendente', paid: 'Pago', expired: 'Expirado', cancelled: 'Cancelado', refunded: 'Reembolsado' } as const;
export type ReportPayment = {
  externalId: string;
  amountCents: number;
  status: keyof typeof paymentLabels;
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
};
export function summarizePayments(rows: readonly ReportPayment[]) {
  const totals = Object.fromEntries(Object.keys(paymentLabels).map(status => [status, { count: 0, amountCents: 0 }])) as Record<keyof typeof paymentLabels, { count: number; amountCents: number }>;
  for (const row of rows) {
    if (!Number.isSafeInteger(row.amountCents) || row.amountCents <= 0 || !Object.hasOwn(totals, row.status)) throw new Error('Invalid financial record');
    const total = totals[row.status];
    total.count++;
    total.amountCents += row.amountCents;
    if (!Number.isSafeInteger(total.amountCents)) throw new Error('Financial total overflow');
  }
  return totals;
}
export function formatMoney(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
export function csvCell(value: string) {
  // Quote delimiters/newlines and neutralize spreadsheet formulas, including leading whitespace.
  const safe = /^[\s\uFEFF]*[=+\-@]/u.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function financialCsv(rows: readonly ReportPayment[], campaignName?: (row: ReportPayment, index: number) => string) {
  summarizePayments(rows);
  const header = ['Referência', 'Situação', 'Valor (BRL)', 'Criada em (UTC)', 'Confirmação registrada em (UTC)', 'Atualizada em (UTC)'];
  if (campaignName) header.unshift('Campanha');
  const data = rows.map((row, index) => [...(campaignName ? [campaignName(row, index)] : []), row.externalId, paymentLabels[row.status], `${Math.floor(row.amountCents / 100)},${String(row.amountCents % 100).padStart(2, '0')}`, row.createdAt.toISOString(), row.paidAt?.toISOString() ?? '', row.updatedAt.toISOString()]);
  return '\uFEFF' + [header, ...data].map(columns => columns.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
