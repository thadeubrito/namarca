import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { campaigns, payments } from '@/db/schema';
import { requireAdmin } from '@/lib/admin';
import { financialCsv } from '@/lib/financial-report';
import { requireUuid, editorErrorResponse } from '@/lib/campaign-editor';
export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request.headers);
    const id = requireUuid((await params).id);
    const [campaign] = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, id));
    if (!campaign) return Response.json({ error: 'Campanha não encontrada.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    const rows = await db.select({ externalId: payments.externalId, status: payments.status, amountCents: payments.amountCents, createdAt: payments.createdAt, updatedAt: payments.updatedAt, paidAt: payments.paidAt }).from(payments).where(eq(payments.campaignId, id)).orderBy(desc(payments.createdAt), desc(payments.id));
    return new Response(financialCsv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="financeiro-${id}.csv"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) { return editorErrorResponse(error); }
}
