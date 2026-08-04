import { NextResponse } from "next/server";
import {
  createStudioSession,
  getStudioCookieOptions,
  isAdminLoginRateLimited,
  normalizeAdminEmail,
  STUDIO_SESSION_COOKIE,
} from "../../../../../db/adminAuth";

// One message for every failure mode, so the response never reveals whether an
// account exists.
const FAILURE_MESSAGE = "Email or password is incorrect.";

type LoginPayload = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as LoginPayload | null;
    const email = normalizeAdminEmail(payload?.email);
    const password = typeof payload?.password === "string" ? payload.password : "";

    if (!email || !password) {
      return Response.json({ error: FAILURE_MESSAGE }, { status: 401 });
    }

    if (await isAdminLoginRateLimited(email)) {
      return Response.json(
        { error: "Too many attempts. Try again in a few minutes." },
        { status: 429 },
      );
    }

    const session = await createStudioSession(email, password);

    if (!session) {
      return Response.json({ error: FAILURE_MESSAGE }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      STUDIO_SESSION_COOKIE,
      session.token,
      getStudioCookieOptions(session.expiresAt),
    );

    return response;
  } catch (error) {
    console.error("Admin sign in failed", error);
    return Response.json({ error: FAILURE_MESSAGE }, { status: 500 });
  }
}
