import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import {
  monitoringRuns,
  portfolioScoreAlerts,
  portfolioScoreReadings,
  portfolioScores,
  uptimeReadings,
} from "./schema";

type CsvRow = Record<string, string>;

const SCORE_KEYS = ["speed", "reach", "reliability", "visibility"] as const;
type ScoreKey = (typeof SCORE_KEYS)[number];

function parseCsv(input: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];
    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = (rows.shift() ?? []).map((header) => header.trim());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])));
}

function value(row: CsvRow, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== "") return row[key];
  }
  return "";
}

function integer(row: CsvRow, ...keys: string[]) {
  const parsed = Number(value(row, ...keys));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function required(row: CsvRow, ...keys: string[]) {
  const result = value(row, ...keys);
  if (!result) throw new Error(`Ops CSV is missing ${keys[0]}.`);
  return result;
}

const PROJECT_KEYS_BY_HOST: Record<string, string> = {
  "slipstreamadvocacy.com": "slipstream-advocacy",
  "albertrozin.com": "albert-rozin",
  "rjohnsonpiano.com": "r-johnson-piano",
  "clearpolicystrategies.com": "clear-policy-strategies",
};

function canonicalUrl(input: string) {
  const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const url = new URL(candidate);
  url.hash = "";
  url.pathname = url.pathname === "/" ? "" : url.pathname;
  return url.toString().replace(/\/$/, "");
}

function projectKeyFor(input: string, client = "") {
  try {
    const hostname = new URL(canonicalUrl(input)).hostname.replace(/^www\./, "");
    return PROJECT_KEYS_BY_HOST[hostname] ?? hostname;
  } catch {
    return client.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
}

function getRepoConfig() {
  const repo = process.env.PEBBLESPRINGS_OPS_REPO;
  if (!repo) throw new Error("PEBBLESPRINGS_OPS_REPO is not configured.");
  return {
    repo,
    branch: process.env.PEBBLESPRINGS_OPS_BRANCH ?? "main",
    token: process.env.PEBBLESPRINGS_OPS_GITHUB_TOKEN,
  };
}

async function fetchOpsFile(path: string, ref: string, optional = false) {
  const { repo, token } = getRepoConfig();
  const response = await fetch(`https://raw.githubusercontent.com/${repo}/${encodeURIComponent(ref)}/${path}`, {
    headers: {
      accept: "text/csv",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (optional && response.status === 404) return "";
  if (!response.ok) throw new Error(`Unable to read ${path} from pebblesprings-ops (${response.status}).`);
  return response.text();
}

export async function syncOpsMonitoring(options: { ref?: string } = {}) {
  const config = getRepoConfig();
  const ref = options.ref ?? config.branch;
  const commitSha = options.ref ?? null;
  const runRows = parseCsv(await fetchOpsFile("monitoring/runs.csv", ref, true));
  const lighthouseRows = parseCsv(await fetchOpsFile("monitoring/lighthouse_scores.csv", ref));
  const alertRows = parseCsv(await fetchOpsFile("monitoring/lighthouse_alerts.csv", ref, true));
  const uptimeCsv = await fetchOpsFile("monitoring/uptime_checks.csv", ref, true);
  const uptimeRows = parseCsv(uptimeCsv || await fetchOpsFile("monitoring/uptime-log.csv", ref, true));
  const db = await getDb();
  const importedAt = new Date().toISOString();
  const resolvedCommitSha = commitSha ?? (value(runRows[0] ?? {}, "commit_sha", "ops_commit_sha") || null);

  if (resolvedCommitSha) {
    const [alreadyImported] = await db.select({ id: monitoringRuns.id }).from(monitoringRuns).where(eq(monitoringRuns.opsCommitSha, resolvedCommitSha)).limit(1);
    if (alreadyImported) return { imported: false, commitSha: resolvedCommitSha, reason: "already imported" };
  }

  for (const row of runRows) {
    const runId = required(row, "run_id", "id");
    const agent = value(row, "agent") === "pulse" ? "pulse" : "ref";
    const status = value(row, "status") === "failed" ? "failed" : value(row, "status") === "partial" ? "partial" : "succeeded";
    await db.insert(monitoringRuns).values({
      runId,
      agent,
      status,
      startedAt: required(row, "started_at", "startedAt"),
      completedAt: value(row, "completed_at", "completedAt") || null,
      opsCommitSha: resolvedCommitSha,
      importedAt,
      errorMessage: value(row, "error_message", "errorMessage") || null,
    }).onConflictDoNothing({ target: monitoringRuns.runId });
  }

  const normalizedLighthouseRows = new Map<string, CsvRow>();
  for (const row of lighthouseRows) {
    const site = value(row, "url", "site");
    const client = value(row, "client");
    if (!site) continue;
    const capturedDay = required(row, "captured_day", "capturedDay", "date");
    normalizedLighthouseRows.set(`${projectKeyFor(site, client)}:${capturedDay}`, row);
  }

  const insertedReadings: Array<typeof portfolioScoreReadings.$inferSelect> = [];
  for (const row of normalizedLighthouseRows.values()) {
    const site = required(row, "url", "site");
    const client = value(row, "client");
    const projectKey = value(row, "project_key", "projectKey") || projectKeyFor(site, client);
    const url = canonicalUrl(site);
    const capturedDay = required(row, "captured_day", "capturedDay", "date");
    const capturedAt = value(row, "captured_at", "capturedAt", "last_checked") || `${capturedDay}T12:00:00.000Z`;
    const status = value(row, "status") === "failed" ? "failed" : "scored";
    const scores = {
      speed: integer(row, "speed_score", "speedScore", "performance"),
      reach: integer(row, "reach_score", "reachScore", "accessibility"),
      reliability: integer(row, "reliability_score", "reliabilityScore", "best_practices"),
      visibility: integer(row, "visibility_score", "visibilityScore", "seo"),
    };
    const reportData = JSON.stringify({
      client,
      page: value(row, "page"),
      changeFromLast: value(row, "change_from_last"),
      suggestedFix: value(row, "suggested_fix"),
      notes: value(row, "notes"),
    });
    const [reading] = await db.insert(portfolioScoreReadings).values({
      projectKey,
      url,
      capturedDay,
      status,
      speedScore: scores.speed,
      reachScore: scores.reach,
      reliabilityScore: scores.reliability,
      visibilityScore: scores.visibility,
      source: value(row, "source") || "lighthouse",
      agent: "ref",
      opsCommitSha: resolvedCommitSha,
      runId: value(row, "run_id", "runId") || `ref:${capturedDay}`,
      reportData: reportData ? JSON.parse(reportData) : null,
      errorMessage: value(row, "error_message", "errorMessage") || null,
      capturedAt,
    }).onConflictDoNothing({ target: [portfolioScoreReadings.projectKey, portfolioScoreReadings.capturedDay] }).returning();

    if (reading) insertedReadings.push(reading);
    const existing = await db.select().from(portfolioScoreReadings).where(and(eq(portfolioScoreReadings.projectKey, projectKey), eq(portfolioScoreReadings.capturedDay, capturedDay))).limit(1);
    const current = existing[0] ?? reading;
    if (current?.status === "scored" && scores.speed !== null) {
      const [latest] = await db.select().from(portfolioScoreReadings).where(and(eq(portfolioScoreReadings.projectKey, projectKey), eq(portfolioScoreReadings.status, "scored"))).orderBy(desc(portfolioScoreReadings.capturedAt)).limit(1);
      if (latest?.id === current.id) {
        await db.insert(portfolioScores).values({ url, speedScore: scores.speed ?? 0, reachScore: scores.reach ?? 0, reliabilityScore: scores.reliability ?? 0, visibilityScore: scores.visibility ?? 0, updatedAt: capturedAt }).onConflictDoUpdate({ target: portfolioScores.url, set: { speedScore: scores.speed ?? 0, reachScore: scores.reach ?? 0, reliabilityScore: scores.reliability ?? 0, visibilityScore: scores.visibility ?? 0, updatedAt: capturedAt } });
      }
    }
  }

  for (const row of alertRows) {
    const alertKey = value(row, "alert_key", "ops_alert_key", "id") || `${required(row, "project_key", "projectKey")}:${required(row, "metric")}:${required(row, "captured_day", "capturedDay")}`;
    const projectKey = required(row, "project_key", "projectKey");
    const metric = value(row, "metric") as ScoreKey;
    if (!SCORE_KEYS.includes(metric)) continue;
    const readings = await db.select().from(portfolioScoreReadings).where(eq(portfolioScoreReadings.projectKey, projectKey)).orderBy(desc(portfolioScoreReadings.capturedAt)).limit(20);
    const first = readings.find((reading) => reading.capturedDay === value(row, "first_day", "first_captured_day"));
    const second = readings.find((reading) => reading.capturedDay === value(row, "second_day", "second_captured_day", "captured_day"));
    if (!first || !second) continue;
    await db.insert(portfolioScoreAlerts).values({
      projectKey,
      url: required(row, "url"),
      metric,
      firstReadingId: first.id,
      secondReadingId: second.id,
      firstValue: integer(row, "first_value", "firstValue") ?? 0,
      secondValue: integer(row, "second_value", "secondValue") ?? 0,
      opsAlertKey: alertKey,
      recommendation: value(row, "recommendation", "action") || null,
      status: value(row, "status") === "acknowledged" ? "acknowledged" : value(row, "status") === "resolved" ? "resolved" : "open",
      acknowledgedAt: value(row, "acknowledged_at") || null,
      resolvedAt: value(row, "resolved_at") || null,
      createdAt: value(row, "created_at") || importedAt,
    }).onConflictDoNothing({ target: portfolioScoreAlerts.opsAlertKey });
  }

  for (const row of uptimeRows) {
    const site = required(row, "url", "site");
    const client = value(row, "client");
    const checkedAt = required(row, "captured_at", "capturedAt", "last_checked");
    const httpStatus = integer(row, "http_status", "httpStatus", "status_code");
    await db.insert(uptimeReadings).values({
      projectKey: value(row, "project_key", "projectKey") || projectKeyFor(site, client),
      url: canonicalUrl(site),
      capturedDay: checkedAt.slice(0, 10),
      status: httpStatus === 200 ? "up" : httpStatus === null ? "failed" : "down",
      httpStatus,
      responseTimeMs: integer(row, "response_time_ms", "responseTimeMs"),
      agent: "pulse",
      opsCommitSha: resolvedCommitSha,
      runId: value(row, "run_id", "runId") || `pulse:${checkedAt.slice(0, 10)}`,
      errorMessage: value(row, "error_message", "errorMessage", "notes") || null,
      capturedAt: checkedAt,
    }).onConflictDoNothing({ target: [uptimeReadings.projectKey, uptimeReadings.capturedDay] });
  }

  if (runRows.length === 0 && normalizedLighthouseRows.size > 0) {
    const latestDay = [...normalizedLighthouseRows.values()]
      .map((row) => value(row, "captured_day", "capturedDay", "date"))
      .sort()
      .at(-1);
    if (latestDay) {
      await db.insert(monitoringRuns).values({
        runId: `ref:${latestDay}`,
        agent: "ref",
        status: "succeeded",
        startedAt: `${latestDay}T00:00:00.000Z`,
        completedAt: `${latestDay}T23:59:59.000Z`,
        opsCommitSha: resolvedCommitSha,
        importedAt,
      }).onConflictDoNothing({ target: monitoringRuns.runId });
    }
  }

  if (runRows.length === 0 && uptimeRows.length > 0) {
    const latestCheckedAt = uptimeRows
      .map((row) => value(row, "captured_at", "capturedAt", "last_checked"))
      .sort()
      .at(-1);
    if (latestCheckedAt) {
      await db.insert(monitoringRuns).values({
        runId: `pulse:${latestCheckedAt.slice(0, 10)}`,
        agent: "pulse",
        status: "succeeded",
        startedAt: latestCheckedAt,
        completedAt: latestCheckedAt,
        opsCommitSha: resolvedCommitSha,
        importedAt,
      }).onConflictDoNothing({ target: monitoringRuns.runId });
    }
  }

  if (resolvedCommitSha) {
    await db.insert(monitoringRuns).values({ runId: `ops-import:${resolvedCommitSha}`, agent: "ref", status: "succeeded", startedAt: importedAt, completedAt: importedAt, opsCommitSha: resolvedCommitSha, importedAt }).onConflictDoNothing({ target: monitoringRuns.runId });
  }
  return { imported: true, commitSha: resolvedCommitSha, readingCount: insertedReadings.length };
}

export function verifyOpsSignature(body: string, signature: string | null) {
  const secret = process.env.REF_SYNC_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const provided = signature.replace(/^sha256=/, "");
  return provided.length === expected.length && timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export async function getMonitoringFreshness() {
  const db = await getDb();
  const [ref, pulse, imported] = await Promise.all([
    db.select().from(monitoringRuns).where(eq(monitoringRuns.agent, "ref")).orderBy(desc(monitoringRuns.completedAt)).limit(1),
    db.select().from(monitoringRuns).where(eq(monitoringRuns.agent, "pulse")).orderBy(desc(monitoringRuns.completedAt)).limit(1),
    db.select().from(monitoringRuns).orderBy(desc(monitoringRuns.importedAt)).limit(1),
  ]);
  return { ref: ref[0] ?? null, pulse: pulse[0] ?? null, imported: imported[0] ?? null };
}
