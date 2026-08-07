import { notFound } from "next/navigation";
import { getAdminApprovals, getAdminProject, getLedgerOverview } from "../../../../../db/adminData";
import { ApprovalsAdminBoard } from "./ApprovalsAdminBoard.tsx";
import { ProjectTabs } from "../ProjectTabs.tsx";
import { ClientMatrix } from "../../../ClientMatrix";
import { requireAdminSession } from "../../../session.ts";

export const dynamic = "force-dynamic";

function formatLongDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? value.slice(0, 10)
    : new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(parsed);
}

export default async function AdminProjectApprovalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();

  const projectId = Number((await params).id);

  if (!Number.isInteger(projectId) || projectId < 1) {
    notFound();
  }

  const project = await getAdminProject(projectId);

  if (!project) {
    notFound();
  }

  const [approvals, overview] = await Promise.all([
    getAdminApprovals(project.id),
    getLedgerOverview(),
  ]);

  return (
    <div className="admin-console admin-approvals-console">
      <div className="admin-console-title"><h1>{project.clientName}</h1></div>
      <section className="admin-approvals-workspace" aria-labelledby="approvals-workspace-title">
        <div className="admin-client-heading"><span>{project.projectName}</span></div>
        <div className="admin-client-meta">
          <dl className="admin-meta-column">
            <div><dt>Client Name</dt><dd>{project.clientName}</dd></div>
            <div><dt>Project Start</dt><dd>{formatLongDate(project.projectStart)}</dd></div>
            <div><dt>Contract Type</dt><dd>{project.contractType}</dd></div>
          </dl>
          <dl className="admin-meta-column">
            <div><dt>Contract Amount</dt><dd>{project.contractAmount ? `$${project.contractAmount.toLocaleString("en-US")}` : "—"}</dd></div>
            <div><dt>Payment Status</dt><dd>{project.paymentStatus.toUpperCase()}</dd></div>
            <div><dt>Account Number</dt><dd>#{String(project.clientId).padStart(4, "0")}</dd></div>
          </dl>
          <dl className="admin-meta-column">
            <div><dt>Development Phase</dt><dd>{project.currentPhase}</dd></div>
            <div><dt>Last Edited</dt><dd>{formatLongDate(project.updatedAt)}</dd></div>
            <div><dt>Portal Slug</dt><dd>{project.slug}</dd></div>
          </dl>
        </div>
        <ProjectTabs current="approvals" projectId={project.id} />
        <h2 className="sr-only" id="approvals-workspace-title">Approvals workspace</h2>
        <ApprovalsAdminBoard
        currentPhase={project.currentPhase}
        initialApprovals={approvals.map((approval) => ({
          id: approval.id,
          title: approval.title,
          phase: approval.phase,
          note: approval.note,
          previewLabel: approval.previewLabel,
          previewHref: approval.previewHref,
          requestedBy: approval.requestedBy,
          helpfulBy: approval.helpfulBy,
          status: approval.status,
          visibility: approval.visibility,
          respondedAt: approval.respondedAt,
          responseNote: approval.responseNote,
          responseReply: approval.responseReply,
          repliedAt: approval.repliedAt,
        }))}
        projectId={project.id}
        />
      </section>
      <ClientMatrix lines={overview.lines} selectedClientId={project.clientId} />
    </div>
  );
}
