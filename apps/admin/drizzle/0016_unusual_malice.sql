CREATE TABLE "campaign_asset_uploads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"campaign_id" uuid NOT NULL,
	"authorized_by" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"byte_length" integer NOT NULL,
	"sha256" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_upload_size" CHECK ("campaign_asset_uploads"."byte_length" > 0 AND "campaign_asset_uploads"."byte_length" <= 26214400),
	CONSTRAINT "asset_upload_hash" CHECK ("campaign_asset_uploads"."sha256" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "asset_upload_kind" CHECK ("campaign_asset_uploads"."kind" IN ('artwork', 'sticker'))
);
--> statement-breakpoint
ALTER TABLE "campaign_asset_uploads" ADD CONSTRAINT "campaign_asset_uploads_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;