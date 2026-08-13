import { eq, lte } from "drizzle-orm";
import { getDb } from "../../../db";
import { websiteTestReports, websiteTestRequests, websiteTests } from "../../../db/schema";
import { buildWebsiteReportEmail, createReportToken, hashReportToken, REPORT_TTL_MS } from "../../lib/websiteReports";
import type { PageSpeedReport } from "../../lib/pagespeed";

type WebsiteTestRequestPayload = {
  websiteTestId?: unknown;
  email?: unknown;
  message?: unknown;
  requestType?: unknown;
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
    const email = clean(payload.email);
    const message = clean(payload.message);
    const requestType = clean(payload.requestType);

    if (!Number.isInteger(websiteTestId) || websiteTestId <= 0) {
      return Response.json({ error: "websiteTestId is required" }, { status: 400 });
    }

    if (!email || !isValidEmail(email)) {
      return Response.json({ error: "email is invalid" }, { status: 400 });
    }

    if (requestType !== "report" && requestType !== "project") {
      return Response.json({ error: "requestType is invalid" }, { status: 400 });
    }

    const db = await getDb();
    const [test] = await db.select().from(websiteTests).where(eq(websiteTests.id, websiteTestId)).limit(1);

    if (!test) {
      return Response.json({ error: "Website test not found." }, { status: 404 });
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
      const origin = (process.env.APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
      const reportUrl = `${origin}/report/${encodeURIComponent(token)}`;
      const reportEmail = buildWebsiteReportEmail(test.reportData as PageSpeedReport, reportUrl);
      const [report] = await db.insert(websiteTestReports).values({ websiteTestId, email, tokenHash, expiresAt }).returning({ id: websiteTestReports.id });
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: [email], subject: "Your Pebblesprings website report", html: reportEmail.html, text: reportEmail.text }),
        });
        if (!response.ok) throw new Error("Email provider rejected the report.");
        await db.update(websiteTestReports).set({ sentAt: new Date().toISOString() }).where(eq(websiteTestReports.id, report.id));
      } catch (sendError) {
        await db.delete(websiteTestReports).where(eq(websiteTestReports.id, report.id));
        console.error("Unable to send website report", sendError);
        return Response.json({ error: "We could not send the report right now. Please try again." }, { status: 502 });
      }
    }
    const [testRequest] = await db
      .insert(websiteTestRequests)
      .values({
        websiteTestId,
        email,
        message,
        requestType,
      })
      .returning();

    return Response.json({ request: testRequest }, { status: 201 });
  } catch (error) {
    console.error("Unable to process website test request", error);
    return Response.json({ error: "We could not process that request right now." }, { status: 500 });
  }
}
