import { notFound } from "next/navigation";
import { getAdminProject } from "../../../../db/adminData";
import { ProjectForm } from "./ProjectForm.tsx";
import { ProjectTabs } from "./ProjectTabs.tsx";
import { requireAdminSession } from "../../session.ts";

export const dynamic = "force-dynamic";

export default async function AdminProjectPage({
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

  return (
    <>
      <ProjectTabs current="detail" projectId={project.id} />

      <section className="admin-section" aria-labelledby="project-title">
        <h1 className="admin-section-bar" id="project-title">
          {project.clientName}
          <span>Account #{String(project.clientId).padStart(4, "0")}</span>
        </h1>

        <dl className="admin-kv">
          <dt>Client</dt>
          <dd>{project.clientName}</dd>
          <dt>Portal slug</dt>
          <dd>{project.slug}</dd>
          <dt>Phase</dt>
          <dd>{project.currentPhase}</dd>
          <dt>Last edited</dt>
          <dd>{project.updatedAt.slice(0, 10)}</dd>
        </dl>
      </section>

      <section className="admin-section" aria-labelledby="project-edit-title">
        <h2 className="admin-section-bar" id="project-edit-title">
          Edit Project
          <span>Saves immediately to the portal</span>
        </h2>

        <ProjectForm
          initial={{
            projectName: project.projectName,
            slug: project.slug,
            siteUrl: project.siteUrl,
            projectStart: project.projectStart ?? "",
            contractAmount: project.contractAmount,
            contractType: project.contractType,
            paymentStatus: project.paymentStatus,
            currentPhase: project.currentPhase,
            nextUp: project.nextUp,
            status: project.status,
          }}
          projectId={project.id}
        />
      </section>
    </>
  );
}
