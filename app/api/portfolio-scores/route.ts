import { NextResponse } from "next/server";
import { getDb } from "../../../db";
import { portfolioScores } from "../../../db/schema";
import { carouselProjects } from "../../portfolioData";
import { fetchPageSpeedScores, type ScoreKey } from "../../lib/pagespeed";

const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 24;

const FALLBACK_SCORES: Record<ScoreKey, number> = {
  speed: 100,
  reach: 94,
  reliability: 97,
  visibility: 98,
};

async function refreshStalePortfolioScores() {
  try {
    const db = await getDb();
    const rows = await db.select().from(portfolioScores);
    const rowsByUrl = new Map(rows.map((row) => [row.url, row]));
    const now = Date.now();

    for (const project of carouselProjects) {
      const existing = rowsByUrl.get(project.url);
      const isStale = !existing || now - new Date(existing.updatedAt).getTime() > REFRESH_INTERVAL_MS;

      if (!isStale) {
        continue;
      }

      try {
        const scores = await fetchPageSpeedScores(project.url);

        if (!scores) {
          continue;
        }

        const updatedAt = new Date().toISOString();

        await db
          .insert(portfolioScores)
          .values({
            url: project.url,
            speedScore: scores.speed,
            reachScore: scores.reach,
            reliabilityScore: scores.reliability,
            visibilityScore: scores.visibility,
            updatedAt,
          })
          .onConflictDoUpdate({
            target: portfolioScores.url,
            set: {
              speedScore: scores.speed,
              reachScore: scores.reach,
              reliabilityScore: scores.reliability,
              visibilityScore: scores.visibility,
              updatedAt,
            },
          });
      } catch (error) {
        console.error(`Unable to refresh portfolio score for ${project.url}`, error);
      }
    }
  } catch (error) {
    console.error("Unable to refresh portfolio scores", error);
  }
}

export async function GET() {
  try {
    await refreshStalePortfolioScores();

    const db = await getDb();
    const rows = await db.select().from(portfolioScores);

    if (rows.length === 0) {
      return NextResponse.json({ scores: FALLBACK_SCORES, updatedAt: null });
    }

    const totals = rows.reduce(
      (acc, row) => ({
        speed: acc.speed + row.speedScore,
        reach: acc.reach + row.reachScore,
        reliability: acc.reliability + row.reliabilityScore,
        visibility: acc.visibility + row.visibilityScore,
      }),
      { speed: 0, reach: 0, reliability: 0, visibility: 0 },
    );

    const scores: Record<ScoreKey, number> = {
      speed: Math.round(totals.speed / rows.length),
      reach: Math.round(totals.reach / rows.length),
      reliability: Math.round(totals.reliability / rows.length),
      visibility: Math.round(totals.visibility / rows.length),
    };

    const oldestUpdatedAt = rows
      .map((row) => row.updatedAt)
      .sort()[0] ?? null;

    return NextResponse.json({ scores, updatedAt: oldestUpdatedAt });
  } catch (error) {
    console.error("Unable to load portfolio scores", error);

    return NextResponse.json({ scores: FALLBACK_SCORES, updatedAt: null });
  }
}
