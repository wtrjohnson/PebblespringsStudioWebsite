import { NextRequest, NextResponse } from "next/server";

type ScoreKey = "speed" | "reach" | "reliability" | "visibility";

type CachedScore = {
  expiresAt: number;
  payload: {
    url: string;
    scores: Record<ScoreKey, number>;
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

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
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

  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload);
  }

  try {
    const pageSpeedScores = await fetchPageSpeedScores(url);
    const payload = {
      url,
      scores: pageSpeedScores ?? createDemoScores(url),
    };

    scoreCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to score that site right now." },
      { status: 502 },
    );
  }
}
