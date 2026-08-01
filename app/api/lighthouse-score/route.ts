import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { websiteTests } from "../../../db/schema";

type ScoreKey = "speed" | "reach" | "reliability" | "visibility";
type ScoreSource = "pagespeed" | "demo";

type CachedScore = {
  expiresAt: number;
  payload: {
    url: string;
    scores: Record<ScoreKey, number>;
    source: ScoreSource;
  };
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 4;
const RATE_LIMIT_WINDOW_MS = 1000 * 60;
const RATE_LIMIT_MAX_REQUESTS = 8;
const scoreCache = new Map<string, CachedScore>();
const rateLimitBuckets = new Map<string, number[]>();

function normalizeUrl(input: unknown) {
  if (typeof input !== "string") {
    return "";
  }

  const trimmed = input.trim();

  if (!trimmed) {
    return "";
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    const isLocalhost = hostname === "localhost";
    const isIpAddress = /^[\d.]+$/.test(hostname) || hostname.includes(":");
    const shouldUseWww = !hostname.startsWith("www.")
      && hostname.split(".").length === 2
      && !isLocalhost
      && !isIpAddress;

    url.protocol = url.protocol.toLowerCase();
    url.hostname = shouldUseWww ? `www.${hostname}` : hostname;
    url.hash = "";

    return url.toString();
  } catch {
    return candidate;
  }
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const existing = rateLimitBuckets.get(ip) ?? [];
  const recent = existing.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitBuckets.set(ip, recent);
    return true;
  }

  rateLimitBuckets.set(ip, [...recent, now]);
  return false;
}

function scoreFromCategory(value: unknown) {
  return Math.round(Math.max(0, Math.min(Number(value ?? 0), 1)) * 100);
}

function createDemoScores(url: string): Record<ScoreKey, number> {
  let seed = 0;

  for (const character of url) {
    seed = (seed * 31 + character.charCodeAt(0)) % 9973;
  }

  return {
    speed: 34 + (seed % 62),
    reach: 48 + ((seed * 7) % 50),
    reliability: 52 + ((seed * 11) % 46),
    visibility: 30 + ((seed * 17) % 66),
  };
}

function getLowestScore(scores: Record<ScoreKey, number>) {
  return (Object.entries(scores) as Array<[ScoreKey, number]>).reduce(
    (lowest, current) => current[1] < lowest[1] ? current : lowest,
  );
}

async function recordWebsiteTest({
  submittedUrl,
  normalizedUrl,
  source,
  scores,
  referrer,
  status,
  errorMessage,
}: {
  submittedUrl: string;
  normalizedUrl: string;
  source: ScoreSource;
  scores?: Record<ScoreKey, number>;
  referrer: string | null;
  status: "scored" | "failed";
  errorMessage?: string;
}) {
  try {
    const db = await getDb();
    const parsedUrl = new URL(normalizedUrl);
    const lowestScore = scores ? getLowestScore(scores) : null;
    const [test] = await db
      .insert(websiteTests)
      .values({
        submittedUrl,
        normalizedUrl,
        hostname: parsedUrl.hostname,
        source,
        speedScore: scores?.speed,
        reachScore: scores?.reach,
        reliabilityScore: scores?.reliability,
        visibilityScore: scores?.visibility,
        lowestScoreKey: lowestScore?.[0],
        lowestScoreValue: lowestScore?.[1],
        referrer,
        status,
        errorMessage,
      })
      .returning({ id: websiteTests.id });

    return test?.id;
  } catch (error) {
    console.error("Unable to record website test", error);
    return undefined;
  }
}

async function fetchPageSpeedScores(url: string): Promise<Record<ScoreKey, number> | null> {
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

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many checks from this connection. Try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null) as { url?: unknown } | null;
  const submittedUrl = typeof body?.url === "string" ? body.url.trim() : "";
  const url = normalizeUrl(body?.url);

  if (!url) {
    return NextResponse.json({ error: "Enter a URL to check." }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Enter a valid website URL." }, { status: 400 });
  }

  const cacheKey = url.toLowerCase();
  const cached = scoreCache.get(cacheKey);
  const referrer = request.headers.get("referer");

  if (cached && cached.expiresAt > Date.now()) {
    const websiteTestId = await recordWebsiteTest({
      submittedUrl,
      normalizedUrl: cached.payload.url,
      source: cached.payload.source,
      scores: cached.payload.scores,
      referrer,
      status: "scored",
    });

    return NextResponse.json({
      url: cached.payload.url,
      scores: cached.payload.scores,
      websiteTestId,
    });
  }

  try {
    const pageSpeedScores = await fetchPageSpeedScores(url);
    const scores = pageSpeedScores ?? createDemoScores(url);
    const source: ScoreSource = pageSpeedScores ? "pagespeed" : "demo";
    const payload = {
      url,
      scores,
      source,
    };

    scoreCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload,
    });

    const websiteTestId = await recordWebsiteTest({
      submittedUrl,
      normalizedUrl: url,
      source,
      scores,
      referrer,
      status: "scored",
    });

    return NextResponse.json({ url, scores, websiteTestId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unable to score that site right now.";

    await recordWebsiteTest({
      submittedUrl,
      normalizedUrl: url,
      source: "pagespeed",
      referrer,
      status: "failed",
      errorMessage,
    });

    return NextResponse.json(
      { error: errorMessage },
      { status: 502 },
    );
  }
}
