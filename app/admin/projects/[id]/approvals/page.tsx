import { notFound } from "next/navigation";
import { getAdminApprovals, getAdminProject } from "../../../../../db/adminData";
import { ApprovalsAdminBoard } from "./ApprovalsAdminBoard.tsx";
import { ProjectTabs } from "../ProjectTabs.tsx";
import { requireAdminSession } from "../../../session.ts";

export const dynamic = "force-dynamic";

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

  const approvals = await getAdminApprovals(project.id);

  return (
    <>
      <ProjectTabs current="approvals" projectId={project.id} />

      <section className="admin-section">
        <h1 className="admin-section-bar">
          {project.clientName}
          <span>{project.projectName}</span>
        </h1>
      </section>

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
    </>
  );
}
