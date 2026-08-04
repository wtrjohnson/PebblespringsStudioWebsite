import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { getCurrentPortalSession } from "../../../../../db/portalAuth";
import { portalApprovals, portalProjects } from "../../../../../db/schema";

const MAX_NOTE_LENGTH = 4000;

type ApprovalPayload = {
  status?: "approved" | "changes_requested";
  responseNote?: unknown;
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

    const responseNote =
      typeof payload.responseNote === "string" ? payload.responseNote.trim() : "";

    // A change request with no note is what forced clients into email; it is no
    // longer an accepted state.
    if (payload.status === "changes_requested" && !responseNote) {
      return Response.json(
        { error: "Tell Will what you'd like changed." },
        { status: 400 },
      );
    }

    if (responseNote.length > MAX_NOTE_LENGTH) {
      return Response.json({ error: "That note is too long." }, { status: 400 });
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
        responseNote: responseNote || null,
      })
      .from(portalProjects)
      .where(and(
        eq(portalApprovals.id, approvalId),
        eq(portalApprovals.projectId, portalProjects.id),
        eq(portalProjects.clientId, session.clientId),
        eq(portalApprovals.visibility, "published"),
        isNull(portalApprovals.deletedAt),
      ))
      .returning();

    if (!approval) {
      return Response.json({ error: "approval not found" }, { status: 404 });
    }

    return Response.json({ approval });
  } catch (error) {
    console.error("Unable to record approval response", error);
    return Response.json({ error: "Unable to save your response." }, { status: 500 });
  }
}
