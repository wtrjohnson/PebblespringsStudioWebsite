import type { Metadata } from "next";
import { AdminNav, AdminSignOutButton } from "./AdminChrome.tsx";
import { getAdminSession } from "./session.ts";
import "../admin.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pebblesprings Studio — Ledger",
  robots: { index: false, follow: false },
};

function formatStamp() {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Chrome only — this layout is deliberately not the authorization boundary.
 * /admin/login renders inside it while signed out, so every other page calls
 * requireAdminSession() for itself.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  return (
    <div className="admin-root">
      <header className="admin-masthead">
        <div className="admin-masthead-inner">
          <span className="admin-mark">
            <img src="/PSLogo.png" alt="" />
            Pebblesprings — Studio Ledger
          </span>
          <div className="admin-masthead-meta">
            <span>{formatStamp()}</span>
            {session ? (
              <>
                <span>{session.email}</span>
                <AdminSignOutButton />
              </>
            ) : null}
          </div>
        </div>
      </header>

      {session ? <AdminNav /> : null}

      <div className="admin-shell">{children}</div>
    </div>
  );
}
