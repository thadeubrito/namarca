CREATE TABLE "campaign_publications" (
	"campaign_id" uuid PRIMARY KEY NOT NULL,
	"config" jsonb NOT NULL,
	"editor_revision" integer NOT NULL,
	"published_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_publications" ADD CONSTRAINT "campaign_publications_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;