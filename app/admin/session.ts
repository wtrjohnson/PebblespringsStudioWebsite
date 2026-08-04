import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  adminLoginPath,
  getStudioSessionFromToken,
  STUDIO_SESSION_COOKIE,
} from "../../db/adminAuth";

/**
 * Server-component counterpart to `requireAdmin(request)` in db/adminAuth.ts.
 * Route handlers read the cookie off the Request; pages read it from
 * next/headers. Both end up in the same session lookup.
 */
export async function getAdminSession() {
  const cookieStore = await cookies();

  return getStudioSessionFromToken(cookieStore.get(STUDIO_SESSION_COOKIE)?.value ?? null);
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    redirect(adminLoginPath());
  }

  return session;
}
