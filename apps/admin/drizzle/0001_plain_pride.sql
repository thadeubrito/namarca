ALTER TYPE "public"."payment_status" ADD VALUE 'refunded';--> statement-breakpoint
ALTER TABLE "webhook_receipts" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_receipts" ADD COLUMN "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL;