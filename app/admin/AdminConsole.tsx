"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LedgerLine } from "../../db/adminData";
import { ClientMatrix } from "./ClientMatrix";
import { ProjectForm } from "./projects/[id]/ProjectForm";
import { ProjectTabs } from "./projects/[id]/ProjectTabs";
import { UpdatesBoard, type AdminUpdate } from "./projects/[id]/updates/UpdatesBoard";
import { ApprovalsAdminBoard, type AdminApproval } from "./projects/[id]/approvals/ApprovalsAdminBoard";

type AdminLine = LedgerLine;
type AdminView = "detail" | "updates" | "approvals" | "preview";

function formatDate(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 10);
}

function formatLongDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? value.slice(0, 10)
    : new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(parsed);
}

function formatCurrency(value: number) {
  return value ? `$${value.toLocaleString("en-US")}` : "—";
}

function ClientMeta({ line }: { line: AdminLine }) {
  return (
    <div className="admin-client-meta">
      <dl className="admin-meta-column">
        <div><dt>Client Name</dt><dd>{line.clientName}</dd></div>
        <div><dt>Project Start</dt><dd>{formatLongDate(line.projectStart)}</dd></div>
        <div><dt>Contract Type</dt><dd>{line.contractType}</dd></div>
      </dl>
      <dl className="admin-meta-column">
        <div><dt>Contract Amount</dt><dd>{formatCurrency(line.contractAmount)}</dd></div>
        <div><dt>Payment Status</dt><dd>{line.paymentStatus.toUpperCase()}</dd></div>
        <div><dt>Account Number</dt><dd>#{String(line.clientId).padStart(4, "0")}</dd></div>
      </dl>
      <dl className="admin-meta-column">
        <div><dt>Development Phase</dt><dd>{line.currentPhase ?? "—"}</dd></div>
        <div><dt>Last Edited</dt><dd>{formatLongDate(line.updatedAt)}</dd></div>
        <div><dt>Portal Slug</dt><dd>{line.slug ?? "—"}</dd></div>
      </dl>
    </div>
  );
}

export function AdminConsole({ initialLines }: { initialLines: AdminLine[] }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/admin";
  const searchParams = useSearchParams();
  const [lines, setLines] = useState(initialLines);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const [updates, setUpdates] = useState<AdminUpdate[] | null>(null);
  const [approvals, setApprovals] = useState<AdminApproval[] | null>(null);
  const [loadedView, setLoadedView] = useState<{ projectId: number; view: "updates" | "approvals" } | null>(null);
  const [viewError, setViewError] = useState("");
  const querySelection = searchParams.get("client");
  const requestedView = searchParams.get("view");
  const view: AdminView = requestedView === "updates" || requestedView === "approvals" || requestedView === "preview" ? requestedView : "detail";
  const selected = useMemo(
    () => lines.find((line) => line.slug === querySelection || String(line.clientId) === querySelection) ?? null,
    [lines, querySelection],
  );

  useEffect(() => {
    if (!selected?.projectId || (view !== "updates" && view !== "approvals")) return;
    if (loadedView?.projectId === selected.projectId && loadedView.view === view) return;

    const projectId = selected.projectId;
    const controller = new AbortController();

    fetch(`/api/admin/projects/${projectId}/${view}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => null) as { updates?: AdminUpdate[]; approvals?: AdminApproval[]; error?: string } | null;
        if (!response.ok) throw new Error(data?.error ?? "Unable to load this view.");
        if (view === "updates") setUpdates(data?.updates ?? []);
        if (view === "approvals") setApprovals(data?.approvals ?? []);
        setLoadedView({ projectId, view });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setViewError(error.message);
      })

    return () => controller.abort();
  }, [loadedView, selected?.projectId, view]);

  function select(line: AdminLine) {
    const selection = line.slug ?? String(line.clientId);
    setViewError("");
    router.replace(`${pathname}?client=${encodeURIComponent(selection)}&view=detail`, { scroll: false });
  }

  function selectView(nextView: AdminView) {
    if (!selected) return;
    const selection = selected.slug ?? String(selected.clientId);
    setViewError("");
    router.replace(`${pathname}?client=${encodeURIComponent(selection)}&view=${nextView}`, { scroll: false });
  }

  async function refreshScore() {
    if (!selected?.projectId) return;
    setIsRefreshing(true);
    setRefreshError("");

    try {
      const response = await fetch("/api/admin/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selected.projectId }),
      });
      const data = await response.json().catch(() => null) as {
        error?: string;
        score?: { speedScore: number; reachScore: number; reliabilityScore: number; visibilityScore: number; updatedAt: string };
      } | null;

      if (!response.ok || !data?.score) {
        setRefreshError(data?.error ?? "Unable to refresh scores.");
        return;
      }

      setLines((current) => current.map((line) => line.projectId === selected.projectId ? {
        ...line,
        scores: {
          speed: data.score!.speedScore,
          reach: data.score!.reachScore,
          reliability: data.score!.reliabilityScore,
          visibility: data.score!.visibilityScore,
          updatedAt: data.score!.updatedAt,
        },
      } : line));
    } catch {
      setRefreshError("Unable to refresh scores.");
    } finally {
      setIsRefreshing(false);
    }
  }

  function renderDetails() {
    if (!selected) return null;
    return (
      <section className="admin-client-workspace" aria-labelledby="selected-client-title">
        <div className="admin-client-heading"><span>{selected.projectName ?? "No active project"}</span></div>
        <ClientMeta line={selected} />
        {selected.projectId ? (
          <div className="admin-client-body">
            <ProjectForm
              key={selected.projectId}
              compact
              initial={{
                projectName: selected.projectName ?? "",
                slug: selected.slug ?? "",
                siteUrl: selected.siteUrl,
                projectStart: selected.projectStart ?? "",
                contractAmount: selected.contractAmount,
                contractType: selected.contractType,
                paymentStatus: selected.paymentStatus,
                currentPhase: selected.currentPhase ?? "",
                nextUp: selected.nextUp,
                status: selected.status,
              }}
              projectId={selected.projectId}
            />
          </div>
        ) : <p className="admin-empty-state">This client has no active project.</p>}
        {selected.projectId ? <ProjectTabs current="detail" projectId={selected.projectId} onView={selectView} /> : null}
        <div className="admin-score-actions">
          <span>{selected.scores.updatedAt ? `Scores updated ${formatDate(selected.scores.updatedAt)}` : "Scores not yet available"}</span>
          <button className="admin-button" disabled={isRefreshing} onClick={refreshScore} type="button">{isRefreshing ? "Refreshing" : "Refresh scores"}</button>
          {refreshError ? <span className="admin-error-inline" role="alert">{refreshError}</span> : null}
        </div>
      </section>
    );
  }

  function renderView() {
    if (!selected?.projectId || view === "detail") return renderDetails();
    if (view === "preview") {
      return (
        <section className="admin-preview-workspace" aria-label="Client preview">
          <ClientMeta line={selected} />
          <ProjectTabs current="preview" projectId={selected.projectId} onView={selectView} />
          <iframe className="admin-inline-preview" src={`/admin/projects/${selected.projectId}/preview`} title={`Client preview for ${selected.clientName}`} />
        </section>
      );
    }

    const loaded = loadedView?.projectId === selected.projectId && loadedView.view === view;
    const isLoadingView = !loaded && !viewError;
    return view === "updates" ? (
      <section className="admin-updates-workspace admin-inline-view-workspace" aria-label="Updates">
        <div className="admin-client-heading"><span>{selected.projectName}</span></div>
        <ClientMeta line={selected} />
        <ProjectTabs current="updates" projectId={selected.projectId} onView={selectView} />
        {isLoadingView && !loaded ? <div className="admin-view-loading">Loading updates…</div> : null}
        {viewError && !loaded ? <p className="admin-error admin-view-error">{viewError}</p> : null}
        {loaded ? <UpdatesBoard projectId={selected.projectId} currentPhase={selected.currentPhase ?? "Discovery"} initialUpdates={updates ?? []} /> : null}
      </section>
    ) : (
      <section className="admin-approvals-workspace admin-inline-view-workspace" aria-label="Approvals">
        <div className="admin-client-heading"><span>{selected.projectName}</span></div>
        <ClientMeta line={selected} />
        <ProjectTabs current="approvals" projectId={selected.projectId} onView={selectView} />
        {isLoadingView && !loaded ? <div className="admin-view-loading">Loading approvals…</div> : null}
        {viewError && !loaded ? <p className="admin-error admin-view-error">{viewError}</p> : null}
        {loaded ? <ApprovalsAdminBoard projectId={selected.projectId} currentPhase={selected.currentPhase ?? "Discovery"} initialApprovals={approvals ?? []} /> : null}
      </section>
    );
  }

  return (
    <div className={`admin-console${selected ? "" : " is-no-selection"}`}>
      {selected ? <div className="admin-console-title"><h1 id="selected-client-title">{selected.clientName}</h1></div> : <div className="admin-no-client-title"><h1>Select a Client</h1></div>}
      {selected ? renderView() : null}
      <ClientMatrix lines={lines} onSelect={select} selectedClientId={selected?.clientId ?? null} />
    </div>
  );
}
