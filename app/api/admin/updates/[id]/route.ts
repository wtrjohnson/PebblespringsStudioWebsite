import { requireAdmin } from "../../../../../db/adminAuth";
import { parseUpdateInput, softDeleteUpdate, updateUpdate } from "../../../../../db/adminWrites";

async function readUpdateId(params: Promise<{ id: string }>) {
  const updateId = Number((await params).id);

  return Number.isInteger(updateId) && updateId >= 1 ? updateId : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin(request))) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const updateId = await readUpdateId(params);

    if (!updateId) {
      return Response.json({ error: "update id is invalid" }, { status: 400 });
    }

    const parsed = parseUpdateInput(await request.json().catch(() => null));

    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: parsed.status });
    }

    const update = await updateUpdate(updateId, parsed.value);

    if (!update) {
      return Response.json({ error: "update not found" }, { status: 404 });
    }

    return Response.json({ update });
  } catch (error) {
    console.error("Unable to save update", error);
    return Response.json({ error: "Unable to save the update." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin(request))) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const updateId = await readUpdateId(params);

    if (!updateId) {
      return Response.json({ error: "update id is invalid" }, { status: 400 });
    }

    if (!(await softDeleteUpdate(updateId))) {
      return Response.json({ error: "update not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Unable to remove update", error);
    return Response.json({ error: "Unable to remove the update." }, { status: 500 });
  }
}
