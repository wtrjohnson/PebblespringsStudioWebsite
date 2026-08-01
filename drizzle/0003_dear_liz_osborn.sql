CREATE TABLE "portal_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_magic_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" text NOT NULL,
	"used_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	CONSTRAINT "portal_magic_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "portal_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" text NOT NULL,
	"revoked_at" text,
	"last_seen_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	CONSTRAINT "portal_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "portal_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'approver' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	CONSTRAINT "portal_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
INSERT INTO "portal_clients" ("name", "status")
VALUES ('Furrow Strategies', 'active');
--> statement-breakpoint
ALTER TABLE "portal_projects" ADD COLUMN "client_id" integer;--> statement-breakpoint
UPDATE "portal_projects"
SET "client_id" = (
	SELECT "id"
	FROM "portal_clients"
	WHERE "name" = 'Furrow Strategies'
	ORDER BY "id"
	LIMIT 1
)
WHERE "client_id" IS NULL;
--> statement-breakpoint
INSERT INTO "portal_users" ("client_id", "email", "name", "role", "status")
SELECT "id", 'will@pebblesprings.co', 'Will Johnson', 'admin', 'active'
FROM "portal_clients"
WHERE "name" = 'Furrow Strategies'
ORDER BY "id"
LIMIT 1;
--> statement-breakpoint
ALTER TABLE "portal_projects" ALTER COLUMN "client_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "portal_magic_links" ADD CONSTRAINT "portal_magic_links_user_id_portal_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."portal_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_user_id_portal_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."portal_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_client_id_portal_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."portal_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_users" ADD CONSTRAINT "portal_users_client_id_portal_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."portal_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_projects" ADD CONSTRAINT "portal_projects_client_id_portal_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."portal_clients"("id") ON DELETE cascade ON UPDATE no action;
