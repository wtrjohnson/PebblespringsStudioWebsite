import { requireAdmin } from "../../../../db/adminAuth";
import { refreshProjectScore } from "../../../../db/adminScores";

export async function POST(request: Request) {
  if (!(await requireAdmin(request))) {
    return Response.json({ error: "authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { projectId?: unknown } | null;
  const projectId = Number(body?.projectId);

  if (!Number.isInteger(projectId) || projectId < 1) {
    return Response.json({ error: "project id is invalid" }, { status: 400 });
  }

  try {
    const result = await refreshProjectScore(projectId);
    if (result.error) return Response.json({ error: result.error }, { status: 422 });
    return Response.json({ score: result.score });
  } catch (error) {
    console.error("Unable to refresh project score", error);
    return Response.json({ error: "Unable to refresh score." }, { status: 500 });
  }
}
