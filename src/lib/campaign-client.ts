import { eq } from 'drizzle-orm';
import { clients } from '@/db/schema';
import type { db } from '@/db';
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
/** Called inside the campaign transaction; never trusts client names sent for existing IDs. */
export async function resolveCampaignClient(tx: Transaction, input: { clientId: string; clientName: string; clientContact: string }) {
  if (!input.clientId) return null;
  if (input.clientId === 'new') {
    const [client] = await tx.insert(clients).values({ name: input.clientName, contact: input.clientContact }).returning({ id: clients.id });
    return client.id;
  }
  const [client] = await tx.select({ id: clients.id }).from(clients).where(eq(clients.id, input.clientId));
  if (!client) throw new Error('Client unavailable');
  return client.id;
}
