import { NextResponse } from "next/server";
import {
  createPortalSessionFromMagicToken,
  getPortalCookieOptions,
  PORTAL_SESSION_COOKIE,
} from "../../../../db/portalAuth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/portal/login?error=invalid", url));
  }

  const session = await createPortalSessionFromMagicToken(token);

  if (!session) {
    return NextResponse.redirect(new URL("/portal/login?error=invalid", url));
  }

  const response = NextResponse.redirect(new URL("/portal", url));
  response.cookies.set(
    PORTAL_SESSION_COOKIE,
    session.token,
    getPortalCookieOptions(session.expiresAt),
  );

  return response;
}
