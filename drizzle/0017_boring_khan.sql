CREATE TABLE "auth_bootstrap" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "auth_bootstrap_singleton" CHECK ("auth_bootstrap"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "auth_bootstrap_attempt" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"attempts" integer NOT NULL,
	CONSTRAINT "auth_bootstrap_attempt_singleton" CHECK ("auth_bootstrap_attempt"."id" = 1),
	CONSTRAINT "auth_bootstrap_attempt_range" CHECK ("auth_bootstrap_attempt"."attempts" between 1 and 5)
);
--> statement-breakpoint
INSERT INTO "auth_bootstrap" ("id") VALUES (1);
