import {
  createPortalMagicLink,
  isPortalLoginRateLimited,
  normalizePortalEmail,
} from "../../../../../db/portalAuth";
import { getClientAddress } from "../../../../../db/security";
import { requireCanonicalAppUrl } from "../../../../lib/appUrl";

const SUCCESS_MESSAGE = "If that email has access, we sent a login link.";

type RequestLinkPayload = {
  email?: unknown;
};

/**
 * Email delivery is optional infrastructure. When Resend is not configured the
 * link is logged instead of thrown away — the portal stays usable in local
 * development and a missing key can never take the login endpoint down.
 */
async function sendMagicLinkEmail(email: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PORTAL_FROM_EMAIL;
  const appUrl = requireCanonicalAppUrl();

  const loginUrl = `${appUrl}/portal/auth/callback?token=${encodeURIComponent(token)}`;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`Development-only portal login link for ${email}: ${loginUrl}`);
      return;
    }

    throw new Error("Portal email delivery is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Your Pebblesprings portal login link",
      html: `
        <p>Use this link to open your Pebblesprings Studio client portal:</p>
        <p><a href="${loginUrl}">Open client portal</a></p>
        <p>This link expires in 15 minutes and can only be used once.</p>
      `,
      text: `Use this link to open your Pebblesprings Studio client portal: ${loginUrl}\n\nThis link expires in 15 minutes and can only be used once.`,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to send login email.");
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as RequestLinkPayload | null;
    const email = normalizePortalEmail(payload?.email);

    if (!email || await isPortalLoginRateLimited(email, getClientAddress(request))) {
      return Response.json({ message: SUCCESS_MESSAGE });
    }

    const token = await createPortalMagicLink(email);

    if (token) {
      await sendMagicLinkEmail(email, token);
    }

    return Response.json({ message: SUCCESS_MESSAGE });
  } catch (error) {
    console.error("Unable to request portal login link", error);
    return Response.json({ message: SUCCESS_MESSAGE });
  }
}
