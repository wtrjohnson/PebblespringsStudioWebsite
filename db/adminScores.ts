import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { portalProjects, portfolioScores } from "./schema";
import { fetchPageSpeedScores } from "../app/lib/pagespeed";

const SCORE_REFRESH_MS = 1000 * 60 * 60 * 24;

const KNOWN_SITE_URLS: Record<string, string> = {
  "albert-rozin": "https://albertrozin.com",
  "r-johnson-piano": "https://rjohnsonpiano.com",
  "slipstream-advocacy": "https://slipstreamadvocacy.com",
  "clear-policy-strategies": "https://clearpolicystrategies.com",
  "pebblesprings-studio": "https://pebblesprings.co",
};

export function getProjectSiteUrl(project: { siteUrl: string; slug: string }) {
  return project.siteUrl || KNOWN_SITE_URLS[project.slug] || "";
}

export async function refreshProjectScore(projectId: number) {
  const db = await getDb();
  const [project] = await db
    .select({ id: portalProjects.id, siteUrl: portalProjects.siteUrl, slug: portalProjects.slug })
    .from(portalProjects)
    .where(eq(portalProjects.id, projectId))
    .limit(1);

  if (!project) return { error: "project not found" as const };

  const url = getProjectSiteUrl(project);
  if (!url) return { error: "website URL is not configured" as const };

  const scores = await fetchPageSpeedScores(url);
  if (!scores) return { error: "website could not be scored" as const };

  const updatedAt = new Date().toISOString();
  const [score] = await db
    .insert(portfolioScores)
    .values({
      url,
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
    })
    .returning();

  return { score };
}

export async function refreshStaleProjectScores(projectIds: number[]) {
  const db = await getDb();
  const projects = await db
    .select({ id: portalProjects.id, siteUrl: portalProjects.siteUrl, slug: portalProjects.slug })
    .from(portalProjects)
    .where(eq(portalProjects.status, "active"));
  const rows = await db.select().from(portfolioScores);
  const scoresByUrl = new Map(rows.map((row) => [row.url, row]));
  const requested = new Set(projectIds);

  await Promise.all(
    projects
      .filter((project) => requested.has(project.id))
      .filter((project) => {
        const url = getProjectSiteUrl(project);
        const score = scoresByUrl.get(url);
        return Boolean(url) && (!score || Date.now() - new Date(score.updatedAt).getTime() > SCORE_REFRESH_MS);
      })
      .map((project) => refreshProjectScore(project.id).catch(() => null)),
  );
}
