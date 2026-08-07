"use client";

import type { LedgerLine } from "../../db/adminData";
import { NewClientFlow } from "./NewClientFlow";

function scoreClass(value: number | null) {
  if (value === null) return "is-score-empty";
  if (value >= 90) return "is-score-good";
  if (value >= 50) return "is-score-warn";
  return "is-score-bad";
}

function scoreValue(value: number | null) {
  return value === null ? "—" : value;
}

function averageScore(lines: LedgerLine[], key: "speed" | "reach" | "reliability" | "visibility") {
  const values = lines.map((line) => line.scores[key]).filter((value): value is number => value !== null);
  return values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : null;
}

export function ClientMatrix({
  lines,
  selectedClientId = null,
  onSelect,
}: {
  lines: LedgerLine[];
  selectedClientId?: number | null;
  onSelect?: (line: LedgerLine) => void;
}) {
  function selectLine(line: LedgerLine) {
    if (onSelect) {
      onSelect(line);
      return;
    }

    window.location.assign(`/admin?client=${encodeURIComponent(line.slug ?? String(line.clientId))}`);
  }

  return (
    <section className="admin-client-table-section" aria-labelledby="clients-title">
      <div className="admin-table-heading">
        <h2 id="clients-title">Clients <NewClientFlow /></h2>
        <span>Scores</span>
      </div>
      <table className="admin-table admin-client-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Phase</th>
            <th scope="col">Open Approvals</th>
            <th scope="col">Awaiting Reply</th>
            <th scope="col">Speed</th>
            <th scope="col">Reach</th>
            <th scope="col">Reliability</th>
            <th scope="col">Visibility</th>
            <th aria-label="Workspace" scope="col" />
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const isSelected = selectedClientId === line.clientId;

            return (
              <tr
                aria-selected={isSelected}
                className={isSelected ? "is-selected" : undefined}
                key={line.clientId}
                onClick={() => selectLine(line)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectLine(line);
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
          {lines.length > 0 ? (
            <tr className="admin-score-average">
              <td colSpan={4} />
              <td className={scoreClass(averageScore(lines, "speed"))}>{scoreValue(averageScore(lines, "speed"))}</td>
              <td className={scoreClass(averageScore(lines, "reach"))}>{scoreValue(averageScore(lines, "reach"))}</td>
              <td className={scoreClass(averageScore(lines, "reliability"))}>{scoreValue(averageScore(lines, "reliability"))}</td>
              <td className={scoreClass(averageScore(lines, "visibility"))}>{scoreValue(averageScore(lines, "visibility"))}</td>
              <td />
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
