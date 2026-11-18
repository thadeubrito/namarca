CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_name_nonempty" CHECK (length(trim("clients"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "client_id" uuid;--> statement-breakpoint
-- Preserve existing organizer/contact data; share only exact name+contact matches.
INSERT INTO "clients" (name, contact)
SELECT DISTINCT CASE WHEN trim(organizer) = '' THEN 'Cliente migrado (revisar nome)' ELSE trim(organizer) END, trim(contact)
FROM campaigns WHERE trim(organizer) <> '' OR trim(contact) <> '';
--> statement-breakpoint
UPDATE campaigns AS c SET client_id = cl.id FROM clients AS cl
WHERE (trim(c.organizer) <> '' OR trim(c.contact) <> '')
AND cl.name = CASE WHEN trim(c.organizer) = '' THEN 'Cliente migrado (revisar nome)' ELSE trim(c.organizer) END
AND cl.contact = trim(c.contact);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;