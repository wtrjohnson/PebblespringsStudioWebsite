import { and, eq, gte, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "../../../db";
import { portfolioScoreReadings, portfolioScores } from "../../../db/schema";
import { carouselProjects } from "../../portfolioData";
import type { ScoreKey } from "../../lib/pagespeed";

const SCORE_KEYS: ScoreKey[] = ["speed", "reach", "reliability", "visibility"];
const SCORE_COLUMNS = {
  speed: "speedScore",
  reach: "reachScore",
  reliability: "reliabilityScore",
  visibility: "visibilityScore",
} as const;

export async function GET() {
  const now = new Date();
  const windowEnd = now.toISOString();
  const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const db = await getDb();
    const trackedProjectKeys = carouselProjects.map((project) => project.id);
    const trackedProjectUrls = carouselProjects.map((project) => project.url);
    const readings = await db.select().from(portfolioScoreReadings).where(and(
      eq(portfolioScoreReadings.status, "scored"),
      gte(portfolioScoreReadings.capturedAt, windowStart),
      inArray(portfolioScoreReadings.projectKey, trackedProjectKeys),
    ));

    if (readings.length === 0) {
      const cachedScores = await db.select().from(portfolioScores).where(
        inArray(portfolioScores.url, trackedProjectUrls),
      );

      if (cachedScores.length === 0) {
        return NextResponse.json({ status: "unavailable", scores: null, readingCount: 0 });
      }

      const totals = cachedScores.reduce((acc, reading) => {
        for (const key of SCORE_KEYS) {
          acc[key] += reading[SCORE_COLUMNS[key]];
        }
        return acc;
      }, { speed: 0, reach: 0, reliability: 0, visibility: 0 } as Record<ScoreKey, number>);
      const latestCapturedAt = cachedScores.reduce(
        (latest, reading) => reading.updatedAt > latest ? reading.updatedAt : latest,
        cachedScores[0].updatedAt,
      );

      return NextResponse.json({
        status: "available",
        source: "portfolio-cache",
        scores: Object.fromEntries(
          SCORE_KEYS.map((key) => [key, Math.round(totals[key] / cachedScores.length)]),
        ),
        readingCount: cachedScores.length,
        latestCapturedAt,
        windowStart,
        windowEnd,
      });
    }

    const latestCapturedAt = readings.reduce((latest, reading) => reading.capturedAt > latest ? reading.capturedAt : latest, readings[0].capturedAt);
    const isStale = Date.now() - Date.parse(latestCapturedAt) > 48 * 60 * 60 * 1000;
    if (isStale) {
      return NextResponse.json({ status: "stale", scores: null, readingCount: readings.length, latestCapturedAt, windowStart, windowEnd });
    }

    const totals = readings.reduce((acc, reading) => {
      for (const key of SCORE_KEYS) {
        acc[key] += reading[SCORE_COLUMNS[key]] ?? 0;
      }
      return acc;
    }, { speed: 0, reach: 0, reliability: 0, visibility: 0 } as Record<ScoreKey, number>);

    return NextResponse.json({
      status: "available",
      scores: Object.fromEntries(SCORE_KEYS.map((key) => [key, Math.round(totals[key] / readings.length)])),
      readingCount: readings.length,
      latestCapturedAt,
      windowStart,
      windowEnd,
    });
  } catch (error) {
    console.error("Unable to load portfolio score readings", error);
    return NextResponse.json({ status: "unavailable", scores: null, readingCount: 0 });
  }
}
