import { notFound } from "next/navigation";
import { getAdminProject, getAdminUpdates } from "../../../../../db/adminData";
import { ProjectTabs } from "../ProjectTabs.tsx";
import { UpdatesBoard } from "./UpdatesBoard.tsx";
import { requireAdminSession } from "../../../session.ts";

export const dynamic = "force-dynamic";

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

  return (
    <>
      <ProjectTabs current="updates" projectId={project.id} />

      <section className="admin-section">
        <h1 className="admin-section-bar">
          {project.clientName}
          <span>{project.projectName}</span>
        </h1>
      </section>

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
    </>
  );
}
