import { getDb } from "../../../db";
import { websiteTestRequests } from "../../../db/schema";

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
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
