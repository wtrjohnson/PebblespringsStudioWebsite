"use client";

import { usePathname } from "next/navigation";

// Client and user management land in a later build; until they exist there is
// nothing else to navigate to, and a link to a missing page is the exact defect
// this panel was built to stop shipping.
const NAV_ITEMS = [{ href: "/admin", label: "Ledger", exact: true }];

export function AdminSignOutButton() {
  async function signOut() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  return (
    <button className="is-plain" type="button" onClick={signOut}>
      Sign out
    </button>
  );
}

export function AdminNav() {
  const pathname = usePathname() ?? "/admin";

  return (
    <nav className="admin-nav" aria-label="Admin navigation">
      {NAV_ITEMS.map((item) => {
        const isCurrent = item.exact ? pathname === item.href : pathname.startsWith(item.href);

        return (
          <a aria-current={isCurrent ? "page" : undefined} href={item.href} key={item.href}>
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
