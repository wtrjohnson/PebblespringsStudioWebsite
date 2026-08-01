import { getDb } from "../../../db";
import { contactSubmissions } from "../../../db/schema";

type ContactPayload = {
  name?: string;
  email?: string;
  project?: string;
  message?: string;
  budget?: string;
  timeline?: string;
};

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ContactPayload;
    const message = clean(payload.message);
    const email = clean(payload.email);

    if (!message) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    if (email && !email.includes("@")) {
      return Response.json({ error: "email is invalid" }, { status: 400 });
    }

    const db = await getDb();
    const [submission] = await db
      .insert(contactSubmissions)
      .values({
        name: clean(payload.name),
        email,
        project: clean(payload.project),
        message,
        budget: clean(payload.budget),
        timeline: clean(payload.timeline),
      })
      .returning();

    return Response.json({ submission }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
