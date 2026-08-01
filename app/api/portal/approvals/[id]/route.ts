import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { getCurrentPortalSession } from "../../../../../db/portalAuth";
import { portalApprovals, portalProjects } from "../../../../../db/schema";

type ApprovalPayload = {
  status?: "approved" | "changes_requested";
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const approvalId = Number(id);
    const payload = (await request.json()) as ApprovalPayload;

    if (!Number.isInteger(approvalId) || approvalId < 1) {
      return Response.json({ error: "approval id is invalid" }, { status: 400 });
    }

    if (payload.status !== "approved" && payload.status !== "changes_requested") {
      return Response.json({ error: "status is invalid" }, { status: 400 });
    }

    const session = await getCurrentPortalSession(request);

    if (!session) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const db = await getDb();
    const [approval] = await db
      .update(portalApprovals)
      .set({
        status: payload.status,
        respondedAt: sql`CURRENT_TIMESTAMP::text`,
      })
      .from(portalProjects)
      .where(and(
        eq(portalApprovals.id, approvalId),
        eq(portalApprovals.projectId, portalProjects.id),
        eq(portalProjects.clientId, session.clientId),
      ))
      .returning();

    if (!approval) {
      return Response.json({ error: "approval not found" }, { status: 404 });
    }

    return Response.json({ approval });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
