export function ProjectTabs({
  projectId,
  current,
  onView,
}: {
  projectId: number;
  current: "detail" | "updates" | "approvals" | "preview";
  onView?: (view: "detail" | "updates" | "approvals" | "preview") => void;
}) {
  const tabs = [
    { key: "detail", label: "Details", href: `/admin/projects/${projectId}` },
    { key: "updates", label: "Updates", href: `/admin/projects/${projectId}/updates` },
    { key: "approvals", label: "Approvals", href: `/admin/projects/${projectId}/approvals` },
    { key: "preview", label: "View as Client", href: `/admin/projects/${projectId}/preview` },
  ] as const;

  return (
    <nav className="admin-nav" aria-label="Project sections">
      {tabs.map((tab) => (
        onView ? (
          <button aria-current={tab.key === current ? "page" : undefined} onClick={() => onView(tab.key)} key={tab.key} type="button">
            {tab.label}
          </button>
        ) : (
          <a aria-current={tab.key === current ? "page" : undefined} href={tab.href} key={tab.key}>
            {tab.label}
          </a>
        )
      ))}
    </nav>
  );
}
