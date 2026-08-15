import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { getDb } from "./index";
import { portfolioScoreAlerts, portfolioScoreReadings, portfolioScores } from "./schema";
import { carouselProjects } from "../app/portfolioData";
import { fetchPageSpeedScores, type ScoreKey } from "../app/lib/pagespeed";

export const PORTFOLIO_SCORE_KEYS: ScoreKey[] = ["speed", "reach", "reliability", "visibility"];
export const BAD_SCORE_THRESHOLD = 90;

const SCORE_COLUMNS = {
  speed: "speedScore",
  reach: "reachScore",
  reliability: "reliabilityScore",
  visibility: "visibilityScore",
} as const;

function previousDay(day: string) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export async function evaluatePortfolioScoreAlerts(
  db: Awaited<ReturnType<typeof getDb>>,
  project: { id: string; url: string },
  reading: typeof portfolioScoreReadings.$inferSelect,
) {
  if (reading.status !== "scored") return;

  const [previous] = await db
    .select()
    .from(portfolioScoreReadings)
    .where(and(
      eq(portfolioScoreReadings.projectKey, project.id),
      eq(portfolioScoreReadings.status, "scored"),
      lt(portfolioScoreReadings.capturedDay, reading.capturedDay),
    ))
    .orderBy(desc(portfolioScoreReadings.capturedDay))
    .limit(1);

  // A failed capture breaks a daily streak. Only adjacent successful days can
  // confirm an alert, so an outage never creates a false two-reading alert.
  if (!previous || previous.capturedDay !== previousDay(reading.capturedDay)) return;

  for (const metric of PORTFOLIO_SCORE_KEYS) {
    const firstValue = previous[SCORE_COLUMNS[metric]];
    const secondValue = reading[SCORE_COLUMNS[metric]];
    if (firstValue === null || secondValue === null || firstValue >= BAD_SCORE_THRESHOLD || secondValue >= BAD_SCORE_THRESHOLD) continue;

    const existing = await db
      .select({ id: portfolioScoreAlerts.id })
      .from(portfolioScoreAlerts)
      .where(and(
        eq(portfolioScoreAlerts.projectKey, project.id),
        eq(portfolioScoreAlerts.metric, metric),
        inArray(portfolioScoreAlerts.status, ["open", "acknowledged"]),
      ))
      .limit(1);

    if (existing.length > 0) continue;

    await db.insert(portfolioScoreAlerts).values({
      projectKey: project.id,
      url: project.url,
      metric,
      firstReadingId: previous.id,
      secondReadingId: reading.id,
      firstValue,
      secondValue,
      status: "open",
    }).onConflictDoNothing({ target: [portfolioScoreAlerts.projectKey, portfolioScoreAlerts.metric, portfolioScoreAlerts.secondReadingId] });
  }
}

export async function capturePortfolioProjectScore(
  project: { id: string; url: string },
  options: { databaseUrl?: string; pageSpeedApiKey?: string; now?: Date } = {},
) {
  const db = await getDb(options.databaseUrl);
  const now = options.now ?? new Date();
  const capturedAt = now.toISOString();
  const capturedDay = capturedAt.slice(0, 10);
  const [existing] = await db
    .select()
    .from(portfolioScoreReadings)
    .where(and(
      eq(portfolioScoreReadings.projectKey, project.id),
      eq(portfolioScoreReadings.capturedDay, capturedDay),
    ))
    .limit(1);

  if (existing) return existing;

  let scores: Record<ScoreKey, number> | null = null;
  let errorMessage: string | null = null;

  try {
    scores = await fetchPageSpeedScores(project.url, options.pageSpeedApiKey);
    if (!scores) errorMessage = "PageSpeed credentials are unavailable.";
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "PageSpeed capture failed.";
  }

  const insertedReadings = await db.insert(portfolioScoreReadings).values({
    projectKey: project.id,
    url: project.url,
    capturedDay,
    status: scores ? "scored" : "failed",
    speedScore: scores?.speed ?? null,
    reachScore: scores?.reach ?? null,
    reliabilityScore: scores?.reliability ?? null,
    visibilityScore: scores?.visibility ?? null,
    source: "pagespeed",
    errorMessage,
    capturedAt,
  }).onConflictDoNothing({
    target: [portfolioScoreReadings.projectKey, portfolioScoreReadings.capturedDay],
  }).returning();

  // Another invocation may have inserted today's row after our initial check.
  // Treat that race as an idempotent success instead of failing the whole job.
  const [reading] = insertedReadings.length > 0
    ? insertedReadings
    : await db.select().from(portfolioScoreReadings).where(and(
        eq(portfolioScoreReadings.projectKey, project.id),
        eq(portfolioScoreReadings.capturedDay, capturedDay),
      )).limit(1);

  if (!reading) {
    throw new Error(`Unable to retrieve the daily reading for ${project.id}.`);
  }

  if (insertedReadings.length === 0) return reading;

  if (scores) {
    await db.insert(portfolioScores).values({
      url: project.url,
      speedScore: scores.speed,
      reachScore: scores.reach,
      reliabilityScore: scores.reliability,
      visibilityScore: scores.visibility,
      updatedAt: capturedAt,
    }).onConflictDoUpdate({
      target: portfolioScores.url,
      set: {
        speedScore: scores.speed,
        reachScore: scores.reach,
        reliabilityScore: scores.reliability,
        visibilityScore: scores.visibility,
        updatedAt: capturedAt,
      },
    });
  }

  await evaluatePortfolioScoreAlerts(db, project, reading);
  return reading;
}

export async function runDailyPortfolioScoreCapture(options: { databaseUrl?: string; pageSpeedApiKey?: string; now?: Date } = {}) {
  for (const project of carouselProjects) {
    await capturePortfolioProjectScore(project, options);
  }
}

export async function getOpenPortfolioScoreAlerts(databaseUrl?: string) {
  const db = await getDb(databaseUrl);
  return db.select().from(portfolioScoreAlerts)
    .where(inArray(portfolioScoreAlerts.status, ["open", "acknowledged"]))
    .orderBy(desc(portfolioScoreAlerts.createdAt));
}
