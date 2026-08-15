export type ScoreKey = "speed" | "reach" | "reliability" | "visibility";

export type PageSpeedAudit = {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
  numericValue?: number;
  numericUnit?: string;
  group?: "metric" | "opportunity" | "diagnostic" | "audit";
};

export type PageSpeedReport = {
  url: string;
  strategy: "mobile";
  fetchedAt: string;
  categories: Record<ScoreKey, number>;
  metrics: PageSpeedAudit[];
  audits: PageSpeedAudit[];
  findings: PageSpeedAudit[];
};

function scoreFromCategory(value: unknown) {
  return Math.round(Math.max(0, Math.min(Number(value ?? 0), 1)) * 100);
}

function auditGroup(id: string, detailsType: unknown): PageSpeedAudit["group"] {
  if ([
    "first-contentful-paint",
    "largest-contentful-paint",
    "total-blocking-time",
    "cumulative-layout-shift",
    "speed-index",
    "interactive",
    "interaction-to-next-paint",
  ].includes(id)) {
    return "metric";
  }

  if (detailsType === "opportunity") {
    return "opportunity";
  }

  if (detailsType === "table" || detailsType === "debugdata") {
    return "diagnostic";
  }

  return "audit";
}

function normalizeAudit(id: string, audit: Record<string, unknown>): PageSpeedAudit {
  const scoreValue = typeof audit.score === "number" ? audit.score : null;
  const details = audit.details as Record<string, unknown> | undefined;

  return {
    id,
    title: typeof audit.title === "string" ? audit.title : id,
    description: typeof audit.description === "string" ? audit.description : "",
    score: scoreValue === null ? null : Math.round(scoreValue * 100) / 100,
    displayValue: typeof audit.displayValue === "string" ? audit.displayValue : undefined,
    numericValue: typeof audit.numericValue === "number" ? audit.numericValue : undefined,
    numericUnit: typeof audit.numericUnit === "string" ? audit.numericUnit : undefined,
    group: auditGroup(id, details?.type),
  };
}

export async function fetchPageSpeedReport(url: string, configuredApiKey?: string): Promise<PageSpeedReport | null> {
  const apiKey = configuredApiKey ?? process.env.PAGESPEED_INSIGHTS_API_KEY ?? process.env.GOOGLE_PAGESPEED_API_KEY;

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
    fetchTime?: string;
    lighthouseResult?: {
      finalDisplayedUrl?: string;
      categories?: {
        performance?: { score?: number };
        accessibility?: { score?: number };
        "best-practices"?: { score?: number };
        seo?: { score?: number };
      };
      audits?: Record<string, Record<string, unknown>>;
    };
  };
  const categoryResults = data.lighthouseResult?.categories;

  if (!categoryResults) {
    throw new Error("Unable to read Lighthouse results for that site.");
  }

  const categories = {
    speed: scoreFromCategory(categoryResults.performance?.score),
    reach: scoreFromCategory(categoryResults.accessibility?.score),
    reliability: scoreFromCategory(categoryResults["best-practices"]?.score),
    visibility: scoreFromCategory(categoryResults.seo?.score),
  };

  const metricIds = [
    "first-contentful-paint",
    "largest-contentful-paint",
    "total-blocking-time",
    "cumulative-layout-shift",
    "speed-index",
    "interactive",
    "interaction-to-next-paint",
  ];
  const audits = Object.entries(data.lighthouseResult?.audits ?? {})
    .map(([id, audit]) => normalizeAudit(id, audit))
    .filter((audit) => audit.title && audit.description);
  const metrics = metricIds
    .map((id) => audits.find((audit) => audit.id === id))
    .filter((audit): audit is PageSpeedAudit => Boolean(audit));
  const findings = audits
    .filter((audit) => audit.group !== "metric" && audit.score !== null && audit.score < 0.9)
    .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
    .slice(0, 5);

  return {
    url: data.lighthouseResult?.finalDisplayedUrl ?? url,
    strategy: "mobile",
    fetchedAt: data.fetchTime ?? new Date().toISOString(),
    categories,
    metrics,
    audits,
    findings,
  };
}

export async function fetchPageSpeedScores(url: string, configuredApiKey?: string): Promise<Record<ScoreKey, number> | null> {
  const report = await fetchPageSpeedReport(url, configuredApiKey);
  return report?.categories ?? null;
}
