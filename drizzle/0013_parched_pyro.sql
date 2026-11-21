ALTER TABLE "campaign_publication_history" ADD COLUMN "authorized_at" timestamp with time zone;
--> statement-breakpoint
-- Existing rows predate authorization retention; delivery is the only known timestamp.
UPDATE "campaign_publication_history" SET "authorized_at" = "delivered_at" WHERE "authorized_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "campaign_publication_history" ALTER COLUMN "authorized_at" SET NOT NULL;
