CREATE TABLE "campaign_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"organization" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text NOT NULL,
	"summary" text NOT NULL,
	"responsibilities" text NOT NULL,
	"revisions" text NOT NULL,
	"cancellation" text NOT NULL,
	"release_conditions" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"starts_on" text NOT NULL,
	"ends_on" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contract_positive" CHECK ("campaign_contracts"."amount_cents" > 0 AND "campaign_contracts"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "contract_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" uuid NOT NULL,
	"approved_by" text NOT NULL,
	"channel" text NOT NULL,
	"approved_at" timestamp with time zone NOT NULL,
	"recorded_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contract_approvals_contract_id_unique" UNIQUE("contract_id")
);
--> statement-breakpoint
ALTER TABLE "campaign_contracts" ADD CONSTRAINT "campaign_contracts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_approvals" ADD CONSTRAINT "contract_approvals_contract_id_campaign_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."campaign_contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_contract_version_unique" ON "campaign_contracts" USING btree ("campaign_id","version");