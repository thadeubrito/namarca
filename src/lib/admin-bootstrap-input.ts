import { createHash, timingSafeEqual } from "node:crypto";

export function bootstrapKeyConfigured(key: string | undefined): key is string {
  return typeof key === "string" && /^[A-Za-z0-9_-]{43,1024}$/.test(key);
}
export function bootstrapKeyMatches(candidate: string, expected: string) {
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(candidate), digest(expected));
}
export function validBootstrapInput(value: unknown): value is { key: string; password: string; passwordConfirmation: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).length === 3 && typeof v.key === "string" && v.key.length <= 1024 &&
    typeof v.password === "string" && v.password.length >= 8 && v.password.length <= 128 &&
    v.passwordConfirmation === v.password;
}
