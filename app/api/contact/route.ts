import { getDb } from "../../../db";
import { consumeRateLimit, getClientAddress, tooManyRequests } from "../../../db/security";
import { contactSubmissions } from "../../../db/schema";

type ContactPayload = {
  name?: string;
  email?: string;
  project?: string;
  message?: string;
  budget?: string;
  timeline?: string;
  website?: string;
};

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ContactPayload;
    const message = clean(payload.message);
    const email = clean(payload.email);

    // Hidden-field bot verification. It is visually absent and left empty by
    // the real form, while basic form-filling bots commonly populate it.
    if (clean(payload.website)) {
      return Response.json({ ok: true }, { status: 201 });
    }

    const rateLimit = await consumeRateLimit({
      scope: "contact-form",
      identifier: getClientAddress(request),
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return tooManyRequests(rateLimit.retryAfterSeconds);
    }

    if (!message || message.length > 5000) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    if (email.length > 254 || (email && !email.includes("@"))) {
      return Response.json({ error: "email is invalid" }, { status: 400 });
    }

    const name = clean(payload.name);
    const project = clean(payload.project);
    const budget = clean(payload.budget);
    const timeline = clean(payload.timeline);

    if (name.length > 200 || project.length > 300 || budget.length > 100 || timeline.length > 100) {
      return Response.json({ error: "one or more fields are too long" }, { status: 400 });
    }

    const db = await getDb();
    const [submission] = await db
      .insert(contactSubmissions)
      .values({
        name,
        email,
        project,
        message,
        budget,
        timeline,
      })
      .returning({ id: contactSubmissions.id });

    return Response.json({ ok: true, id: submission.id }, { status: 201 });
  } catch (error) {
    console.error("Unable to save contact submission", error);
    return Response.json({ error: "Unable to send your message right now." }, { status: 500 });
  }
}
