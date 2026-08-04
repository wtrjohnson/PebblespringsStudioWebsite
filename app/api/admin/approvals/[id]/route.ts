import { requireAdmin } from "../../../../../db/adminAuth";
import {
  parseApprovalInput,
  softDeleteApproval,
  updateApproval,
} from "../../../../../db/adminWrites";

async function readApprovalId(params: Promise<{ id: string }>) {
  const approvalId = Number((await params).id);

  return Number.isInteger(approvalId) && approvalId >= 1 ? approvalId : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin(request))) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const approvalId = await readApprovalId(params);

    if (!approvalId) {
      return Response.json({ error: "approval id is invalid" }, { status: 400 });
    }

    const parsed = parseApprovalInput(await request.json().catch(() => null));

    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: parsed.status });
    }

    const approval = await updateApproval(approvalId, parsed.value);

    if (!approval) {
      return Response.json({ error: "approval not found" }, { status: 404 });
    }

    return Response.json({ approval });
  } catch (error) {
    console.error("Unable to save approval", error);
    return Response.json({ error: "Unable to save the approval." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin(request))) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const approvalId = await readApprovalId(params);

    if (!approvalId) {
      return Response.json({ error: "approval id is invalid" }, { status: 400 });
    }

    if (!(await softDeleteApproval(approvalId))) {
      return Response.json({ error: "approval not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Unable to remove approval", error);
    return Response.json({ error: "Unable to remove the approval." }, { status: 500 });
  }
}
