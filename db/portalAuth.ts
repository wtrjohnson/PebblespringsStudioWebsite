import { randomBytes, createHmac } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "./index";
import {
  portalClients,
  portalLoginAttempts,
  portalMagicLinks,
  portalSessions,
  portalUsers,
} from "./schema";

export const PORTAL_SESSION_COOKIE = "ps_portal_session";
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

export type PortalSessionContext = {
  userId: number;
  clientId: number;
  email: string;
  name: string;
  role: "admin" | "approver" | "viewer";
};

export function normalizePortalEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function getAuthSecret() {
  const secret = process.env.PORTAL_AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("PORTAL_AUTH_SECRET must be at least 32 characters.");
  }

  return secret;
}

function hashToken(token: string) {
  return createHmac("sha256", getAuthSecret()).update(token).digest("hex");
}

function createToken() {
  return randomBytes(32).toString("base64url");
}

function nowIso() {
  return new Date().toISOString();
}

function minutesFromNow(milliseconds: number) {
  return new Date(Date.now() + milliseconds).toISOString();
}

export function portalLoginPath() {
  return "/portal/login";
}

export function getPortalCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export function getPortalSessionTokenFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${PORTAL_SESSION_COOKIE}=`));

  return sessionCookie
    ? decodeURIComponent(sessionCookie.slice(PORTAL_SESSION_COOKIE.length + 1))
    : null;
}

export async function isPortalLoginRateLimited(email: string) {
  const db = await getDb();
  const since = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();
  const recentAttempts = await db
    .select({ id: portalLoginAttempts.id })
    .from(portalLoginAttempts)
    .where(and(eq(portalLoginAttempts.email, email), gt(portalLoginAttempts.createdAt, since)))
    .limit(LOGIN_MAX_ATTEMPTS);

  await db.insert(portalLoginAttempts).values({
    email,
    createdAt: nowIso(),
  });

  return recentAttempts.length >= LOGIN_MAX_ATTEMPTS;
}

export async function createPortalMagicLink(email: string) {
  const db = await getDb();
  const [user] = await db
    .select({
      id: portalUsers.id,
      email: portalUsers.email,
      status: portalUsers.status,
      clientStatus: portalClients.status,
    })
    .from(portalUsers)
    .innerJoin(portalClients, eq(portalClients.id, portalUsers.clientId))
    .where(eq(portalUsers.email, email))
    .limit(1);

  if (!user || user.status !== "active" || user.clientStatus !== "active") {
    return null;
  }

  const token = createToken();
  await db.insert(portalMagicLinks).values({
    userId: user.id,
    email: user.email,
    tokenHash: hashToken(token),
    expiresAt: minutesFromNow(MAGIC_LINK_TTL_MS),
    createdAt: nowIso(),
  });

  return token;
}

export async function createPortalSessionFromMagicToken(token: string) {
  const db = await getDb();
  const tokenHash = hashToken(token);
  const [magicLink] = await db
    .select()
    .from(portalMagicLinks)
    .where(and(eq(portalMagicLinks.tokenHash, tokenHash), isNull(portalMagicLinks.usedAt)))
    .limit(1);

  if (!magicLink || magicLink.expiresAt <= nowIso()) {
    return null;
  }

  const [user] = await db
    .select({
      id: portalUsers.id,
      clientId: portalUsers.clientId,
      email: portalUsers.email,
      name: portalUsers.name,
      role: portalUsers.role,
      status: portalUsers.status,
      clientStatus: portalClients.status,
    })
    .from(portalUsers)
    .innerJoin(portalClients, eq(portalClients.id, portalUsers.clientId))
    .where(eq(portalUsers.id, magicLink.userId))
    .limit(1);

  if (!user || user.status !== "active" || user.clientStatus !== "active") {
    return null;
  }

  const sessionToken = createToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const createdAt = nowIso();

  const [usedMagicLink] = await db.update(portalMagicLinks)
    .set({ usedAt: createdAt })
    .where(and(eq(portalMagicLinks.id, magicLink.id), isNull(portalMagicLinks.usedAt)))
    .returning({ id: portalMagicLinks.id });

  if (!usedMagicLink) {
    return null;
  }

  await db.insert(portalSessions).values({
    userId: user.id,
    clientId: user.clientId,
    tokenHash: hashToken(sessionToken),
    expiresAt: expiresAt.toISOString(),
    createdAt,
    lastSeenAt: createdAt,
  });

  return {
    token: sessionToken,
    expiresAt,
  };
}

export async function getPortalSessionFromToken(sessionToken: string | null) {
  if (!sessionToken) {
    return null;
  }

  const db = await getDb();
  const sessionTokenHash = hashToken(sessionToken);
  const [session] = await db
    .select()
    .from(portalSessions)
    .where(and(eq(portalSessions.tokenHash, sessionTokenHash), isNull(portalSessions.revokedAt)))
    .orderBy(desc(portalSessions.id))
    .limit(1);

  if (!session || session.expiresAt <= nowIso()) {
    return null;
  }

  const [user] = await db
    .select({
      id: portalUsers.id,
      clientId: portalUsers.clientId,
      email: portalUsers.email,
      name: portalUsers.name,
      role: portalUsers.role,
      status: portalUsers.status,
      clientStatus: portalClients.status,
    })
    .from(portalUsers)
    .innerJoin(portalClients, eq(portalClients.id, portalUsers.clientId))
    .where(eq(portalUsers.id, session.userId))
    .limit(1);

  if (!user || user.status !== "active" || user.clientStatus !== "active") {
    return null;
  }

  await db.update(portalSessions)
    .set({ lastSeenAt: nowIso() })
    .where(eq(portalSessions.id, session.id));

  return {
    userId: user.id,
    clientId: user.clientId,
    email: user.email,
    name: user.name,
    role: user.role,
  } satisfies PortalSessionContext;
}

export async function getCurrentPortalSession(request: Request) {
  const sessionToken = getPortalSessionTokenFromCookieHeader(request.headers.get("cookie"));

  return getPortalSessionFromToken(sessionToken);
}

export async function revokePortalSessionToken(sessionToken: string | null) {
  if (!sessionToken) {
    return;
  }

  const db = await getDb();
  await db.update(portalSessions)
    .set({ revokedAt: sql`CURRENT_TIMESTAMP::text` })
    .where(eq(portalSessions.tokenHash, hashToken(sessionToken)));
}
