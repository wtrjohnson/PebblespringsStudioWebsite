import { notFound } from "next/navigation";
import { getAdminProject } from "../../../../../db/adminData";
import { getPortalDataForProject } from "../../../../../db/portal";
import { ApprovalsBoard } from "../../../../portal/approvals/ApprovalsBoard.tsx";
import { PortalHeader } from "../../../../portal/PortalHeader.tsx";
import { PortalOverview } from "../../../../portal/PortalOverview.tsx";
import { ProjectTabs } from "../ProjectTabs.tsx";
import { UpdatesJournal } from "../../../../portal/UpdatesJournal.tsx";
import { requireAdminSession } from "../../../session.ts";

export const dynamic = "force-dynamic";

/**
 * Renders the real portal components against the same published-only query the
 * client's own portal uses, so what shows here is what they get — drafts and
 * removed items included by their absence.
 */
export default async function AdminProjectPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();

  const projectId = Number((await params).id);

  if (!Number.isInteger(projectId) || projectId < 1) {
    notFound();
  }

  const [project, data] = await Promise.all([
    getAdminProject(projectId),
    getPortalDataForProject(projectId),
  ]);

  if (!project || !data) {
    notFound();
  }

  const portalData = {
    project: {
      clientName: data.project.clientName,
      projectName: data.project.projectName,
      currentPhase: data.project.currentPhase,
      nextUp: data.project.nextUp,
    },
    updates: data.updates.map((update) => ({
      id: update.id,
      phase: update.phase,
      title: update.title,
      body: update.body,
      status: update.status,
      actionLabel: update.actionLabel,
      actionHref: update.actionHref,
      publishedAt: update.publishedAt,
    })),
    approvals: data.approvals.map((approval) => ({
      id: approval.id,
      title: approval.title,
      phase: approval.phase,
      note: approval.note,
      previewLabel: approval.previewLabel,
      previewHref: approval.previewHref,
      requestedBy: approval.requestedBy,
      helpfulBy: approval.helpfulBy,
      status: approval.status,
      respondedAt: approval.respondedAt,
      responseNote: approval.responseNote,
      responseReply: approval.responseReply,
    })),
  };

  return (
    <>
      <ProjectTabs current="preview" projectId={project.id} />

      <section className="admin-section">
        <h1 className="admin-section-bar">
          Client View — {project.clientName}
          <span>Published content only, controls inert</span>
        </h1>
        <dl className="admin-kv">
          <dt>Updates live</dt>
          <dd>{portalData.updates.length}</dd>
          <dt>Approvals live</dt>
          <dd>{portalData.approvals.length}</dd>
        </dl>
      </section>

      <div className="admin-preview-frame">
        <main className="portal-page">
          <PortalHeader current="/portal" />
          <PortalOverview data={portalData} />
        </main>

        <main className="portal-page portal-updates-page">
          <UpdatesJournal data={portalData} />
        </main>

        <main className="portal-page portal-approvals-page">
          <ApprovalsBoard
            approvals={portalData.approvals}
            clientName={portalData.project.clientName}
            readOnly
          />
        </main>
      </div>
    </>
  );
}
