import { NextResponse } from "next/server";
import {
  getStudioCookieOptions,
  getStudioSessionTokenFromCookieHeader,
  revokeStudioSessionToken,
  STUDIO_SESSION_COOKIE,
} from "../../../../../db/adminAuth";

export async function POST(request: Request) {
  await revokeStudioSessionToken(
    getStudioSessionTokenFromCookieHeader(request.headers.get("cookie")),
  );

  const response = NextResponse.json({ ok: true });
  response.cookies.set(STUDIO_SESSION_COOKIE, "", getStudioCookieOptions(new Date(0)));

  return response;
}
