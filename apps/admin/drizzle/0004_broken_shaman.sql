ALTER TABLE "campaigns" ADD COLUMN "organizer" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "contact" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "notes" text DEFAULT '' NOT NULL;
--> statement-breakpoint
-- Carry over only the latest contact, never silently replace the campaign price.
UPDATE "campaigns" AS c
SET "organizer" = latest.organization,
    "contact" = concat_ws(' · ', NULLIF(latest.contact_email, ''), NULLIF(latest.contact_phone, ''))
FROM (
  SELECT DISTINCT ON (campaign_id) campaign_id, organization, contact_email, contact_phone
  FROM campaign_contracts ORDER BY campaign_id, version DESC
) AS latest
WHERE c.id = latest.campaign_id;