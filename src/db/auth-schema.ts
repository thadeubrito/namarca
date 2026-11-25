import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// Better Auth 1.7.25 core + two-factor schema. Re-export these from db/schema.ts.
export const user = pgTable("auth_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
});
export const session = pgTable("auth_session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  // Application-owned proof; Better Auth's two-factor plugin does NOT supply this field.
  twoFactorVerified: boolean("two_factor_verified").notNull().default(false),
}, (t) => [index("auth_session_user_idx").on(t.userId)]);
export const account = pgTable("auth_account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("auth_account_user_idx").on(t.userId), uniqueIndex("auth_account_provider_unique").on(t.providerId, t.accountId)]);
export const verification = pgTable("auth_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("auth_verification_identifier_idx").on(t.identifier)]);
export const twoFactor = pgTable("auth_two_factor", {
  id: text("id").primaryKey(),
  secret: text("secret").notNull(),
  backupCodes: text("backup_codes").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  verified: boolean("verified").default(true),
  failedVerificationCount: integer("failed_verification_count").default(0),
  lockedUntil: timestamp("locked_until"),
}, (t) => [uniqueIndex("auth_two_factor_user_idx").on(t.userId), index("auth_two_factor_secret_idx").on(t.secret)]);
// One global bootstrap state, deliberately unrelated to sessions or normal login limits.
export const authBootstrap = pgTable("auth_bootstrap", {
  id: integer("id").primaryKey().default(1),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
}, (t) => [check("auth_bootstrap_singleton", sql`${t.id} = 1`)]);
export const authBootstrapAttempt = pgTable("auth_bootstrap_attempt", {
  id: integer("id").primaryKey().default(1),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull(),
}, (t) => [check("auth_bootstrap_attempt_singleton", sql`${t.id} = 1`), check("auth_bootstrap_attempt_range", sql`${t.attempts} between 1 and 5`)]);
export const authSchema = { user, session, account, verification, twoFactor };
