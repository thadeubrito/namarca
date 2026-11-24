import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { authSchema, session, twoFactor as twoFactorTable, user } from "@/db/auth-schema";

function required(name: "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL" | "ADMIN_EMAIL") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}
export function adminEmail() {
  const email = required("ADMIN_EMAIL").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("ADMIN_EMAIL is invalid");
  return email;
}
const secret = required("BETTER_AUTH_SECRET");
if (secret.length < 32) throw new Error("BETTER_AUTH_SECRET must have at least 32 characters");
const baseURL = new URL(required("BETTER_AUTH_URL"));
if (process.env.NODE_ENV === "production" && baseURL.protocol !== "https:") {
  throw new Error("BETTER_AUTH_URL must use HTTPS in production");
}

export const auth = betterAuth({
  appName: "NaMarca",
  baseURL: baseURL.origin,
  secret,
  trustedOrigins: process.env.NODE_ENV === "development"
    ? [...new Set([baseURL.origin, "http://localhost:3000", "http://127.0.0.1:3000"])]
    : [baseURL.origin],
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema, transaction: true }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 30,
    cookieCache: { enabled: false },
    additionalFields: {
      twoFactorVerified: { type: "boolean", defaultValue: false, required: false, input: false },
    },
  },
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  rateLimit: { enabled: true, window: 60, max: 30 },
  plugins: [twoFactor({ issuer: "NaMarca", skipVerificationOnEnable: false })],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // TOTP enrollment is mandatory; one-use recovery codes may satisfy later challenges.
      if (["/two-factor/disable", "/delete-user", "/change-email"].includes(ctx.path)) {
        throw new APIError("FORBIDDEN", { message: "Use the manual administrator recovery procedure" });
      }
      if (ctx.path.startsWith("/two-factor/") && ctx.body?.trustDevice) {
        throw new APIError("FORBIDDEN", { message: "Remembered devices are disabled" });
      }
      if (ctx.path === "/two-factor/verify-backup-code" && ctx.body?.disableSession) {
        throw new APIError("FORBIDDEN", { message: "Recovery must create an authenticated session" });
      }
      if (ctx.path === "/sign-in/email" && String(ctx.body?.email ?? "").trim().toLowerCase() !== adminEmail()) {
        throw new APIError("UNAUTHORIZED", { message: "Invalid email or password" });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      // Inspected 1.7.25: both endpoints return valid(ctx)'s {token,user} only on success.
      // Backup-code consumption uses an atomic compare-and-swap of encrypted codes;
      // concurrent attempts cannot both consume the same code. Never mark pending enrollment.
      if (!["/two-factor/verify-totp", "/two-factor/verify-backup-code"].includes(ctx.path)) return;
      const result = ctx.context.returned;
      if (!result || typeof result !== "object" || !("token" in result) || typeof result.token !== "string") return;
      const token = ctx.context.newSession?.session.token ?? result.token;
      const [proof] = await db.select({ id: session.id }).from(session)
        .innerJoin(user, eq(user.id, session.userId))
        .innerJoin(twoFactorTable, eq(twoFactorTable.userId, user.id))
        .where(and(eq(session.token, token), eq(user.email, adminEmail()), eq(user.twoFactorEnabled, true), eq(twoFactorTable.verified, true)));
      if (proof) await db.update(session).set({ twoFactorVerified: true }).where(eq(session.id, proof.id));
    }),
  },
});
export type AuthSession = typeof auth.$Infer.Session;
