import { requireAdmin } from "../../../../../../db/adminAuth";
import { replyToApproval } from "../../../../../../db/adminWrites";

type ReplyPayload = {
  reply?: unknown;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin(request))) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const approvalId = Number((await params).id);

    if (!Number.isInteger(approvalId) || approvalId < 1) {
      return Response.json({ error: "approval id is invalid" }, { status: 400 });
    }

    const payload = (await request.json().catch(() => null)) as ReplyPayload | null;
    const reply = typeof payload?.reply === "string" ? payload.reply.trim() : "";

    if (!reply) {
      return Response.json({ error: "Write a reply first." }, { status: 400 });
    }

    const approval = await replyToApproval(approvalId, reply);

    if (!approval) {
      return Response.json(
        { error: "This approval already has a reply, or no longer exists." },
        { status: 409 },
      );
    }

    return Response.json({ approval });
  } catch (error) {
    console.error("Unable to reply to approval", error);
    return Response.json({ error: "Unable to save the reply." }, { status: 500 });
  }
}
