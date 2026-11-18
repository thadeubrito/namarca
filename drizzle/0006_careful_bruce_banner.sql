CREATE TABLE "checkout_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkout_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"state" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_attempts_external_id_unique" UNIQUE("external_id"),
	CONSTRAINT "checkout_attempt_state" CHECK ("checkout_attempts"."state" IN ('creating', 'unknown', 'registered'))
);
--> statement-breakpoint
CREATE TABLE "checkout_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"token" text NOT NULL,
	"campaign_name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_links_token_unique" UNIQUE("token"),
	CONSTRAINT "checkout_amount_range" CHECK ("checkout_links"."amount_cents" BETWEEN 1000 AND 600000)
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "checkout_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "qr_code" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_checkout_id_checkout_links_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."checkout_links"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_links" ADD CONSTRAINT "checkout_links_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkout_attempt_link_idx" ON "checkout_attempts" USING btree ("checkout_id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_checkout_id_checkout_links_id_fk" FOREIGN KEY ("checkout_id") REFERENCES "public"."checkout_links"("id") ON DELETE restrict ON UPDATE no action;