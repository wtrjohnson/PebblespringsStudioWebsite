"use client";

import { PortalHeader } from "../PortalHeader.tsx";
import { PortalNotice } from "../PortalNotice.tsx";
import { UpdatesJournal } from "../UpdatesJournal.tsx";
import { usePortalData } from "../usePortalData.ts";

export default function PortalUpdatesPage() {
  const state = usePortalData();

  return (
    <main className="portal-page portal-updates-page">
      <PortalHeader current="/portal/updates" />
      <PortalNotice state={state} />

      {state.status === "ready" ? <UpdatesJournal data={state.data} /> : null}
    </main>
  );
}
