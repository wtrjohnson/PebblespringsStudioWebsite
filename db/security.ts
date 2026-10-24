import { createHash } from "node:crypto";
import { lte, sql } from "drizzle-orm";
import { getDb } from "./index";
import { securityRateLimits } from "./schema";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function rateLimitKey(scope: string, identifier: string) {
  const digest = createHash("sha256")
    .update(`${scope}\0${identifier.trim().toLowerCase()}`)
    .digest("hex");

  return `${scope}:${digest}`;
}

export function getClientAddress(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function consumeRateLimit({
  scope,
  identifier,
  limit,
  windowMs,
}: {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const db = await getDb();
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + windowMs).toISOString();
  const key = rateLimitKey(scope, identifier);

  // The table is intentionally self-cleaning so random addresses and emails do
  // not turn rate-limit metadata into unbounded permanent storage.
  await db.delete(securityRateLimits).where(lte(securityRateLimits.expiresAt, nowIso));

  const [bucket] = await db
    .insert(securityRateLimits)
    .values({ key, count: 1, windowStartedAt: nowIso, expiresAt })
    .onConflictDoUpdate({
      target: securityRateLimits.key,
      set: {
        count: sql`CASE WHEN ${securityRateLimits.expiresAt} <= ${nowIso} THEN 1 ELSE ${securityRateLimits.count} + 1 END`,
        windowStartedAt: sql`CASE WHEN ${securityRateLimits.expiresAt} <= ${nowIso} THEN ${nowIso} ELSE ${securityRateLimits.windowStartedAt} END`,
        expiresAt: sql`CASE WHEN ${securityRateLimits.expiresAt} <= ${nowIso} THEN ${expiresAt} ELSE ${securityRateLimits.expiresAt} END`,
      },
    })
    .returning({ count: securityRateLimits.count, expiresAt: securityRateLimits.expiresAt });

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((Date.parse(bucket.expiresAt) - now.getTime()) / 1000),
  );

  return {
    allowed: bucket.count <= limit,
    retryAfterSeconds,
  };
}

export function tooManyRequests(retryAfterSeconds: number, message = "Too many requests. Try again later.") {
  return Response.json(
    { error: message },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}
