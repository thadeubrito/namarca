CREATE TABLE "checkout_attempt_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"outcome" text NOT NULL,
	"actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_attempts" ADD COLUMN "query_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "checkout_attempts" ADD COLUMN "last_queried_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "checkout_attempts" ADD COLUMN "retry_released_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "checkout_attempts" ADD COLUMN "retry_released_by" text;--> statement-breakpoint
ALTER TABLE "checkout_attempt_events" ADD CONSTRAINT "checkout_attempt_events_attempt_id_checkout_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."checkout_attempts"("id") ON DELETE restrict ON UPDATE no action;