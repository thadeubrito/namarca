import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { Download } from 'lucide-react';
import { db } from '@/db';
import { campaigns, payments } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { UUID } from '@/lib/campaign-editor';
import { formatMoney, paymentLabels, summarizePayments } from '@/lib/financial-report';
import { Workspace, PageIntro, ActionLink, Surface, Notice, Pill, EmptyState } from '@/components/admin-workspace/primitives';
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
  return <Workspace><PageIntro eyebrow="Campanhas / Financeiro" title={campaign.name} description={`Atualizado em ${date(new Date())} (São Paulo)`} action={<ActionLink href={`/admin/campanhas/${id}`}>Voltar à campanha</ActionLink>} />
    <div className="flex flex-col gap-6 lg:flex-row"><Surface className="lg:w-72 lg:shrink-0"><h2 className="mb-6">Por situação</h2><div className="space-y-6">{(Object.keys(paymentLabels) as (keyof typeof paymentLabels)[]).map(status => <section key={status} aria-label={paymentLabels[status]} className="border-b pb-5 last:border-b-0 last:pb-0"><div className="flex items-center justify-between gap-3"><Pill tone={status === 'paid' ? 'success' : 'neutral'}>{paymentLabels[status]}</Pill><span className="text-xs text-muted-foreground">{totals[status].count} {totals[status].count === 1 ? 'tentativa' : 'tentativas'}</span></div><h3 className="!mt-3 !text-2xl font-semibold tabular-nums">{formatMoney(totals[status].amountCents)}</h3></section>)}</div></Surface>
      <div className="min-w-0 flex-1 space-y-6"><div className="ws-section-heading"><div><h2>Tentativas</h2><p className="mt-2 text-xs text-muted-foreground">Situações da última confirmação ou consulta.</p></div>{rows.length > 0 && <ActionLink href={`/api/campaigns/${id}/financial-report`}><Download aria-hidden />Baixar CSV</ActionLink>}</div>{rows.length ? <div className="ws-scroll"><table className="ws-ledger"><thead><tr><th>Referência</th><th>Situação</th><th>Valor</th><th>Criada em</th><th>Confirmação registrada</th><th>Atualizada em</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.externalId}</td><td>{paymentLabels[row.status]}</td><td className="whitespace-nowrap tabular-nums">{formatMoney(row.amountCents)}</td><td>{date(row.createdAt)}</td><td>{date(row.paidAt)}</td><td>{date(row.updatedAt)}</td></tr>)}</tbody></table></div> : <EmptyState title="Nenhuma tentativa registrada." description="Os pagamentos desta campanha serão listados aqui." />}<Notice role="note">Valores das tentativas, não saldo líquido. Não incluem taxas, conversão ou liquidação em DePix. Expiradas e canceladas não são vendas. Reembolsos ficam separados dos pagos. Confirmação não é liquidação.</Notice><p className="text-xs text-muted-foreground">Para atualizar, use “Consultar na PixGo” na campanha.</p></div></div>
  </Workspace>;
}
