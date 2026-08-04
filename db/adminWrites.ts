import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "./index";
import { portalPhases } from "./portalPhases";
import { portalApprovals, portalProjects, portalUpdates } from "./schema";

export type WriteResult<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

const UPDATE_STATUSES = ["in_progress", "completed"] as const;
const VISIBILITIES = ["draft", "published"] as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown) {
  const text = readString(value);

  return text.length > 0 ? text : null;
}

function fail(error: string, status = 400): WriteResult<never> {
  return { ok: false, error, status };
}

export async function projectExists(projectId: number) {
  const db = await getDb();
  const [project] = await db
    .select({ id: portalProjects.id })
    .from(portalProjects)
    .where(eq(portalProjects.id, projectId))
    .limit(1);

  return Boolean(project);
}

/* --------------------------------------------------------------- updates */

export type UpdateInput = {
  phase: string;
  title: string;
  body: string;
  status: (typeof UPDATE_STATUSES)[number];
  actionLabel: string | null;
  actionHref: string | null;
  publishedAt: string;
  visibility: (typeof VISIBILITIES)[number];
};

export function parseUpdateInput(payload: unknown): WriteResult<UpdateInput> {
  if (!payload || typeof payload !== "object") {
    return fail("body is required");
  }

  const raw = payload as Record<string, unknown>;
  const phase = readString(raw.phase);
  const title = readString(raw.title);
  const body = readString(raw.body);
  const status = readString(raw.status);
  const publishedAt = readString(raw.publishedAt);
  const visibility = readString(raw.visibility);
  const actionLabel = readOptionalString(raw.actionLabel);
  const actionHref = readOptionalString(raw.actionHref);

  if (!portalPhases.includes(phase)) {
    return fail("Phase is not one of the known phases.");
  }

  if (!title) {
    return fail("Title is required.");
  }

  if (!body) {
    return fail("Body is required.");
  }

  if (!UPDATE_STATUSES.includes(status as UpdateInput["status"])) {
    return fail("Status is invalid.");
  }

  if (!DATE_PATTERN.test(publishedAt)) {
    return fail("Published date must be a calendar date.");
  }

  if (!VISIBILITIES.includes(visibility as UpdateInput["visibility"])) {
    return fail("Visibility is invalid.");
  }

  // An action label with nowhere to go renders as a dead button in the portal,
  // which is exactly the defect this panel exists to stop.
  if ((actionLabel && !actionHref) || (actionHref && !actionLabel)) {
    return fail("An action needs both a label and a link, or neither.");
  }

  if (actionHref && !actionHref.startsWith("/") && !/^https?:\/\//.test(actionHref)) {
    return fail("Action link must be a site path or an http(s) URL.");
  }

  return {
    ok: true,
    value: {
      phase,
      title,
      body,
      status: status as UpdateInput["status"],
      actionLabel,
      actionHref,
      publishedAt,
      visibility: visibility as UpdateInput["visibility"],
    },
  };
}

export async function createUpdate(projectId: number, input: UpdateInput) {
  const db = await getDb();
  const [update] = await db
    .insert(portalUpdates)
    .values({ projectId, ...input })
    .returning();

  return update;
}

export async function updateUpdate(updateId: number, input: UpdateInput) {
  const db = await getDb();
  const [update] = await db
    .update(portalUpdates)
    .set(input)
    .where(and(eq(portalUpdates.id, updateId), isNull(portalUpdates.deletedAt)))
    .returning();

  return update ?? null;
}

export async function softDeleteUpdate(updateId: number) {
  const db = await getDb();
  const [update] = await db
    .update(portalUpdates)
    .set({ deletedAt: sql`CURRENT_TIMESTAMP::text` })
    .where(and(eq(portalUpdates.id, updateId), isNull(portalUpdates.deletedAt)))
    .returning({ id: portalUpdates.id });

  return update ?? null;
}

/* ------------------------------------------------------------- approvals */

export type ApprovalInput = {
  title: string;
  phase: string;
  note: string;
  previewLabel: string;
  previewHref: string;
  requestedBy: string;
  helpfulBy: string;
  visibility: (typeof VISIBILITIES)[number];
};

export function parseApprovalInput(payload: unknown): WriteResult<ApprovalInput> {
  if (!payload || typeof payload !== "object") {
    return fail("body is required");
  }

  const raw = payload as Record<string, unknown>;
  const title = readString(raw.title);
  const phase = readString(raw.phase);
  const note = readString(raw.note);
  const previewLabel = readString(raw.previewLabel) || "Preview";
  const previewHref = readString(raw.previewHref);
  const requestedBy = readString(raw.requestedBy);
  const helpfulBy = readString(raw.helpfulBy);
  const visibility = readString(raw.visibility);

  if (!title) {
    return fail("Title is required.");
  }

  if (!portalPhases.includes(phase)) {
    return fail("Phase is not one of the known phases.");
  }

  if (!note) {
    return fail("Tell the client what you want their eye on.");
  }

  if (!previewHref.startsWith("/") && !/^https?:\/\//.test(previewHref)) {
    return fail("Preview link must be a site path or an http(s) URL.");
  }

  if (!DATE_PATTERN.test(requestedBy) || !DATE_PATTERN.test(helpfulBy)) {
    return fail("Dates must be calendar dates.");
  }

  if (helpfulBy < requestedBy) {
    return fail("The helpful-by date cannot precede the request date.");
  }

  if (!VISIBILITIES.includes(visibility as ApprovalInput["visibility"])) {
    return fail("Visibility is invalid.");
  }

  return {
    ok: true,
    value: {
      title,
      phase,
      note,
      previewLabel,
      previewHref,
      requestedBy,
      helpfulBy,
      visibility: visibility as ApprovalInput["visibility"],
    },
  };
}

export async function createApproval(projectId: number, input: ApprovalInput) {
  const db = await getDb();
  const [approval] = await db
    .insert(portalApprovals)
    .values({ projectId, ...input })
    .returning();

  return approval;
}

export async function updateApproval(approvalId: number, input: ApprovalInput) {
  const db = await getDb();
  const [approval] = await db
    .update(portalApprovals)
    .set(input)
    .where(and(eq(portalApprovals.id, approvalId), isNull(portalApprovals.deletedAt)))
    .returning();

  return approval ?? null;
}

export async function softDeleteApproval(approvalId: number) {
  const db = await getDb();
  const [approval] = await db
    .update(portalApprovals)
    .set({ deletedAt: sql`CURRENT_TIMESTAMP::text` })
    .where(and(eq(portalApprovals.id, approvalId), isNull(portalApprovals.deletedAt)))
    .returning({ id: portalApprovals.id });

  return approval ?? null;
}

/**
 * Will gets exactly one reply per approval, so this refuses to overwrite an
 * existing one rather than silently replacing what the client already read.
 */
export async function replyToApproval(approvalId: number, reply: string) {
  const db = await getDb();
  const [approval] = await db
    .update(portalApprovals)
    .set({ responseReply: reply, repliedAt: sql`CURRENT_TIMESTAMP::text` })
    .where(and(
      eq(portalApprovals.id, approvalId),
      isNull(portalApprovals.deletedAt),
      isNull(portalApprovals.responseReply),
    ))
    .returning();

  return approval ?? null;
}
