import { asc } from 'drizzle-orm';
import { ArrowUpRight, Download } from 'lucide-react';
import { db } from '@/db';
import { campaigns } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { financialFiltersSchema, financialFilterQuery } from '@/lib/financial-filters';
import { globalFinancialRows } from '@/lib/global-financial-report';
import { formatMoney, paymentLabels, summarizePayments } from '@/lib/financial-report';
import { Workspace, PageIntro, Action, ActionLink, Surface, Field, TextInput, Notice, Pill } from '@/components/admin-workspace/primitives';

export const dynamic = 'force-dynamic';
export default async function FinancialPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const raw = await searchParams;
  const parsed = financialFiltersSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : {};
  const options = await db.select({ id: campaigns.id, name: campaigns.name }).from(campaigns).orderBy(asc(campaigns.name));
  const rows = parsed.success ? await globalFinancialRows(filters) : [];
  const totals = summarizePayments(rows);
  const date = (value: Date | null) => value ? value.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—';
  return <Workspace className="ws-financial"><PageIntro title="Financeiro" description="Acompanhe os pagamentos de todas as campanhas." action={parsed.success && rows.length > 0 ? <ActionLink href={`/api/financial-report?${financialFilterQuery(filters)}`}><Download aria-hidden />Baixar CSV</ActionLink> : undefined} />
    <Surface><form action="/admin/financeiro" method="get" className="ws-financial-filters">
      <Field label="Campanha"><select className="ws-input" name="campaign" defaultValue={filters.campaign ?? ''}><option value="">Todas as campanhas</option>{options.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></Field>
      <Field label="Situação"><select className="ws-input" name="status" defaultValue={filters.status ?? ''}><option value="">Todas as situações</option>{Object.entries(paymentLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></Field>
      <Field label="Criada a partir de"><TextInput type="date" name="from" defaultValue={filters.from} /></Field>
      <Field label="Criada até"><TextInput type="date" name="to" defaultValue={filters.to} /></Field>
      <div className="ws-billing-buttons"><Action type="submit">Aplicar filtros</Action><ActionLink href="/admin/financeiro" variant="ghost">Limpar</ActionLink></div>
    </form><p className="ws-billing-caption mt-3">Período pela criação da tentativa, incluindo os dias inicial e final, no horário de São Paulo. Situação atual, não histórica.</p></Surface>
    {!parsed.success && <Notice tone="error">Filtros inválidos. Confira a campanha, a situação e as datas; a data final não pode ser anterior à inicial.</Notice>}
    <div className="ws-financial-totals">{(['paid', 'pending', 'expired', 'cancelled', 'refunded'] as const).map(status => <Surface key={status} className={status === 'paid' ? 'ws-financial-featured' : undefined}><section aria-label={paymentLabels[status]}><Pill tone={status === 'paid' ? 'success' : status === 'pending' ? 'warning' : 'neutral'}>{paymentLabels[status]}</Pill><p className="ws-financial-value">{formatMoney(totals[status].amountCents)}</p><p className="ws-billing-caption">{totals[status].count} {totals[status].count === 1 ? 'tentativa' : 'tentativas'}</p></section></Surface>)}</div>
    <Surface><div className="ws-billing-history-heading"><h2>Tentativas de pagamento</h2><span className="ws-billing-caption">{rows.length} registros</span></div>{rows.length ? <div className="ws-scroll"><table className="ws-ledger"><thead><tr><th>Campanha</th><th>Situação</th><th>Valor</th><th>Criada em</th><th>Confirmação registrada</th><th>Referência</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><ActionLink href={`/admin/campanhas/${row.campaignId}`} variant="ghost">{row.campaignName}<ArrowUpRight aria-hidden /></ActionLink></td><td><Pill tone={row.status === 'paid' ? 'success' : row.status === 'pending' ? 'warning' : 'neutral'}>{paymentLabels[row.status]}</Pill></td><td className="whitespace-nowrap tabular-nums">{formatMoney(row.amountCents)}</td><td>{date(row.createdAt)}</td><td>{date(row.paidAt)}</td><td>{row.externalId}</td></tr>)}</tbody></table></div> : <div className="ws-billing-empty"><p>{parsed.success ? 'Nenhuma tentativa encontrada' : 'Revise os filtros para consultar'}</p><span className="ws-billing-caption">{parsed.success ? 'Os pagamentos aparecerão aqui quando um Pix for gerado no checkout. Se houver filtros aplicados, tente ampliar a busca.' : 'Nenhum resultado foi consultado com os filtros inválidos.'}</span></div>}</Surface>
    <Notice>Valores das tentativas, não saldo ou lucro. Não incluem taxas, conversão ou liquidação em DePix. Expiradas e canceladas não são vendas; reembolsos ficam separados dos pagos. Para consultar a situação na PixGo, abra a campanha.</Notice>
  </Workspace>;
}
