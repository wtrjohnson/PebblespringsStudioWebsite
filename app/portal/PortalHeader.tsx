"use client";

// "Billing" lived here pointing at /portal and went nowhere. It comes back when
// there is a billing page to point at.
const LINKS = [
  { href: "/portal", label: "Overview" },
  { href: "/portal/updates", label: "Updates" },
  { href: "/portal/approvals", label: "Approvals" },
];

export function PortalHeader({ current }: { current: string }) {
  return (
    <header className="portal-header" aria-label="Client portal header">
      <a className="portal-brand" href="/portal" aria-label="Pebblesprings client portal">
        <img src="/PSLogo.png" alt="" />
        <span>Project Overview</span>
      </a>

      <nav className="portal-nav" aria-label="Client portal navigation">
        {LINKS.map((link) => (
          <a
            aria-current={link.href === current ? "page" : undefined}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
