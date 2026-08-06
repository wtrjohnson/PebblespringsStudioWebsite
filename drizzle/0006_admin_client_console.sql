ALTER TABLE "portal_projects" ADD COLUMN "site_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_projects" ADD COLUMN "project_start" text;--> statement-breakpoint
ALTER TABLE "portal_projects" ADD COLUMN "contract_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_projects" ADD COLUMN "contract_type" text DEFAULT 'No Subscription' NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_projects" ADD COLUMN "payment_status" text DEFAULT 'pending' NOT NULL;