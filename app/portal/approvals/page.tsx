"use client";

import { ApprovalsBoard } from "./ApprovalsBoard.tsx";
import { PortalHeader } from "../PortalHeader.tsx";
import { PortalNotice } from "../PortalNotice.tsx";
import { usePortalData } from "../usePortalData.ts";

export default function PortalApprovalsPage() {
  const state = usePortalData();

  return (
    <main className="portal-page portal-approvals-page">
      <PortalHeader current="/portal/approvals" />
      <PortalNotice state={state} />

      {state.status === "ready" ? (
        <ApprovalsBoard
          approvals={state.data.approvals}
          clientName={state.data.project.clientName}
        />
      ) : null}
    </main>
  );
}
