ALTER TABLE "website_tests" ADD COLUMN IF NOT EXISTS "request_token_hash" text;
--> statement-breakpoint
ALTER TABLE "website_tests" ADD COLUMN IF NOT EXISTS "request_token_used_at" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "website_tests_request_token_hash_unique" ON "website_tests" USING btree ("request_token_hash");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "security_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"window_started_at" text NOT NULL,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "security_rate_limits_expires_at_idx" ON "security_rate_limits" USING btree ("expires_at");
