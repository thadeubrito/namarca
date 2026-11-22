// Run only against an already-migrated disposable PostgreSQL database named *_auth_test.
// npx tsx scripts/test-auth.ts (Node 24; server-only marker stubbed only in this test process)
import { registerHooks } from "node:module";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
// Next normally supplies this boundary marker. Do not weaken production imports.
const markerDirectory = mkdtempSync(join(tmpdir(), "namarca-auth-marker-"));
const marker = join(markerDirectory, "server-only.mjs");
writeFileSync(marker, "export {};\n");
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: pathToFileURL(marker).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
import { db, pool } from "../apps/admin/src/db";
import { account, session, user } from "../apps/admin/src/db/auth-schema";

function totp(uri: string) {
  const encoded = new URL(uri).searchParams.get("secret")!;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of encoded.replace(/=+$/, "").toUpperCase()) {
    const digit = alphabet.indexOf(character);
    assert.ok(digit >= 0);
    bits += digit.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}

let stage = "load modules";
async function main() {
  const { auth, adminEmail } = await import("../apps/admin/src/lib/auth");
  const { getAdminSession, getEnrollmentSession } = await import("../apps/admin/src/lib/admin");
  const database = new URL(process.env.DATABASE_URL ?? "").pathname;
  assert.match(database, /_auth_test$/, "Refusing non-disposable database: name must end in _auth_test");
  const email = adminEmail();
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  assert.equal(existing.length, 0, "Refusing to modify an existing account");
  const id = randomUUID();
  const password = randomBytes(24).toString("base64url");
  let cookies = new Map<string, string>();
  const headers = () => new Headers({ cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") });
  async function request(path: string, body: Record<string, unknown>) {
    const h = headers();
    h.set("content-type", "application/json");
    h.set("origin", new URL(process.env.BETTER_AUTH_URL!).origin);
    const response = await auth.handler(new Request(new URL(`/api/auth${path}`, process.env.BETTER_AUTH_URL), {
      method: "POST", headers: h, body: JSON.stringify(body),
    }));
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(";", 1)[0];
      const split = pair.indexOf("=");
      const key = pair.slice(0, split);
      const content = pair.slice(split + 1);
      if (!content || /max-age=0/i.test(value)) cookies.delete(key); else cookies.set(key, content);
    }
    const result = await response.json();
    return { status: response.status, result };
  }
  async function challenge() {
    cookies = new Map();
    const login = await request("/sign-in/email", { email, password });
    assert.equal(login.status, 200);
    assert.equal(login.result.twoFactorRedirect, true);
    assert.equal(await getAdminSession(headers()), null);
  }
  try {
    stage = "provision fixture";
    await db.transaction(async (tx) => {
      await tx.insert(user).values({ id, email, name: "Auth test", emailVerified: true });
      await tx.insert(account).values({ id: randomUUID(), accountId: id, providerId: "credential", userId: id, password: await hashPassword(password) });
    });
    stage = "unauthenticated guard and signup disabled";
    assert.equal(await getAdminSession(headers()), null);
    assert.ok((await request("/sign-up/email", { email: "other@example.invalid", password, name: "No signup" })).status >= 400);
    stage = "password login";
    assert.ok((await request("/sign-in/email", { email, password: "wrong-password-value" })).status >= 400);
    assert.equal((await request("/sign-in/email", { email, password, twoFactorVerified: true })).status, 200);
    assert.ok(await getEnrollmentSession(headers()));
    assert.equal(await getAdminSession(headers()), null);
    stage = "TOTP setup";
    const setup = await request("/two-factor/enable", { password, method: "totp" });
    assert.equal(setup.status, 200);
    assert.equal(setup.result.method, "totp");
    const code: string = setup.result.backupCodes[0];
    assert.equal(await getAdminSession(headers()), null);
    stage = "TOTP confirmation and session proof";
    assert.equal((await request("/two-factor/verify-totp", { code: totp(setup.result.totpURI), trustDevice: false })).status, 200);
    assert.ok(await getAdminSession(headers()));
    const enrolledCookies = new Map(cookies);
    stage = "recovery challenge and forbidden flags";
    await challenge();
    assert.equal((await request("/two-factor/verify-backup-code", { code, disableSession: true })).status, 403);
    assert.equal((await request("/two-factor/verify-backup-code", { code, trustDevice: true })).status, 403);
    // Plugin permits three two-factor requests / ten seconds. Keep production limits enabled.
    await new Promise((resolve) => setTimeout(resolve, 10_100));
    assert.equal((await request("/two-factor/verify-backup-code", { code: "invalid-code", disableSession: false })).status, 401);
    assert.equal(await getAdminSession(headers()), null);
    stage = "valid recovery and session proof";
    const recovery = await request("/two-factor/verify-backup-code", { code, disableSession: false });
    stage = `recovery HTTP status ${recovery.status}`;
    assert.equal(recovery.status, 200);
    stage = "recovery authoritative session proof";
    assert.ok(await getAdminSession(headers()));
    assert.equal((await request("/two-factor/disable", { password })).status, 403);
    await new Promise((resolve) => setTimeout(resolve, 10_100));
    stage = "recovery code reuse";
    await challenge();
    assert.equal((await request("/two-factor/verify-backup-code", { code, disableSession: false })).status, 401, "Recovery code must be single use");
    assert.equal(await getAdminSession(headers()), null);
    // Model operator revocation: old authenticated cookies cannot bypass database deletion.
    await db.delete(session).where(eq(session.userId, id));
    cookies = enrolledCookies;
    assert.equal(await getAdminSession(headers()), null);
    console.info("PASS: signup disabled; password-only restricted; TOTP enrollment; recovery single-use; forbidden flags; revoked sessions.");
  } finally {
    await db.delete(user).where(eq(user.id, id));
  }
}
main().catch((error: unknown) => {
  // Do not dump assertions/responses: they may contain secrets, codes or session cookies.
  console.error(`Auth integration test failed at: ${stage}. Investigate without logging secrets.`);
  if (stage === "load modules" && error instanceof Error) console.error(error.name);
  process.exitCode = 1;
}).finally(async () => { rmSync(markerDirectory, { recursive: true, force: true }); await pool.end(); });
