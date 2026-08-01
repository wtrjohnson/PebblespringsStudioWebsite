import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { portalApprovals, portalProjects, portalUpdates } from "./schema";

export const portalPhases = ["Discovery", "Design", "Build", "Launch", "Live"];

export type PortalApproval = typeof portalApprovals.$inferSelect;
export type PortalProject = typeof portalProjects.$inferSelect;
export type PortalUpdate = typeof portalUpdates.$inferSelect;

export type PortalData = {
  project: PortalProject;
  approvals: PortalApproval[];
  updates: PortalUpdate[];
};

export const fallbackPortalData: PortalData = {
  project: {
    id: 1,
    clientId: 1,
    slug: "furrow-strategies",
    clientName: "Furrow Strategies",
    projectName: "Furrow Strategies",
    currentPhase: "Design",
    nextUp:
      "After homepage approval, I'll design the services page and start preparing the preview.",
    createdAt: "2026-07-22 00:00:00",
    updatedAt: "2026-07-31 00:00:00",
  },
  approvals: [
    {
      id: 1,
      projectId: 1,
      title: "Homepage design",
      phase: "Design",
      note:
        "I'd love your eye on the overall direction: headline tone, page flow, and whether this feels like Furrow.",
      previewLabel: "Homepage preview",
      previewHref: "/portal",
      requestedBy: "2026-07-31",
      helpfulBy: "2026-08-02",
      status: "needs_review",
      respondedAt: null,
      createdAt: "2026-07-31 00:00:00",
    },
  ],
  updates: [
    {
      id: 1,
      projectId: 1,
      phase: "Design",
      title: "Homepage design is ready",
      body:
        "I finished the first pass of the homepage and tightened the opening message around your core services. The main thing I'd love your eye on is whether the tone feels like you.",
      status: "in_progress",
      actionLabel: "Review homepage design",
      actionHref: "/portal/approvals",
      publishedAt: "2026-07-31",
      createdAt: "2026-07-31 00:00:00",
    },
    {
      id: 2,
      projectId: 1,
      phase: "Design",
      title: "The first direction is coming together",
      body:
        "I pulled the visual references into a calmer design direction: direct headlines, confident spacing, and a little more editorial rhythm than the current site. The goal is to make Furrow feel sharp without making it feel cold.",
      status: "in_progress",
      actionLabel: null,
      actionHref: null,
      publishedAt: "2026-07-29",
      createdAt: "2026-07-29 00:00:00",
    },
    {
      id: 3,
      projectId: 1,
      phase: "Discovery",
      title: "Direction is set",
      body:
        "Thanks for sending the examples and notes. The strongest thread is clarity: fewer claims, stronger hierarchy, and more confidence in the core offer. I'll use that as the foundation for the first homepage pass.",
      status: "completed",
      actionLabel: null,
      actionHref: null,
      publishedAt: "2026-07-26",
      createdAt: "2026-07-26 00:00:00",
    },
    {
      id: 4,
      projectId: 1,
      phase: "Discovery",
      title: "Kickoff notes are in place",
      body:
        "I organized the kickoff notes and marked the biggest decisions: the site should feel more established, the services need to be easier to scan, and the homepage should lead with the problem Furrow helps clients solve.",
      status: "completed",
      actionLabel: "View kickoff notes",
      actionHref: "/portal",
      publishedAt: "2026-07-22",
      createdAt: "2026-07-22 00:00:00",
    },
  ],
};

export function formatPortalDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export async function getPortalDataForClient(clientId: number) {
  try {
    const db = await getDb();
    const [project] = await db
      .select()
      .from(portalProjects)
      .where(eq(portalProjects.clientId, clientId))
      .orderBy(asc(portalProjects.id))
      .limit(1);

    if (!project) {
      return fallbackPortalData;
    }

    const [updates, approvals] = await Promise.all([
      db
        .select()
        .from(portalUpdates)
        .where(eq(portalUpdates.projectId, project.id))
        .orderBy(desc(portalUpdates.publishedAt), desc(portalUpdates.id)),
      db
        .select()
        .from(portalApprovals)
        .where(eq(portalApprovals.projectId, project.id))
        .orderBy(asc(portalApprovals.status), desc(portalApprovals.createdAt)),
    ]);

    return { project, updates, approvals };
  } catch {
    return fallbackPortalData;
  }
}
