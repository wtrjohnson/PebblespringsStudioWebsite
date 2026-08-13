ALTER TABLE "website_tests" ADD COLUMN "report_data" jsonb;
--> statement-breakpoint
CREATE TABLE "website_test_reports" (
  "id" serial PRIMARY KEY NOT NULL,
  "website_test_id" integer NOT NULL,
  "email" text NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" text NOT NULL,
  "sent_at" text,
  "revoked_at" text,
  "created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
  CONSTRAINT "website_test_reports_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "website_test_reports" ADD CONSTRAINT "website_test_reports_website_test_id_website_tests_id_fk" FOREIGN KEY ("website_test_id") REFERENCES "website_tests"("id") ON DELETE cascade ON UPDATE no action;
