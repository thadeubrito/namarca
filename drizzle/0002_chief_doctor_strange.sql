CREATE TABLE "campaign_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_asset_kind" CHECK ("campaign_assets"."kind" IN ('artwork', 'sticker')),
	CONSTRAINT "campaign_asset_dimensions" CHECK ("campaign_assets"."width" > 0 AND "campaign_assets"."height" > 0)
);
--> statement-breakpoint
CREATE TABLE "campaign_editor" (
	"campaign_id" uuid PRIMARY KEY NOT NULL,
	"config" jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_assets" ADD CONSTRAINT "campaign_assets_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_editor" ADD CONSTRAINT "campaign_editor_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_asset_campaign_idx" ON "campaign_assets" USING btree ("campaign_id");