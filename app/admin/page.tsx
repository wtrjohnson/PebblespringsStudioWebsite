import { getLedgerOverview, STALE_UPDATE_DAYS } from "../../db/adminData";
import { requireAdminSession } from "./session.ts";

export const dynamic = "force-dynamic";

function formatDays(days: number | null) {
  if (days === null) {
    return "—";
  }

  return days === 0 ? "today" : `${days}d`;
}

export default async function AdminLedgerPage() {
  await requireAdminSession();
  const { lines, awaitingClient, awaitingReply, staleProjects, totals } =
    await getLedgerOverview();

  return (
    <>
      <section className="admin-section" aria-labelledby="ledger-title">
        <h1 className="admin-section-bar" id="ledger-title">
          Account Ledger
          <span>All active accounts</span>
        </h1>

        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Client</th>
              <th scope="col">Project</th>
              <th scope="col">Phase</th>
              <th className="is-numeric" scope="col">Open</th>
              <th className="is-numeric" scope="col">Reply</th>
              <th className="is-numeric" scope="col">Drafts</th>
              <th className="is-numeric" scope="col">Last update</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.clientId}>
                <td data-label="Client">{line.clientName}</td>
                <td data-label="Project">
                  {line.projectName ?? <span className="is-quiet">No active project</span>}
                </td>
                <td data-label="Phase">{line.currentPhase ?? "—"}</td>
                <td className="is-numeric" data-label="Open">
                  {line.openApprovals || "—"}
                </td>
                <td className="is-numeric" data-label="Reply">
                  {line.awaitingReply || "—"}
                </td>
                <td className="is-numeric" data-label="Drafts">
                  {line.drafts || "—"}
                </td>
                <td className="is-numeric" data-label="Last update">
                  {formatDays(line.daysSincePublished)}
                </td>
                <td data-label="">
                  {line.projectId ? (
                    <a href={`/admin/projects/${line.projectId}`}>Open &rsaquo;</a>
                  ) : (
                    <span className="is-quiet">—</span>
                  )}
                </td>
              </tr>
            ))}
            {lines.length === 0 ? (
              <tr className="admin-empty-row">
                <td colSpan={8}>No active clients on file.</td>
              </tr>
            ) : (
              <tr className="is-total">
                <td data-label="Total">{totals.clients} clients</td>
                <td data-label="" />
                <td data-label="" />
                <td className="is-numeric" data-label="Open">
                  {totals.openApprovals}
                </td>
                <td className="is-numeric" data-label="Reply">
                  {totals.awaitingReply}
                </td>
                <td className="is-numeric" data-label="Drafts">
                  {totals.drafts}
                </td>
                <td className="is-numeric" data-label="" />
                <td data-label="" />
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="admin-section" aria-labelledby="attention-title">
        <h2 className="admin-section-bar" id="attention-title">
          Requires Attention
          <span>
            {awaitingReply.length + staleProjects.length} item
            {awaitingReply.length + staleProjects.length === 1 ? "" : "s"}
          </span>
        </h2>

        <p className="admin-subbar">Client responded — awaiting your reply</p>
        <table className="admin-table">
          <tbody>
            {awaitingReply.map((item) => (
              <tr key={item.approvalId}>
                <td data-label="Client">{item.clientName}</td>
                <td data-label="Item">{item.title}</td>
                <td className="is-numeric" data-label="Waiting">
                  {formatDays(item.days)}
                </td>
                <td data-label="">
                  <a href={`/admin/projects/${item.projectId}/approvals`}>Reply &rsaquo;</a>
                </td>
              </tr>
            ))}
            {awaitingReply.length === 0 ? (
              <tr className="admin-empty-row">
                <td colSpan={4}>Nothing waiting on you.</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <p className="admin-subbar">Sent to client — awaiting their decision</p>
        <table className="admin-table">
          <tbody>
            {awaitingClient.map((item) => (
              <tr key={item.approvalId}>
                <td data-label="Client">{item.clientName}</td>
                <td data-label="Item">{item.title}</td>
                <td className="is-numeric" data-label="Waiting">
                  {formatDays(item.days)}
                </td>
                <td data-label="">
                  <a href={`/admin/projects/${item.projectId}/approvals`}>View &rsaquo;</a>
                </td>
              </tr>
            ))}
            {awaitingClient.length === 0 ? (
              <tr className="admin-empty-row">
                <td colSpan={4}>No approvals out for review.</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <p className="admin-subbar">Quiet for {STALE_UPDATE_DAYS}+ days</p>
        <table className="admin-table">
          <tbody>
            {staleProjects.map((line) => (
              <tr key={line.clientId}>
                <td data-label="Client">{line.clientName}</td>
                <td data-label="Project">{line.projectName}</td>
                <td className="is-numeric" data-label="Since update">
                  {line.lastPublishedAt ? formatDays(line.daysSincePublished) : "never"}
                </td>
                <td data-label="">
                  <a href={`/admin/projects/${line.projectId}/updates`}>Post &rsaquo;</a>
                </td>
              </tr>
            ))}
            {staleProjects.length === 0 ? (
              <tr className="admin-empty-row">
                <td colSpan={4}>Every project has a recent update.</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <dl className="admin-summary">
          <div className="admin-summary-cell">
            <dt>Open approvals</dt>
            <dd>{totals.openApprovals}</dd>
          </div>
          <div className="admin-summary-cell">
            <dt>Awaiting reply</dt>
            <dd>{totals.awaitingReply}</dd>
          </div>
          <div className="admin-summary-cell">
            <dt>Unpublished drafts</dt>
            <dd>{totals.drafts}</dd>
          </div>
          <div className="admin-summary-cell">
            <dt>Active clients</dt>
            <dd>{totals.clients}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
