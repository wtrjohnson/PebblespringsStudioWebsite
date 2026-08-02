export type ScoreKey = "speed" | "reach" | "reliability" | "visibility";

function scoreFromCategory(value: unknown) {
  return Math.round(Math.max(0, Math.min(Number(value ?? 0), 1)) * 100);
}

export async function fetchPageSpeedScores(url: string): Promise<Record<ScoreKey, number> | null> {
  const apiKey = process.env.PAGESPEED_INSIGHTS_API_KEY ?? process.env.GOOGLE_PAGESPEED_API_KEY;

  if (!apiKey) {
    return null;
  }

  const pageSpeedUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  pageSpeedUrl.searchParams.set("url", url);
  pageSpeedUrl.searchParams.set("strategy", "mobile");
  pageSpeedUrl.searchParams.set("category", "performance");
  pageSpeedUrl.searchParams.append("category", "accessibility");
  pageSpeedUrl.searchParams.append("category", "best-practices");
  pageSpeedUrl.searchParams.append("category", "seo");
  pageSpeedUrl.searchParams.set("key", apiKey);

  const response = await fetch(pageSpeedUrl, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Unable to score that site right now.");
  }

  const data = await response.json() as {
    lighthouseResult?: {
      categories?: {
        performance?: { score?: number };
        accessibility?: { score?: number };
        "best-practices"?: { score?: number };
        seo?: { score?: number };
      };
    };
  };
  const categories = data.lighthouseResult?.categories;

  if (!categories) {
    throw new Error("Unable to read Lighthouse results for that site.");
  }

  return {
    speed: scoreFromCategory(categories.performance?.score),
    reach: scoreFromCategory(categories.accessibility?.score),
    reliability: scoreFromCategory(categories["best-practices"]?.score),
    visibility: scoreFromCategory(categories.seo?.score),
  };
}
