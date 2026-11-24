import { requireAdmin } from '@/lib/admin';
import { editorErrorResponse } from '@/lib/campaign-editor';
import { financialFiltersSchema } from '@/lib/financial-filters';
import { financialCsv } from '@/lib/financial-report';
import { globalFinancialRows } from '@/lib/global-financial-report';

export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    await requireAdmin(request.headers);
    const search = new URL(request.url).searchParams;
    const parsed = financialFiltersSchema.safeParse(Object.fromEntries(['campaign', 'status', 'from', 'to'].map(key => [key, search.getAll(key).length > 1 ? search.getAll(key) : search.get(key) ?? undefined])));
    if (!parsed.success) return Response.json({ error: 'Filtros financeiros inválidos.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
    const rows = await globalFinancialRows(parsed.data);
    return new Response(financialCsv(rows, (_, index) => rows[index].campaignName), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="financeiro.csv"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) { return editorErrorResponse(error); }
}
