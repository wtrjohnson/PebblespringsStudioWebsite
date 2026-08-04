CREATE TABLE "studio_admin_login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_admin_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" text NOT NULL,
	"revoked_at" text,
	"last_seen_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	CONSTRAINT "studio_admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "studio_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"password_salt" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_login_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	CONSTRAINT "studio_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "portal_approvals" ADD COLUMN "visibility" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_approvals" ADD COLUMN "deleted_at" text;--> statement-breakpoint
ALTER TABLE "portal_approvals" ADD COLUMN "response_note" text;--> statement-breakpoint
ALTER TABLE "portal_approvals" ADD COLUMN "response_reply" text;--> statement-breakpoint
ALTER TABLE "portal_approvals" ADD COLUMN "replied_at" text;--> statement-breakpoint
ALTER TABLE "portal_projects" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_updates" ADD COLUMN "visibility" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_updates" ADD COLUMN "deleted_at" text;--> statement-breakpoint
ALTER TABLE "studio_admin_sessions" ADD CONSTRAINT "studio_admin_sessions_admin_id_studio_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."studio_admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Backfill: rows that existed before drafts were introduced were already live to
-- clients. The new columns default to 'draft', so without this they would silently
-- disappear from the portal the moment this migration runs.
UPDATE "portal_updates" SET "visibility" = 'published';--> statement-breakpoint
UPDATE "portal_approvals" SET "visibility" = 'published';