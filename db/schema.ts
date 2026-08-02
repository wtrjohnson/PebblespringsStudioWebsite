import { sql } from "drizzle-orm";
import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  email: text("email").notNull().default(""),
  project: text("project").notNull().default(""),
  message: text("message").notNull(),
  budget: text("budget").notNull().default(""),
  timeline: text("timeline").notNull().default(""),
  status: text("status", { enum: ["new", "read", "archived"] }).notNull().default("new"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});

export const portalClients = pgTable("portal_clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});

export const portalUsers = pgTable("portal_users", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => portalClients.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  role: text("role", { enum: ["admin", "approver", "viewer"] }).notNull().default("approver"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});

export const portalProjects = pgTable("portal_projects", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id")
    .notNull()
    .references(() => portalClients.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  clientName: text("client_name").notNull(),
  projectName: text("project_name").notNull(),
  currentPhase: text("current_phase").notNull(),
  nextUp: text("next_up").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});

export const portalUpdates = pgTable("portal_updates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => portalProjects.id, { onDelete: "cascade" }),
  phase: text("phase").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["in_progress", "completed"] }).notNull().default("completed"),
  actionLabel: text("action_label"),
  actionHref: text("action_href"),
  publishedAt: text("published_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});

export const portalApprovals = pgTable("portal_approvals", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => portalProjects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  phase: text("phase").notNull(),
  note: text("note").notNull(),
  previewLabel: text("preview_label").notNull().default("Preview"),
  previewHref: text("preview_href").notNull().default("/portal"),
  requestedBy: text("requested_by").notNull(),
  helpfulBy: text("helpful_by").notNull(),
  status: text("status", { enum: ["needs_review", "approved", "changes_requested"] })
    .notNull()
    .default("needs_review"),
  respondedAt: text("responded_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});

export const portalMagicLinks = pgTable("portal_magic_links", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => portalUsers.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});

export const portalSessions = pgTable("portal_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => portalUsers.id, { onDelete: "cascade" }),
  clientId: integer("client_id")
    .notNull()
    .references(() => portalClients.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  revokedAt: text("revoked_at"),
  lastSeenAt: text("last_seen_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});

export const portalLoginAttempts = pgTable("portal_login_attempts", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});

export const websiteTests = pgTable("website_tests", {
  id: serial("id").primaryKey(),
  submittedUrl: text("submitted_url").notNull(),
  normalizedUrl: text("normalized_url").notNull(),
  hostname: text("hostname").notNull(),
  source: text("source", { enum: ["pagespeed", "demo"] }).notNull().default("demo"),
  speedScore: integer("speed_score"),
  reachScore: integer("reach_score"),
  reliabilityScore: integer("reliability_score"),
  visibilityScore: integer("visibility_score"),
  lowestScoreKey: text("lowest_score_key", {
    enum: ["speed", "reach", "reliability", "visibility"],
  }),
  lowestScoreValue: integer("lowest_score_value"),
  referrer: text("referrer"),
  status: text("status", { enum: ["scored", "failed"] }).notNull().default("scored"),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});

export const portfolioScores = pgTable("portfolio_scores", {
  id: serial("id").primaryKey(),
  url: text("url").notNull().unique(),
  speedScore: integer("speed_score").notNull(),
  reachScore: integer("reach_score").notNull(),
  reliabilityScore: integer("reliability_score").notNull(),
  visibilityScore: integer("visibility_score").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});

export const websiteTestRequests = pgTable("website_test_requests", {
  id: serial("id").primaryKey(),
  websiteTestId: integer("website_test_id")
    .notNull()
    .references(() => websiteTests.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  message: text("message").notNull().default(""),
  requestType: text("request_type", { enum: ["report", "project"] }).notNull(),
  status: text("status", { enum: ["new", "read", "archived"] }).notNull().default("new"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});
