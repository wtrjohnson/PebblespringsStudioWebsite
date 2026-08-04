import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "./index";
import { studioAdminLoginAttempts, studioAdminSessions, studioAdmins } from "./schema";

export const STUDIO_SESSION_COOKIE = "ps_studio_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

// PBKDF2 rather than scrypt: workerd does not implement node:crypto's scrypt, so the
// password path has to go through WebCrypto to survive deployment.
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_KEY_BYTES = 32;

export type StudioAdminContext = {
  adminId: number;
  email: string;
  name: string;
};

export function normalizeAdminEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function getStudioAuthSecret() {
  const secret = process.env.STUDIO_AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("STUDIO_AUTH_SECRET must be at least 32 characters.");
  }

  return secret;
}

function hashSessionToken(token: string) {
  return createHmac("sha256", getStudioAuthSecret()).update(token).digest("hex");
}

function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

function nowIso() {
  return new Date().toISOString();
}

export function createPasswordSalt() {
  return randomBytes(16).toString("hex");
}

export async function hashPassword(password: string, salt: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    key,
    PBKDF2_KEY_BYTES * 8,
  );

  return Buffer.from(bits).toString("hex");
}

async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = Buffer.from(await hashPassword(password, salt), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export function adminLoginPath() {
  return "/admin/login";
}

export function getStudioCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export function getStudioSessionTokenFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${STUDIO_SESSION_COOKIE}=`));

  return sessionCookie
    ? decodeURIComponent(sessionCookie.slice(STUDIO_SESSION_COOKIE.length + 1))
    : null;
}

export async function isAdminLoginRateLimited(email: string) {
  const db = await getDb();
  const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
  const recentAttempts = await db
    .select({ id: studioAdminLoginAttempts.id })
    .from(studioAdminLoginAttempts)
    .where(and(
      eq(studioAdminLoginAttempts.email, email),
      gt(studioAdminLoginAttempts.createdAt, since),
    ))
    .limit(LOGIN_MAX_ATTEMPTS);

  await db.insert(studioAdminLoginAttempts).values({
    email,
    createdAt: nowIso(),
  });

  return recentAttempts.length >= LOGIN_MAX_ATTEMPTS;
}

export async function createStudioSession(email: string, password: string) {
  const db = await getDb();
  const [admin] = await db
    .select()
    .from(studioAdmins)
    .where(eq(studioAdmins.email, email))
    .limit(1);

  if (!admin || admin.status !== "active") {
    return null;
  }

  if (!(await verifyPassword(password, admin.passwordSalt, admin.passwordHash))) {
    return null;
  }

  const sessionToken = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const createdAt = nowIso();

  await db.insert(studioAdminSessions).values({
    adminId: admin.id,
    tokenHash: hashSessionToken(sessionToken),
    expiresAt: expiresAt.toISOString(),
    createdAt,
    lastSeenAt: createdAt,
  });

  await db.update(studioAdmins)
    .set({ lastLoginAt: createdAt })
    .where(eq(studioAdmins.id, admin.id));

  return {
    token: sessionToken,
    expiresAt,
  };
}

export async function getStudioSessionFromToken(sessionToken: string | null) {
  if (!sessionToken) {
    return null;
  }

  const db = await getDb();
  const [session] = await db
    .select()
    .from(studioAdminSessions)
    .where(and(
      eq(studioAdminSessions.tokenHash, hashSessionToken(sessionToken)),
      isNull(studioAdminSessions.revokedAt),
    ))
    .orderBy(desc(studioAdminSessions.id))
    .limit(1);

  if (!session || session.expiresAt <= nowIso()) {
    return null;
  }

  const [admin] = await db
    .select()
    .from(studioAdmins)
    .where(eq(studioAdmins.id, session.adminId))
    .limit(1);

  if (!admin || admin.status !== "active") {
    return null;
  }

  await db.update(studioAdminSessions)
    .set({ lastSeenAt: nowIso() })
    .where(eq(studioAdminSessions.id, session.id));

  return {
    adminId: admin.id,
    email: admin.email,
    name: admin.name,
  } satisfies StudioAdminContext;
}

/**
 * Guard for every /admin page and /api/admin route. This project has no
 * middleware.ts, so authorization is enforced per route rather than centrally.
 */
export async function requireAdmin(request: Request) {
  const sessionToken = getStudioSessionTokenFromCookieHeader(request.headers.get("cookie"));

  return getStudioSessionFromToken(sessionToken);
}

export async function revokeStudioSessionToken(sessionToken: string | null) {
  if (!sessionToken) {
    return;
  }

  const db = await getDb();
  await db.update(studioAdminSessions)
    .set({ revokedAt: sql`CURRENT_TIMESTAMP::text` })
    .where(eq(studioAdminSessions.tokenHash, hashSessionToken(sessionToken)));
}
