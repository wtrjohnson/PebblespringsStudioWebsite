CREATE TABLE "contact_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"project" text DEFAULT '' NOT NULL,
	"message" text NOT NULL,
	"budget" text DEFAULT '' NOT NULL,
	"timeline" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" text NOT NULL,
	"phase" text NOT NULL,
	"note" text NOT NULL,
	"preview_label" text DEFAULT 'Preview' NOT NULL,
	"preview_href" text DEFAULT '/portal' NOT NULL,
	"requested_by" text NOT NULL,
	"helpful_by" text NOT NULL,
	"status" text DEFAULT 'needs_review' NOT NULL,
	"responded_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"client_name" text NOT NULL,
	"project_name" text NOT NULL,
	"current_phase" text NOT NULL,
	"next_up" text DEFAULT '' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	CONSTRAINT "portal_projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "portal_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"phase" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"action_label" text,
	"action_href" text,
	"published_at" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portal_approvals" ADD CONSTRAINT "portal_approvals_project_id_portal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."portal_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_updates" ADD CONSTRAINT "portal_updates_project_id_portal_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."portal_projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "portal_projects" ("slug", "client_name", "project_name", "current_phase", "next_up", "created_at", "updated_at") VALUES
	('furrow-strategies', 'Furrow Strategies', 'Furrow Strategies', 'Design', 'After homepage approval, I''ll design the services page and start preparing the preview.', '2026-07-22 00:00:00', '2026-07-31 00:00:00');
--> statement-breakpoint
INSERT INTO "portal_approvals" ("project_id", "title", "phase", "note", "preview_label", "preview_href", "requested_by", "helpful_by", "status", "created_at") VALUES
	((SELECT "id" FROM "portal_projects" WHERE "slug" = 'furrow-strategies'), 'Homepage design', 'Design', 'I''d love your eye on the overall direction: headline tone, page flow, and whether this feels like Furrow.', 'Homepage preview', '/portal', '2026-07-31', '2026-08-02', 'needs_review', '2026-07-31 00:00:00');
--> statement-breakpoint
INSERT INTO "portal_updates" ("project_id", "phase", "title", "body", "action_label", "action_href", "published_at", "created_at") VALUES
	((SELECT "id" FROM "portal_projects" WHERE "slug" = 'furrow-strategies'), 'Design', 'Homepage design is ready', 'I finished the first pass of the homepage and tightened the opening message around your core services. The main thing I''d love your eye on is whether the tone feels like you.', 'Review homepage design', '/portal/approvals', '2026-07-31', '2026-07-31 00:00:00'),
	((SELECT "id" FROM "portal_projects" WHERE "slug" = 'furrow-strategies'), 'Design', 'The first direction is coming together', 'I pulled the visual references into a calmer design direction: direct headlines, confident spacing, and a little more editorial rhythm than the current site. The goal is to make Furrow feel sharp without making it feel cold.', NULL, NULL, '2026-07-29', '2026-07-29 00:00:00'),
	((SELECT "id" FROM "portal_projects" WHERE "slug" = 'furrow-strategies'), 'Discovery', 'Direction is set', 'Thanks for sending the examples and notes. The strongest thread is clarity: fewer claims, stronger hierarchy, and more confidence in the core offer. I''ll use that as the foundation for the first homepage pass.', NULL, NULL, '2026-07-26', '2026-07-26 00:00:00'),
	((SELECT "id" FROM "portal_projects" WHERE "slug" = 'furrow-strategies'), 'Discovery', 'Kickoff notes are in place', 'I organized the kickoff notes and marked the biggest decisions: the site should feel more established, the services need to be easier to scan, and the homepage should lead with the problem Furrow helps clients solve.', 'View kickoff notes', '/portal', '2026-07-22', '2026-07-22 00:00:00');
