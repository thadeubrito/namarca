CREATE TABLE "campaign_publication_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"config" jsonb NOT NULL,
	"editor_revision" integer NOT NULL,
	"published_by" text NOT NULL,
	"delivered_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_publication_history" ADD CONSTRAINT "campaign_publication_history_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "publication_history_campaign_idx" ON "campaign_publication_history" USING btree ("campaign_id");