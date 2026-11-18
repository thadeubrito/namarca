import { randomUUID } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { account, session, twoFactor, user, verification } from "@/db/auth-schema";
import { hiddenPrompt, newPasswordHash, provisionedEmail } from "./create-admin";

async function main() {
  if (process.argv.length !== 2) throw new Error("Arguments are not accepted");
  const email = provisionedEmail();
  const confirmation = await hiddenPrompt("This revokes all sessions and requires new TOTP enrollment. Type RESET (hidden): ");
  if (confirmation !== "RESET") throw new Error("Cancelled");
  const password = await newPasswordHash();
  await db.transaction(async (tx) => {
    const [admin] = await tx.select().from(user).where(eq(user.email, email)).for("update");
    if (!admin) throw new Error("Provision the account first");
    await tx.delete(session).where(eq(session.userId, admin.id));
    await tx.delete(twoFactor).where(eq(twoFactor.userId, admin.id));
    // Challenges/trusted-device records bind to user id. Remove attempt counters too.
    await tx.delete(verification).where(eq(verification.value, admin.id));
    await tx.delete(verification).where(like(verification.identifier, "2fa-attempts-%"));
    await tx.delete(account).where(and(eq(account.userId, admin.id), eq(account.providerId, "credential")));
    await tx.insert(account).values({ id: randomUUID(), userId: admin.id, accountId: admin.id, providerId: "credential", password });
    await tx.update(user).set({ twoFactorEnabled: false, updatedAt: new Date() }).where(eq(user.id, admin.id));
  });
  console.info("Administrator recovery complete. All sessions revoked; new TOTP enrollment is required.");
}
main().then(() => process.exit(0)).catch(() => {
  console.error("Administrator recovery failed or cancelled; transaction rolled back. Check environment, account and schema.");
  process.exit(1);
});
