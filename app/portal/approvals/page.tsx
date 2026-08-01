"use client";

import { useEffect, useState } from "react";
import { ApprovalsBoard } from "./ApprovalsBoard.tsx";

type ApprovalStatus = "needs_review" | "approved" | "changes_requested";

type PortalApproval = {
  id: number;
  title: string;
  phase: string;
  note: string;
  previewLabel: string;
  previewHref: string;
  requestedBy: string;
  helpfulBy: string;
  status: ApprovalStatus;
  respondedAt: string | null;
};

type PortalData = {
  project: {
    clientName: string;
  };
  approvals: PortalApproval[];
};

export default function PortalApprovalsPage() {
  const [data, setData] = useState<PortalData | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPortalData() {
      const response = await fetch("/api/portal/data", { cache: "no-store" });

      if (response.status === 401) {
        window.location.assign("/portal/login");
        return;
      }

      if (!response.ok) {
        return;
      }

      const nextData = (await response.json()) as PortalData;

      if (isMounted) {
        setData(nextData);
      }
    }

    loadPortalData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="portal-page portal-approvals-page">
      <header className="portal-header" aria-label="Client portal header">
        <a className="portal-brand" href="/portal" aria-label="Pebblesprings client portal">
          <img src="/PSLogo.png" alt="" />
          <span>Project Overview</span>
        </a>

        <nav className="portal-nav" aria-label="Client portal navigation">
          <a href="/portal">Overview</a>
          <a href="/portal/updates">Updates</a>
          <a aria-current="page" href="/portal/approvals">
            Approvals
          </a>
          <a href="/portal">Billing</a>
        </nav>
      </header>

      {data ? (
        <ApprovalsBoard approvals={data.approvals} clientName={data.project.clientName} />
      ) : null}
    </main>
  );
}
