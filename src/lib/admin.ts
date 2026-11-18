import "server-only";
import { headers } from "next/headers";
import { auth, adminEmail } from "@/lib/auth";

/** Password-authenticated allowlisted user; enrollment ONLY, never domain operations. */
export async function getEnrollmentSession(requestHeaders?: Headers) {
  const session = await auth.api.getSession({
    headers: requestHeaders ?? await headers(),
    query: { disableCookieCache: true },
  });
  if (!session || session.user.email.toLowerCase() !== adminEmail()) return null;
  return session;
}
/** Fully authorized administrator, or null. Always reads authoritative database state. */
export async function getAdminSession(requestHeaders?: Headers) {
  const session = await getEnrollmentSession(requestHeaders);
  if (!session?.user.twoFactorEnabled || session.session.twoFactorVerified !== true) return null;
  return session;
}
export class AdminAuthorizationError extends Error {
  readonly status = 403;
  constructor() { super("Administrator authentication and TOTP verification required"); }
}
/** Use at the start of EVERY privileged server action/route, not merely in layouts. */
export async function requireAdmin(requestHeaders?: Headers) {
  const session = await getAdminSession(requestHeaders);
  if (!session) throw new AdminAuthorizationError();
  return session;
}
export async function requireEnrollmentSession(requestHeaders?: Headers) {
  const session = await getEnrollmentSession(requestHeaders);
  if (!session) throw new AdminAuthorizationError();
  return session;
}
