"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { LedgerLine } from "../../db/adminData";
import { ProjectForm } from "./projects/[id]/ProjectForm";
import { ProjectTabs } from "./projects/[id]/ProjectTabs";

type AdminLine = LedgerLine;

function formatDate(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 10);
}

function formatCurrency(value: number) {
  return value ? `$${value.toLocaleString("en-US")}` : "—";
}

function scoreClass(value: number | null) {
  if (value === null) return "is-score-empty";
  if (value >= 90) return "is-score-good";
  if (value >= 50) return "is-score-warn";
  return "is-score-bad";
}

function scoreValue(value: number | null) {
  return value === null ? "—" : value;
}

export function AdminConsole({ initialLines }: { initialLines: AdminLine[] }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/admin";
  const searchParams = useSearchParams();
  const [lines, setLines] = useState(initialLines);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const querySelection = searchParams.get("client");
  const selected = useMemo(
    () => lines.find((line) => line.slug === querySelection || String(line.clientId) === querySelection) ?? null,
    [lines, querySelection],
  );

  function select(line: AdminLine) {
    const selection = line.slug ?? String(line.clientId);
    router.replace(`${pathname}?client=${encodeURIComponent(selection)}`, { scroll: false });
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
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        score?: { speedScore: number; reachScore: number; reliabilityScore: number; visibilityScore: number; updatedAt: string };
      } | null;

      if (!response.ok || !data?.score) {
        setRefreshError(data?.error ?? "Unable to refresh scores.");
        return;
      }

      setLines((current) =>
        current.map((line) =>
          line.projectId === selected.projectId
            ? {
                ...line,
                scores: {
                  speed: data.score!.speedScore,
                  reach: data.score!.reachScore,
                  reliability: data.score!.reliabilityScore,
                  visibility: data.score!.visibilityScore,
                  updatedAt: data.score!.updatedAt,
                },
              }
            : line,
        ),
      );
    } catch {
      setRefreshError("Unable to refresh scores.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="admin-console">
      <div className="admin-console-title">
        <h1 id="selected-client-title">{selected?.clientName ?? "Clients"}</h1>
      </div>
      <section className="admin-client-workspace" aria-labelledby="selected-client-title">
        {selected ? (
          <>
            <div className="admin-client-heading">
              <span>{selected.projectName ?? "No active project"}</span>
            </div>

            <div className="admin-client-meta">
              <dl>
                <div><dt>Client name</dt><dd>{selected.clientName}</dd></div>
                <div><dt>Project start</dt><dd>{formatDate(selected.projectStart)}</dd></div>
                <div><dt>Contract type</dt><dd>{selected.contractType}</dd></div>
                <div><dt>Contract amount</dt><dd>{formatCurrency(selected.contractAmount)}</dd></div>
                <div><dt>Payment status</dt><dd>{selected.paymentStatus}</dd></div>
                <div><dt>Development phase</dt><dd>{selected.currentPhase ?? "—"}</dd></div>
                <div><dt>Last edited</dt><dd>{formatDate(selected.updatedAt)}</dd></div>
                <div><dt>Account number</dt><dd>#{String(selected.clientId).padStart(4, "0")}</dd></div>
                <div><dt>Portal slug</dt><dd>{selected.slug ?? "—"}</dd></div>
              </dl>
            </div>

            {selected.projectId ? (
              <div className="admin-client-body">
                <ProjectForm
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
            ) : (
              <p className="admin-empty-state">This client has no active project.</p>
            )}

            {selected.projectId ? <ProjectTabs current="detail" projectId={selected.projectId} /> : null}

            <div className="admin-score-actions">
              <span>{selected.scores.updatedAt ? `Scores updated ${formatDate(selected.scores.updatedAt)}` : "Scores not yet available"}</span>
              <button className="admin-button" disabled={isRefreshing} onClick={refreshScore} type="button">
                {isRefreshing ? "Refreshing" : "Refresh scores"}
              </button>
              {refreshError ? <span className="admin-error-inline" role="alert">{refreshError}</span> : null}
            </div>
          </>
        ) : (
          <div className="admin-no-selection" role="status">
            <h1 id="selected-client-title">Select a client</h1>
            <p>Choose a client below to open its project workspace.</p>
          </div>
        )}
      </section>

      <section className="admin-client-table-section" aria-labelledby="clients-title">
        <div className="admin-table-heading">
          <h2 id="clients-title">Clients</h2>
          <span>Scores</span>
        </div>
        <table className="admin-table admin-client-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Phase</th>
              <th scope="col">Open approvals</th>
              <th scope="col">Awaiting reply</th>
              <th scope="col">Speed</th>
              <th scope="col">Reach</th>
              <th scope="col">Reliability</th>
              <th scope="col">Visibility</th>
              <th aria-label="Workspace" scope="col" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const isSelected = selected?.clientId === line.clientId;

              return (
                <tr
                  aria-selected={isSelected}
                  className={isSelected ? "is-selected" : undefined}
                  key={line.clientId}
                  onClick={() => select(line)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      select(line);
                    }
                  }}
                  tabIndex={0}
                >
                  <td data-label="Name">{line.clientName}</td>
                  <td data-label="Phase">{line.currentPhase ?? "—"}</td>
                  <td data-label="Open approvals">{line.openApprovals || "—"}</td>
                  <td data-label="Awaiting reply">{line.awaitingReply || "—"}</td>
                  <td className={scoreClass(line.scores.speed)} data-label="Speed">{scoreValue(line.scores.speed)}</td>
                  <td className={scoreClass(line.scores.reach)} data-label="Reach">{scoreValue(line.scores.reach)}</td>
                  <td className={scoreClass(line.scores.reliability)} data-label="Reliability">{scoreValue(line.scores.reliability)}</td>
                  <td className={scoreClass(line.scores.visibility)} data-label="Visibility">{scoreValue(line.scores.visibility)}</td>
                  <td aria-hidden="true" data-label="" />
                </tr>
              );
            })}
            {lines.length === 0 ? <tr className="admin-empty-row"><td colSpan={9}>No active clients on file.</td></tr> : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
