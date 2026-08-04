export function ProjectTabs({
  projectId,
  current,
}: {
  projectId: number;
  current: "detail" | "updates" | "approvals" | "preview";
}) {
  const tabs = [
    { key: "detail", label: "Detail", href: `/admin/projects/${projectId}` },
    { key: "updates", label: "Updates", href: `/admin/projects/${projectId}/updates` },
    { key: "approvals", label: "Approvals", href: `/admin/projects/${projectId}/approvals` },
    { key: "preview", label: "View as client", href: `/admin/projects/${projectId}/preview` },
  ] as const;

  return (
    <nav className="admin-nav" aria-label="Project sections">
      {tabs.map((tab) => (
        <a aria-current={tab.key === current ? "page" : undefined} href={tab.href} key={tab.key}>
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
