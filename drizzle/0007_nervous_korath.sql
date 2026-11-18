CREATE TABLE "campaign_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"editor_revision" integer NOT NULL,
	"config" jsonb NOT NULL,
	"approved_by" text NOT NULL,
	"channel" text NOT NULL,
	"approved_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_package_positive" CHECK ("campaign_packages"."version" > 0 AND "campaign_packages"."editor_revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "campaign_packages" ADD CONSTRAINT "campaign_packages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_package_version_unique" ON "campaign_packages" USING btree ("campaign_id","version");