ALTER TABLE "campaign_publication_history" ADD COLUMN "version" integer;--> statement-breakpoint
ALTER TABLE "campaign_publications" ADD COLUMN "version" integer;--> statement-breakpoint
WITH numbered AS (
  SELECT "id", row_number() OVER (PARTITION BY "campaign_id" ORDER BY "delivered_at", "authorized_at", "id")::integer AS "version"
  FROM "campaign_publication_history"
)
UPDATE "campaign_publication_history" AS history SET "version" = numbered."version"
FROM numbered WHERE history."id" = numbered."id";--> statement-breakpoint
UPDATE "campaign_publications" AS current SET "version" = (
  SELECT count(*)::integer + 1 FROM "campaign_publication_history" AS history
  WHERE history."campaign_id" = current."campaign_id"
);--> statement-breakpoint
ALTER TABLE "campaign_publication_history" ALTER COLUMN "version" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_publications" ALTER COLUMN "version" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "publication_history_version_unique" ON "campaign_publication_history" USING btree ("campaign_id","version");--> statement-breakpoint
ALTER TABLE "campaign_publication_history" ADD CONSTRAINT "publication_history_version_positive" CHECK ("campaign_publication_history"."version" > 0);--> statement-breakpoint
ALTER TABLE "campaign_publications" ADD CONSTRAINT "publication_version_positive" CHECK ("campaign_publications"."version" > 0);