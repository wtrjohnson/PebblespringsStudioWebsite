CREATE TABLE "website_test_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"website_test_id" integer NOT NULL,
	"email" text NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"request_type" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"submitted_url" text NOT NULL,
	"normalized_url" text NOT NULL,
	"hostname" text NOT NULL,
	"source" text DEFAULT 'demo' NOT NULL,
	"speed_score" integer,
	"reach_score" integer,
	"reliability_score" integer,
	"visibility_score" integer,
	"lowest_score_key" text,
	"lowest_score_value" integer,
	"referrer" text,
	"status" text DEFAULT 'scored' NOT NULL,
	"error_message" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "website_test_requests" ADD CONSTRAINT "website_test_requests_website_test_id_website_tests_id_fk" FOREIGN KEY ("website_test_id") REFERENCES "public"."website_tests"("id") ON DELETE cascade ON UPDATE no action;