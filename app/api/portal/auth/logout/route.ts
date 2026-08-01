import { NextResponse } from "next/server";
import {
  getPortalCookieOptions,
  getPortalSessionTokenFromCookieHeader,
  PORTAL_SESSION_COOKIE,
  revokePortalSessionToken,
} from "../../../../../db/portalAuth";

export async function POST(request: Request) {
  await revokePortalSessionToken(getPortalSessionTokenFromCookieHeader(request.headers.get("cookie")));

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    PORTAL_SESSION_COOKIE,
    "",
    getPortalCookieOptions(new Date(0)),
  );

  return response;
}
