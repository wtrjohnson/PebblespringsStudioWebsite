CREATE TABLE IF NOT EXISTS "portfolio_score_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_key" text NOT NULL,
	"url" text NOT NULL,
	"captured_day" text NOT NULL,
	"status" text NOT NULL,
	"speed_score" integer,
	"reach_score" integer,
	"reliability_score" integer,
	"visibility_score" integer,
	"source" text DEFAULT 'pagespeed' NOT NULL,
	"error_message" text,
	"captured_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_score_readings_project_day_idx" ON "portfolio_score_readings" USING btree ("project_key","captured_day");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_score_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_key" text NOT NULL,
	"url" text NOT NULL,
	"metric" text NOT NULL,
	"first_reading_id" integer NOT NULL,
	"second_reading_id" integer NOT NULL,
	"first_value" integer NOT NULL,
	"second_value" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"acknowledged_at" text,
	"resolved_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolio_score_alerts" ADD CONSTRAINT "portfolio_score_alerts_first_reading_id_portfolio_score_readings_id_fk" FOREIGN KEY ("first_reading_id") REFERENCES "portfolio_score_readings"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "portfolio_score_alerts" ADD CONSTRAINT "portfolio_score_alerts_second_reading_id_portfolio_score_readings_id_fk" FOREIGN KEY ("second_reading_id") REFERENCES "portfolio_score_readings"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_score_alerts_project_metric_status_idx" ON "portfolio_score_alerts" USING btree ("project_key","metric","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_score_alerts_trigger_unique_idx" ON "portfolio_score_alerts" USING btree ("project_key","metric","second_reading_id");
