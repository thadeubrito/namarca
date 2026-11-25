import "server-only";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { account, authBootstrap, user } from "@/db/auth-schema";
import { adminEmail } from "@/lib/auth";

import { bootstrapKeyConfigured, bootstrapKeyMatches, validBootstrapInput } from "@/lib/admin-bootstrap-input";

export async function bootstrapAvailable(): Promise<boolean> {
  try {
    if (!bootstrapKeyConfigured(process.env.ADMIN_BOOTSTRAP_KEY)) return false;
    const [state] = await db.select().from(authBootstrap).where(eq(authBootstrap.id, 1));
    if (!state || state.consumedAt) return false;
    const existing = await db.select({ id: user.id }).from(user).where(sql`lower(${user.email}) = ${adminEmail()}`).limit(1);
    return existing.length === 0;
  } catch { return false; }
}

// Independent transaction: bad keys, hash failures and rolled-back provisioning still spend a slot.
async function reserveAttempt() {
  return db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      INSERT INTO auth_bootstrap_attempt (id, window_started_at, attempts)
      VALUES (1, clock_timestamp(), 1)
      ON CONFLICT (id) DO UPDATE SET
        window_started_at = CASE WHEN auth_bootstrap_attempt.window_started_at <= clock_timestamp() - interval '15 minutes'
          THEN clock_timestamp() ELSE auth_bootstrap_attempt.window_started_at END,
        attempts = CASE WHEN auth_bootstrap_attempt.window_started_at <= clock_timestamp() - interval '15 minutes'
          THEN 1 ELSE auth_bootstrap_attempt.attempts + 1 END
      WHERE auth_bootstrap_attempt.attempts < 5
        OR auth_bootstrap_attempt.window_started_at <= clock_timestamp() - interval '15 minutes'
      RETURNING id`);
    return result.rows.length === 1;
  });
}

export async function bootstrapAdmin(input: unknown): Promise<boolean> {
  try {
    const key = process.env.ADMIN_BOOTSTRAP_KEY;
    if (!bootstrapKeyConfigured(key)) return false;
    if (!await reserveAttempt()) return false;
    if (!validBootstrapInput(input) || !bootstrapKeyMatches(input.key, key)) return false;
    const email = adminEmail();
    return await db.transaction(async (tx) => {
      const [state] = await tx.select().from(authBootstrap).where(eq(authBootstrap.id, 1)).for("update");
      if (!state || state.consumedAt) return false;
      const existing = await tx.select({ id: user.id }).from(user).where(sql`lower(${user.email}) = ${email}`).limit(1);
      if (existing.length) return false;
      const password = await hashPassword(input.password);
      const id = randomUUID();
      await tx.insert(user).values({ id, name: "Administrador", email, emailVerified: true });
      await tx.insert(account).values({ id: randomUUID(), accountId: id, userId: id, providerId: "credential", password });
      await tx.update(authBootstrap).set({ consumedAt: sql`clock_timestamp()` }).where(eq(authBootstrap.id, 1));
      return true;
    });
  } catch {
    // Never expose driver errors, inputs, hashes or account existence.
    return false;
  }
}
