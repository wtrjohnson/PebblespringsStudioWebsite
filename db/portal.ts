import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "./index";
import { portalApprovals, portalProjects, portalUpdates } from "./schema";

export { portalPhases } from "./portalPhases";

export type PortalApproval = typeof portalApprovals.$inferSelect;
export type PortalProject = typeof portalProjects.$inferSelect;
export type PortalUpdate = typeof portalUpdates.$inferSelect;

export type PortalData = {
  project: PortalProject;
  approvals: PortalApproval[];
  updates: PortalUpdate[];
};

export function formatPortalDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

/**
 * Open items first. `asc(status)` would sort alphabetically — approved,
 * changes_requested, needs_review — which buries the one thing the client
 * actually has to act on.
 */
const approvalPriority = sql`CASE WHEN ${portalApprovals.status} = 'needs_review' THEN 0 ELSE 1 END`;

async function getPublishedContent(projectId: number) {
  const db = await getDb();

  return Promise.all([
    db
      .select()
      .from(portalUpdates)
      .where(and(
        eq(portalUpdates.projectId, projectId),
        eq(portalUpdates.visibility, "published"),
        isNull(portalUpdates.deletedAt),
      ))
      .orderBy(desc(portalUpdates.publishedAt), desc(portalUpdates.id)),
    db
      .select()
      .from(portalApprovals)
      .where(and(
        eq(portalApprovals.projectId, projectId),
        eq(portalApprovals.visibility, "published"),
        isNull(portalApprovals.deletedAt),
      ))
      .orderBy(approvalPriority, desc(portalApprovals.createdAt)),
  ]);
}

/**
 * Returns null when the client has no active project. Errors are deliberately
 * allowed to propagate: a swallowed failure here previously rendered another
 * client's hardcoded content, which is worse than an error page.
 */
export async function getPortalDataForClient(clientId: number): Promise<PortalData | null> {
  const db = await getDb();
  const [project] = await db
    .select()
    .from(portalProjects)
    .where(and(eq(portalProjects.clientId, clientId), eq(portalProjects.status, "active")))
    .orderBy(asc(portalProjects.id))
    .limit(1);

  if (!project) {
    return null;
  }

  const [updates, approvals] = await getPublishedContent(project.id);

  return { project, updates, approvals };
}

/** Same published view, addressed by project — used by the admin preview. */
export async function getPortalDataForProject(projectId: number): Promise<PortalData | null> {
  const db = await getDb();
  const [project] = await db
    .select()
    .from(portalProjects)
    .where(eq(portalProjects.id, projectId))
    .limit(1);

  if (!project) {
    return null;
  }

  const [updates, approvals] = await getPublishedContent(project.id);

  return { project, updates, approvals };
}
