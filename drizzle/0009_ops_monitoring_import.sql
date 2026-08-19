ALTER TABLE "portfolio_score_readings" ADD COLUMN IF NOT EXISTS "agent" text NOT NULL DEFAULT 'ref';
--> statement-breakpoint
ALTER TABLE "portfolio_score_readings" ADD COLUMN IF NOT EXISTS "ops_commit_sha" text;
--> statement-breakpoint
ALTER TABLE "portfolio_score_readings" ADD COLUMN IF NOT EXISTS "run_id" text;
--> statement-breakpoint
ALTER TABLE "portfolio_score_readings" ADD COLUMN IF NOT EXISTS "report_data" jsonb;
--> statement-breakpoint
ALTER TABLE "portfolio_score_alerts" ADD COLUMN IF NOT EXISTS "ops_alert_key" text;
--> statement-breakpoint
ALTER TABLE "portfolio_score_alerts" ADD COLUMN IF NOT EXISTS "recommendation" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_score_alerts_ops_key_idx" ON "portfolio_score_alerts" USING btree ("ops_alert_key");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "monitoring_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"agent" text NOT NULL,
	"status" text NOT NULL,
	"started_at" text NOT NULL,
	"completed_at" text,
	"ops_commit_sha" text,
	"imported_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	"error_message" text,
	CONSTRAINT "monitoring_runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "uptime_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_key" text NOT NULL,
	"url" text NOT NULL,
	"captured_day" text NOT NULL,
	"status" text NOT NULL,
	"http_status" integer,
	"response_time_ms" integer,
	"agent" text NOT NULL DEFAULT 'pulse',
	"ops_commit_sha" text,
	"run_id" text,
	"error_message" text,
	"captured_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uptime_readings_project_day_idx" ON "uptime_readings" USING btree ("project_key","captured_day");
