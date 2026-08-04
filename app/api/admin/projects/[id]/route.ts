import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { requireAdmin } from "../../../../../db/adminAuth";
import { portalPhases } from "../../../../../db/portalPhases";
import { portalProjects } from "../../../../../db/schema";

const PROJECT_STATUSES = ["active", "completed", "archived"] as const;

type ProjectPayload = {
  projectName?: unknown;
  slug?: unknown;
  currentPhase?: unknown;
  nextUp?: unknown;
  status?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireAdmin(request))) {
      return Response.json({ error: "authentication required" }, { status: 401 });
    }

    const projectId = Number((await params).id);

    if (!Number.isInteger(projectId) || projectId < 1) {
      return Response.json({ error: "project id is invalid" }, { status: 400 });
    }

    const payload = (await request.json().catch(() => null)) as ProjectPayload | null;

    if (!payload) {
      return Response.json({ error: "body is required" }, { status: 400 });
    }

    const projectName = readString(payload.projectName);
    const slug = readString(payload.slug);
    const currentPhase = readString(payload.currentPhase);
    const nextUp = readString(payload.nextUp);
    const status = readString(payload.status);

    if (!projectName) {
      return Response.json({ error: "Project name is required." }, { status: 400 });
    }

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return Response.json(
        { error: "Slug must use lowercase letters, numbers, and hyphens only." },
        { status: 400 },
      );
    }

    if (!currentPhase || !portalPhases.includes(currentPhase)) {
      return Response.json({ error: "Phase is not one of the known phases." }, { status: 400 });
    }

    if (!status || !PROJECT_STATUSES.includes(status as (typeof PROJECT_STATUSES)[number])) {
      return Response.json({ error: "Status is invalid." }, { status: 400 });
    }

    const db = await getDb();
    const [project] = await db
      .update(portalProjects)
      .set({
        projectName,
        slug,
        currentPhase,
        nextUp: nextUp ?? "",
        status: status as (typeof PROJECT_STATUSES)[number],
        updatedAt: sql`CURRENT_TIMESTAMP::text`,
      })
      .where(eq(portalProjects.id, projectId))
      .returning();

    if (!project) {
      return Response.json({ error: "project not found" }, { status: 404 });
    }

    return Response.json({ project });
  } catch (error) {
    console.error("Unable to update project", error);
    return Response.json({ error: "Unable to save the project." }, { status: 500 });
  }
}
