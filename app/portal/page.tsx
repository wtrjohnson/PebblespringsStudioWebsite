"use client";

import { PortalHeader } from "./PortalHeader.tsx";
import { PortalNotice } from "./PortalNotice.tsx";
import { PortalOverview } from "./PortalOverview.tsx";
import { usePortalData } from "./usePortalData.ts";

export default function PortalPage() {
  const state = usePortalData();

  return (
    <main className="portal-page">
      <PortalHeader current="/portal" />
      <PortalNotice state={state} />

      {state.status === "ready" ? <PortalOverview data={state.data} /> : null}
    </main>
  );
}
