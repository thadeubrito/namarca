import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaigns, payments } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { UUID } from '@/lib/campaign-editor';
import { formatMoney, paymentLabels, summarizePayments } from '@/lib/financial-report';
export const dynamic = 'force-dynamic';
export default async function FinancialPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [campaign] = await db.select({ name: campaigns.name }).from(campaigns).where(eq(campaigns.id, id));
  if (!campaign) notFound();
  const rows = await db.select().from(payments).where(eq(payments.campaignId, id)).orderBy(desc(payments.createdAt), desc(payments.id));
  const totals = summarizePayments(rows);
  const date = (value: Date | null) => value ? value.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—';
  return <div className="stack">
    <div className="page-heading"><div><p className="eyebrow">Relatório financeiro</p><h1>{campaign.name}</h1><p>Posição das cobranças registradas · {date(new Date())} (São Paulo)</p></div><Link className="button secondary" href={`/admin/campanhas/${id}`}>Voltar à campanha</Link></div>
    <div className="notice">Valores nominais das tentativas de pagamento, não saldo bancário ou valor líquido recebido. Taxas, conversão e liquidação em DePix não estão contabilizadas. Situações refletem a última confirmação ou consulta registrada.</div>
    <div className="grid">{(Object.keys(paymentLabels) as (keyof typeof paymentLabels)[]).map(status => <section className="panel" key={status} aria-label={paymentLabels[status]}><p className="eyebrow">{paymentLabels[status]}</p><h2>{formatMoney(totals[status].amountCents)}</h2><p className="muted">{totals[status].count} {totals[status].count === 1 ? 'tentativa' : 'tentativas'}</p></section>)}</div>
    <section className="panel stack"><h2>Tentativas registradas</h2><p className="muted">Tentativas expiradas ou canceladas não são novas vendas. Reembolsos são separados de pagamentos atualmente pagos. A data de confirmação é o registro local, não o instante de liquidação.</p>{rows.length ? <><a className="button secondary" href={`/api/campaigns/${id}/financial-report`}>Baixar CSV financeiro</a><div className="table-scroll"><table><thead><tr><th>Referência</th><th>Situação</th><th>Valor</th><th>Criada em</th><th>Confirmação registrada</th><th>Atualizada em</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.externalId}</td><td>{paymentLabels[row.status]}</td><td>{formatMoney(row.amountCents)}</td><td>{date(row.createdAt)}</td><td>{date(row.paidAt)}</td><td>{date(row.updatedAt)}</td></tr>)}</tbody></table></div></> : <p>Nenhuma tentativa registrada. Emita o link de cobrança nos detalhes da campanha.</p>}</section>
    <p className="muted">Este relatório é administrativo. Não contém métricas de participantes, alcance ou publicações sociais. Para atualizar uma cobrança, use “Consultar na PixGo” nos detalhes da campanha.</p>
  </div>;
}
