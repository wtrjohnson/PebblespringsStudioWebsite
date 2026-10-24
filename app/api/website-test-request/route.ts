import { and, eq, isNull, lte } from "drizzle-orm";
import { getDb } from "../../../db";
import { consumeRateLimit, getClientAddress, tooManyRequests } from "../../../db/security";
import { websiteTestReports, websiteTestRequests, websiteTests } from "../../../db/schema";
import { requireCanonicalAppUrl } from "../../lib/appUrl";
import {
  buildWebsiteReportEmail,
  createReportToken,
  hashReportRequestToken,
  hashReportToken,
  REPORT_TTL_MS,
} from "../../lib/websiteReports";
import type { PageSpeedReport } from "../../lib/pagespeed";

type WebsiteTestRequestPayload = {
  websiteTestId?: unknown;
  websiteTestToken?: unknown;
  email?: unknown;
  message?: unknown;
  requestType?: unknown;
  website?: unknown;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WebsiteTestRequestPayload;
    const websiteTestId = Number(payload.websiteTestId);
    const websiteTestToken = clean(payload.websiteTestToken);
    const email = clean(payload.email);
    const message = clean(payload.message);
    const requestType = clean(payload.requestType);

    // Hidden-field bot verification: real clients never populate this field.
    if (clean(payload.website)) {
      return Response.json({ ok: true }, { status: 201 });
    }

    if (!Number.isInteger(websiteTestId) || websiteTestId <= 0) {
      return Response.json({ error: "websiteTestId is required" }, { status: 400 });
    }

    if (!websiteTestToken || websiteTestToken.length > 128) {
      return Response.json({ error: "website test authorization is required" }, { status: 400 });
    }

    if (!email || email.length > 254 || !isValidEmail(email)) {
      return Response.json({ error: "email is invalid" }, { status: 400 });
    }

    if (requestType !== "report" && requestType !== "project") {
      return Response.json({ error: "requestType is invalid" }, { status: 400 });
    }

    if (message.length > 4000) {
      return Response.json({ error: "message is too long" }, { status: 400 });
    }

    const clientAddress = getClientAddress(request);
    const connectionLimit = await consumeRateLimit({
      scope: "website-report-connection",
      identifier: clientAddress,
      limit: 6,
      windowMs: 15 * 60 * 1000,
    });

    if (!connectionLimit.allowed) {
      return tooManyRequests(connectionLimit.retryAfterSeconds);
    }

    const db = await getDb();
    const requestTokenHash = hashReportRequestToken(websiteTestToken);
    const [test] = await db.select().from(websiteTests).where(and(
      eq(websiteTests.id, websiteTestId),
      eq(websiteTests.requestTokenHash, requestTokenHash),
      isNull(websiteTests.requestTokenUsedAt),
    )).limit(1);

    if (!test) {
      return Response.json({ error: "Website test authorization is invalid or expired." }, { status: 404 });
    }

    const recipientLimit = await consumeRateLimit({
      scope: "website-report-recipient",
      identifier: email,
      limit: 4,
      windowMs: 60 * 60 * 1000,
    });

    if (!recipientLimit.allowed) {
      return tooManyRequests(recipientLimit.retryAfterSeconds);
    }

    if (requestType === "report") {
      if (test.source !== "pagespeed" || !test.reportData) {
        return Response.json({ error: "A real PageSpeed result is required before requesting a report." }, { status: 409 });
      }

      const resendKey = process.env.RESEND_API_KEY;
      const from = process.env.REPORT_FROM_EMAIL ?? process.env.PORTAL_FROM_EMAIL;
      if (!resendKey || !from) {
        return Response.json({ error: "Report email is not configured yet." }, { status: 503 });
      }

      await db.delete(websiteTestReports).where(lte(websiteTestReports.expiresAt, new Date().toISOString()));
      const token = createReportToken();
      const tokenHash = hashReportToken(token);
      const expiresAt = new Date(Date.now() + REPORT_TTL_MS).toISOString();
      const origin = requireCanonicalAppUrl();
      const reportUrl = `${origin}/report/${encodeURIComponent(token)}`;
      const reportEmail = buildWebsiteReportEmail(test.reportData as PageSpeedReport, reportUrl);
      const claimedAt = new Date().toISOString();
      const [claimedTest] = await db.update(websiteTests)
        .set({ requestTokenUsedAt: claimedAt })
        .where(and(
          eq(websiteTests.id, websiteTestId),
          eq(websiteTests.requestTokenHash, requestTokenHash),
          isNull(websiteTests.requestTokenUsedAt),
        ))
        .returning({ id: websiteTests.id });

      if (!claimedTest) {
        return Response.json({ error: "Website test authorization is invalid or expired." }, { status: 409 });
      }

      let reportId: number | null = null;
      try {
        const [report] = await db.insert(websiteTestReports).values({ websiteTestId, email, tokenHash, expiresAt }).returning({ id: websiteTestReports.id });
        reportId = report.id;
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [email], subject: "Your Pebblesprings website report", html: reportEmail.html, text: reportEmail.text }),
        });
        if (!response.ok) throw new Error("Email provider rejected the report.");
        await db.update(websiteTestReports).set({ sentAt: new Date().toISOString() }).where(eq(websiteTestReports.id, report.id));
      } catch (sendError) {
        const cleanup = [
          db.update(websiteTests)
            .set({ requestTokenUsedAt: null })
            .where(and(
              eq(websiteTests.id, websiteTestId),
              eq(websiteTests.requestTokenUsedAt, claimedAt),
            )),
        ];
        if (reportId !== null) {
          cleanup.push(db.delete(websiteTestReports).where(eq(websiteTestReports.id, reportId)));
        }
        await Promise.all(cleanup);
        console.error("Unable to send website report", sendError);
        return Response.json({ error: "We could not send the report right now. Please try again." }, { status: 502 });
      }
    } else {
      const [claimedTest] = await db.update(websiteTests)
        .set({ requestTokenUsedAt: new Date().toISOString() })
        .where(and(
          eq(websiteTests.id, websiteTestId),
          eq(websiteTests.requestTokenHash, requestTokenHash),
          isNull(websiteTests.requestTokenUsedAt),
        ))
        .returning({ id: websiteTests.id });

      if (!claimedTest) {
        return Response.json({ error: "Website test authorization is invalid or expired." }, { status: 409 });
      }
    }
    await db
      .insert(websiteTestRequests)
      .values({
        websiteTestId,
        email,
        message,
        requestType,
      })
      .returning({ id: websiteTestRequests.id });

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Unable to process website test request", error);
    return Response.json({ error: "We could not process that request right now." }, { status: 500 });
  }
}
