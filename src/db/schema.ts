import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
export * from "./auth-schema";
import type { EventConfig } from "@/editor/shared/events/events";

export const preparationStatus = pgEnum("preparation_status", ["draft", "validated", "approved"]);
export const publicationStatus = pgEnum("publication_status", ["unpublished", "pending", "published", "failed", "ended"]);
export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "expired", "cancelled", "refunded"]);
export const taskStatus = pgEnum("publication_task_status", ["awaiting_editor", "ready", "completed", "failed"]);
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  contact: text("contact").default("").notNull(),
  createdAt: createdAt(),
}, (t) => [check("client_name_nonempty", sql`length(trim(${t.name})) > 0`)]);

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  preparationStatus: preparationStatus("preparation_status").default("draft").notNull(),
  publicationStatus: publicationStatus("publication_status").default("unpublished").notNull(),
  priceCents: integer("price_cents"),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "restrict" }),
  // Legacy fields retained to preserve original data; active UI uses clientId.
  organizer: text("organizer").default("").notNull(),
  contact: text("contact").default("").notNull(),
  notes: text("notes").default("").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [check("campaign_price_positive", sql`${t.priceCents} IS NULL OR ${t.priceCents} > 0`), check("campaign_name_nonempty", sql`length(trim(${t.name})) > 0`), check("campaign_slug_valid", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`)]);

export const campaignEditor = pgTable("campaign_editor", {
  campaignId: uuid("campaign_id").primaryKey().references(() => campaigns.id, { onDelete: "cascade" }),
  config: jsonb("config").$type<EventConfig>().notNull(),
  revision: integer("revision").default(0).notNull(),
  updatedAt: updatedAt(),
});

export const campaignAssets = pgTable("campaign_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  kind: text("kind", { enum: ["artwork", "sticker"] }).notNull(),
  createdAt: createdAt(),
}, (t) => [index("campaign_asset_campaign_idx").on(t.campaignId), check("campaign_asset_kind", sql`${t.kind} IN ('artwork', 'sticker')`), check("campaign_asset_dimensions", sql`${t.width} > 0 AND ${t.height} > 0`)]);

// Legacy commercial records preserved for history; no active UI/actions. Do not use for checkout.
export const campaignContracts = pgTable("campaign_contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  organization: text("organization").notNull(),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone").notNull(),
  summary: text("summary").notNull(),
  responsibilities: text("responsibilities").notNull(),
  revisions: text("revisions").notNull(),
  cancellation: text("cancellation").notNull(),
  releaseConditions: text("release_conditions").notNull(),
  amountCents: integer("amount_cents").notNull(),
  startsOn: text("starts_on").notNull(),
  endsOn: text("ends_on").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("campaign_contract_version_unique").on(t.campaignId, t.version), check("contract_positive", sql`${t.amountCents} > 0 AND ${t.version} > 0`)]);

export const contractApprovals = pgTable("contract_approvals", {
  id: uuid("id").defaultRandom().primaryKey(),
  contractId: uuid("contract_id").notNull().unique().references(() => campaignContracts.id, { onDelete: "cascade" }),
  approvedBy: text("approved_by").notNull(),
  channel: text("channel").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }).notNull(),
  recordedBy: text("recorded_by").notNull(),
  createdAt: createdAt(),
});

export const checkoutLinks = pgTable("checkout_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "restrict" }),
  token: text("token").notNull().unique(),
  campaignName: text("campaign_name").notNull(),
  amountCents: integer("amount_cents").notNull(),
  createdAt: createdAt(),
}, (t) => [check("checkout_amount_range", sql`${t.amountCents} BETWEEN 1000 AND 600000`)]);

// Persisted before contacting the gateway. Unknown outcomes must never trigger an automatic POST retry.
export const checkoutAttempts = pgTable("checkout_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  checkoutId: uuid("checkout_id").notNull().references(() => checkoutLinks.id, { onDelete: "restrict" }),
  externalId: text("external_id").notNull().unique(),
  state: text("state", { enum: ["creating", "unknown", "registered"] }).notNull(),
  createdAt: createdAt(),
}, (t) => [index("checkout_attempt_link_idx").on(t.checkoutId), check("checkout_attempt_state", sql`${t.state} IN ('creating', 'unknown', 'registered')`)]);

// One row per payment attempt. No payer identity or raw gateway payload is stored.
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: "restrict" }),
  checkoutId: uuid("checkout_id").references(() => checkoutLinks.id, { onDelete: "restrict" }),
  externalId: text("external_id").notNull().unique(),
  paymentId: text("payment_id").notNull().unique(),
  qrCode: text("qr_code"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  amountCents: integer("amount_cents").notNull(),
  status: paymentStatus("status").default("pending").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("payment_campaign_idx").on(t.campaignId), check("payment_amount_positive", sql`${t.amountCents} > 0`)]);

export const webhookReceipts = pgTable("webhook_receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: text("event_id").notNull().unique(),
  paymentId: text("payment_id").notNull().references(() => payments.paymentId),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  // Legacy column name: marks synchronous processing, not dispatch to a worker.
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  attempts: integer("attempts").default(0).notNull(),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).defaultNow().notNull(),
});

export const publicationTasks = pgTable("publication_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
  paymentId: uuid("payment_id").notNull().references(() => payments.id),
  status: taskStatus("status").default("awaiting_editor").notNull(),
  reason: text("reason").default("Editor publication package not implemented in V1").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("publication_task_payment_unique").on(t.paymentId)]);
