import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "./index";
import { portalApprovals, portalClients, portalProjects, portalUpdates } from "./schema";

export const STALE_UPDATE_DAYS = 14;

export type LedgerLine = {
  clientId: number;
  clientName: string;
  projectId: number | null;
  projectName: string | null;
  currentPhase: string | null;
  openApprovals: number;
  awaitingReply: number;
  drafts: number;
  lastPublishedAt: string | null;
  daysSincePublished: number | null;
};

export type AttentionItem = {
  projectId: number;
  clientName: string;
  approvalId: number;
  title: string;
  days: number;
  note?: string | null;
};

export type LedgerOverview = {
  lines: LedgerLine[];
  awaitingClient: AttentionItem[];
  awaitingReply: AttentionItem[];
  staleProjects: LedgerLine[];
  totals: {
    clients: number;
    openApprovals: number;
    awaitingReply: number;
    drafts: number;
  };
};

/**
 * Dates in this schema are stored as text in two shapes: plain `YYYY-MM-DD`
 * (publishedAt, requestedBy) and full timestamps (createdAt, respondedAt).
 * Taking the leading 10 characters normalizes both to a calendar day.
 */
export function daysSince(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(`${value.slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(parsed)) {
    return null;
  }

  const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);

  return Math.max(0, Math.round((today - parsed) / 86_400_000));
}

/**
 * Admin reads deliberately include drafts — that is the whole point of the
 * panel — but never soft-deleted rows.
 */
export async function getAdminProject(projectId: number) {
  const db = await getDb();
  const [project] = await db
    .select({
      id: portalProjects.id,
      clientId: portalProjects.clientId,
      clientName: portalClients.name,
      projectName: portalProjects.projectName,
      slug: portalProjects.slug,
      currentPhase: portalProjects.currentPhase,
      nextUp: portalProjects.nextUp,
      status: portalProjects.status,
      updatedAt: portalProjects.updatedAt,
    })
    .from(portalProjects)
    .innerJoin(portalClients, eq(portalClients.id, portalProjects.clientId))
    .where(eq(portalProjects.id, projectId))
    .limit(1);

  return project ?? null;
}

export async function getAdminUpdates(projectId: number) {
  const db = await getDb();

  return db
    .select()
    .from(portalUpdates)
    .where(and(eq(portalUpdates.projectId, projectId), isNull(portalUpdates.deletedAt)))
    .orderBy(desc(portalUpdates.publishedAt), desc(portalUpdates.id));
}

export async function getAdminApprovals(projectId: number) {
  const db = await getDb();

  return db
    .select()
    .from(portalApprovals)
    .where(and(eq(portalApprovals.projectId, projectId), isNull(portalApprovals.deletedAt)))
    .orderBy(desc(portalApprovals.createdAt), desc(portalApprovals.id));
}

export async function getLedgerOverview(): Promise<LedgerOverview> {
  const db = await getDb();

  // The studio runs a handful of clients, so three flat reads and an in-memory
  // join stay well clear of anything worth optimizing — and keep the shaping
  // logic readable.
  const [clientRows, approvalRows, updateRows] = await Promise.all([
    db
      .select({
        clientId: portalClients.id,
        clientName: portalClients.name,
        projectId: portalProjects.id,
        projectName: portalProjects.projectName,
        currentPhase: portalProjects.currentPhase,
      })
      .from(portalClients)
      .leftJoin(
        portalProjects,
        and(eq(portalProjects.clientId, portalClients.id), eq(portalProjects.status, "active")),
      )
      .where(eq(portalClients.status, "active"))
      .orderBy(asc(portalClients.name)),
    db
      .select({
        id: portalApprovals.id,
        projectId: portalApprovals.projectId,
        title: portalApprovals.title,
        status: portalApprovals.status,
        visibility: portalApprovals.visibility,
        requestedBy: portalApprovals.requestedBy,
        respondedAt: portalApprovals.respondedAt,
        responseNote: portalApprovals.responseNote,
        responseReply: portalApprovals.responseReply,
      })
      .from(portalApprovals)
      .where(isNull(portalApprovals.deletedAt)),
    db
      .select({
        projectId: portalUpdates.projectId,
        visibility: portalUpdates.visibility,
        publishedAt: portalUpdates.publishedAt,
      })
      .from(portalUpdates)
      .where(isNull(portalUpdates.deletedAt)),
  ]);

  const clientNameByProject = new Map<number, string>();

  for (const row of clientRows) {
    if (row.projectId) {
      clientNameByProject.set(row.projectId, row.clientName);
    }
  }

  const awaitingClient: AttentionItem[] = [];
  const awaitingReply: AttentionItem[] = [];

  for (const approval of approvalRows) {
    const clientName = clientNameByProject.get(approval.projectId);

    if (!clientName || approval.visibility !== "published") {
      continue;
    }

    if (approval.status === "needs_review") {
      awaitingClient.push({
        projectId: approval.projectId,
        clientName,
        approvalId: approval.id,
        title: approval.title,
        days: daysSince(approval.requestedBy) ?? 0,
      });
      continue;
    }

    // Responded, but Will has not used his one reply yet.
    if (approval.respondedAt && !approval.responseReply) {
      awaitingReply.push({
        projectId: approval.projectId,
        clientName,
        approvalId: approval.id,
        title: approval.title,
        days: daysSince(approval.respondedAt) ?? 0,
        note: approval.responseNote,
      });
    }
  }

  awaitingClient.sort((a, b) => b.days - a.days);
  awaitingReply.sort((a, b) => b.days - a.days);

  const lines: LedgerLine[] = clientRows.map((row) => {
    const projectId = row.projectId;
    const projectApprovals = projectId
      ? approvalRows.filter((approval) => approval.projectId === projectId)
      : [];
    const projectUpdates = projectId
      ? updateRows.filter((update) => update.projectId === projectId)
      : [];
    const published = projectUpdates
      .filter((update) => update.visibility === "published")
      .map((update) => update.publishedAt)
      .sort();
    const lastPublishedAt = published.length > 0 ? published[published.length - 1] : null;

    return {
      clientId: row.clientId,
      clientName: row.clientName,
      projectId,
      projectName: row.projectName,
      currentPhase: row.currentPhase,
      openApprovals: projectApprovals.filter(
        (approval) => approval.visibility === "published" && approval.status === "needs_review",
      ).length,
      awaitingReply: projectApprovals.filter(
        (approval) =>
          approval.visibility === "published" && approval.respondedAt && !approval.responseReply,
      ).length,
      drafts:
        projectApprovals.filter((approval) => approval.visibility === "draft").length +
        projectUpdates.filter((update) => update.visibility === "draft").length,
      lastPublishedAt,
      daysSincePublished: daysSince(lastPublishedAt),
    };
  });

  return {
    lines,
    awaitingClient,
    awaitingReply,
    staleProjects: lines.filter(
      (line) =>
        line.projectId !== null &&
        (line.daysSincePublished === null || line.daysSincePublished >= STALE_UPDATE_DAYS),
    ),
    totals: {
      clients: lines.length,
      openApprovals: lines.reduce((sum, line) => sum + line.openApprovals, 0),
      awaitingReply: lines.reduce((sum, line) => sum + line.awaitingReply, 0),
      drafts: lines.reduce((sum, line) => sum + line.drafts, 0),
    },
  };
}
