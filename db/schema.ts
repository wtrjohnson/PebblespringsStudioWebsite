import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, serial, text, uniqueIndex } from "drizzle-orm/pg-core";

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
  siteUrl: text("site_url").notNull().default(""),
  projectStart: text("project_start"),
  contractAmount: integer("contract_amount").notNull().default(0),
  contractType: text("contract_type").notNull().default("No Subscription"),
  paymentStatus: text("payment_status", { enum: ["pending", "partial", "complete"] })
    .notNull()
    .default("pending"),
  currentPhase: text("current_phase").notNull(),
  nextUp: text("next_up").notNull().default(""),
  status: text("status", { enum: ["active", "completed", "archived"] })
    .notNull()
    .default("active"),
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
  visibility: text("visibility", { enum: ["draft", "published"] }).notNull().default("draft"),
  deletedAt: text("deleted_at"),
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
  visibility: text("visibility", { enum: ["draft", "published"] }).notNull().default("draft"),
  deletedAt: text("deleted_at"),
  respondedAt: text("responded_at"),
  responseNote: text("response_note"),
  responseReply: text("response_reply"),
  repliedAt: text("replied_at"),
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

export const studioAdmins = pgTable("studio_admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  status: text("status", { enum: ["active", "disabled"] }).notNull().default("active"),
  lastLoginAt: text("last_login_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});

export const studioAdminSessions = pgTable("studio_admin_sessions", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => studioAdmins.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  revokedAt: text("revoked_at"),
  lastSeenAt: text("last_seen_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});

export const studioAdminLoginAttempts = pgTable("studio_admin_login_attempts", {
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
  reportData: jsonb("report_data"),
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

export const portfolioScoreReadings = pgTable("portfolio_score_readings", {
  id: serial("id").primaryKey(),
  projectKey: text("project_key").notNull(),
  url: text("url").notNull(),
  capturedDay: text("captured_day").notNull(),
  status: text("status", { enum: ["scored", "failed"] }).notNull(),
  speedScore: integer("speed_score"),
  reachScore: integer("reach_score"),
  reliabilityScore: integer("reliability_score"),
  visibilityScore: integer("visibility_score"),
  source: text("source").notNull().default("pagespeed"),
  agent: text("agent").notNull().default("ref"),
  opsCommitSha: text("ops_commit_sha"),
  runId: text("run_id"),
  reportData: jsonb("report_data"),
  errorMessage: text("error_message"),
  capturedAt: text("captured_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
}, (table) => ({
  projectDayUnique: uniqueIndex("portfolio_score_readings_project_day_idx").on(table.projectKey, table.capturedDay),
}));

export const portfolioScoreAlerts = pgTable("portfolio_score_alerts", {
  id: serial("id").primaryKey(),
  projectKey: text("project_key").notNull(),
  url: text("url").notNull(),
  metric: text("metric", { enum: ["speed", "reach", "reliability", "visibility"] }).notNull(),
  firstReadingId: integer("first_reading_id").notNull().references(() => portfolioScoreReadings.id),
  secondReadingId: integer("second_reading_id").notNull().references(() => portfolioScoreReadings.id),
  firstValue: integer("first_value").notNull(),
  secondValue: integer("second_value").notNull(),
  opsAlertKey: text("ops_alert_key"),
  recommendation: text("recommendation"),
  status: text("status", { enum: ["open", "acknowledged", "resolved"] }).notNull().default("open"),
  acknowledgedAt: text("acknowledged_at"),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
}, (table) => ({
  projectMetricStatusIdx: index("portfolio_score_alerts_project_metric_status_idx").on(table.projectKey, table.metric, table.status),
  triggerUnique: uniqueIndex("portfolio_score_alerts_trigger_unique_idx").on(table.projectKey, table.metric, table.secondReadingId),
}));

export const monitoringRuns = pgTable("monitoring_runs", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  agent: text("agent", { enum: ["ref", "pulse"] }).notNull(),
  status: text("status", { enum: ["succeeded", "failed", "partial"] }).notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  opsCommitSha: text("ops_commit_sha"),
  importedAt: text("imported_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
  errorMessage: text("error_message"),
});

export const uptimeReadings = pgTable("uptime_readings", {
  id: serial("id").primaryKey(),
  projectKey: text("project_key").notNull(),
  url: text("url").notNull(),
  capturedDay: text("captured_day").notNull(),
  status: text("status", { enum: ["up", "down", "failed"] }).notNull(),
  httpStatus: integer("http_status"),
  responseTimeMs: integer("response_time_ms"),
  agent: text("agent").notNull().default("pulse"),
  opsCommitSha: text("ops_commit_sha"),
  runId: text("run_id"),
  errorMessage: text("error_message"),
  capturedAt: text("captured_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
}, (table) => ({
  projectDayUnique: uniqueIndex("uptime_readings_project_day_idx").on(table.projectKey, table.capturedDay),
}));

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

export const websiteTestReports = pgTable("website_test_reports", {
  id: serial("id").primaryKey(),
  websiteTestId: integer("website_test_id")
    .notNull()
    .references(() => websiteTests.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  sentAt: text("sent_at"),
  revokedAt: text("revoked_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});
