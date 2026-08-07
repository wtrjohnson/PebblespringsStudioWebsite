import { notFound } from "next/navigation";
import { getAdminProject, getAdminUpdates, getLedgerOverview } from "../../../../../db/adminData";
import { ProjectTabs } from "../ProjectTabs.tsx";
import { UpdatesBoard } from "./UpdatesBoard.tsx";
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

export default async function AdminProjectUpdatesPage({
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

  const updates = await getAdminUpdates(project.id);
  const overview = await getLedgerOverview();

  return (
    <div className="admin-console admin-updates-console">
      <div className="admin-console-title"><h1>{project.clientName}</h1></div>
      <section className="admin-updates-workspace" aria-labelledby="updates-workspace-title">
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
        <ProjectTabs current="updates" projectId={project.id} />
        <h2 className="sr-only" id="updates-workspace-title">Updates workspace</h2>
        <UpdatesBoard
          currentPhase={project.currentPhase}
          initialUpdates={updates.map((update) => ({
            id: update.id,
            phase: update.phase,
            title: update.title,
            body: update.body,
            status: update.status,
            actionLabel: update.actionLabel,
            actionHref: update.actionHref,
            visibility: update.visibility,
            publishedAt: update.publishedAt,
          }))}
          projectId={project.id}
        />
      </section>
      <ClientMatrix
        lines={overview.lines}
        selectedClientId={project.clientId}
      />
    </div>
  );
}
