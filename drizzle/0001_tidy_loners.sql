ALTER TABLE "portal_updates" ADD COLUMN "status" text DEFAULT 'completed' NOT NULL;
--> statement-breakpoint
UPDATE "portal_updates"
SET "status" = 'in_progress'
WHERE "phase" = (
	SELECT "current_phase"
	FROM "portal_projects"
	WHERE "portal_projects"."id" = "portal_updates"."project_id"
);
