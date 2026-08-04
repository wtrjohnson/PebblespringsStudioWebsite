import { requireAdmin } from "../../../../../../db/adminAuth";
import {
  createApproval,
  parseApprovalInput,
  projectExists,
} from "../../../../../../db/adminWrites";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin(request))) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const projectId = Number((await params).id);

    if (!Number.isInteger(projectId) || projectId < 1 || !(await projectExists(projectId))) {
      return Response.json({ error: "project not found" }, { status: 404 });
    }

    const parsed = parseApprovalInput(await request.json().catch(() => null));

    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: parsed.status });
    }

    return Response.json({ approval: await createApproval(projectId, parsed.value) });
  } catch (error) {
    console.error("Unable to create approval", error);
    return Response.json({ error: "Unable to save the approval." }, { status: 500 });
  }
}
