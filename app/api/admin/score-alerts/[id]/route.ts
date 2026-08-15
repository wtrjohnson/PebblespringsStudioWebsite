import { and, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "../../../../../db/adminAuth";
import { getDb } from "../../../../../db";
import { portfolioScoreAlerts } from "../../../../../db/schema";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(request))) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  const id = Number((await context.params).id);
  const body = await request.json().catch(() => null) as { status?: unknown } | null;
  const status = body?.status;
  if (!Number.isInteger(id) || !["acknowledged", "resolved"].includes(String(status))) {
    return Response.json({ error: "alert update is invalid" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const [alert] = await db.update(portfolioScoreAlerts)
      .set(String(status) === "resolved" ? { status: "resolved", resolvedAt: now } : { status: "acknowledged", acknowledgedAt: now })
      .where(and(
        eq(portfolioScoreAlerts.id, id),
        inArray(portfolioScoreAlerts.status, ["open", "acknowledged"]),
      ))
      .returning();

    if (!alert) return Response.json({ error: "alert not found" }, { status: 404 });
    return Response.json({ alert });
  } catch (error) {
    console.error("Unable to update portfolio score alert", error);
    return Response.json({ error: "Unable to update score alert." }, { status: 500 });
  }
}
