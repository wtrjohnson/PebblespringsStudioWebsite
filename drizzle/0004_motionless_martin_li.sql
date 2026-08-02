CREATE TABLE "portfolio_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"speed_score" integer NOT NULL,
	"reach_score" integer NOT NULL,
	"reliability_score" integer NOT NULL,
	"visibility_score" integer NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	CONSTRAINT "portfolio_scores_url_unique" UNIQUE("url")
);
