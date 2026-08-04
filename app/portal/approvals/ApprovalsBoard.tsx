"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ApprovalActions } from "./ApprovalActions.tsx";
import { formatPortalDate, type PortalApproval } from "../usePortalData.ts";

type ApprovalStatus = "needs_review" | "approved" | "changes_requested";

type ApprovalItem = PortalApproval;

type ApprovalUpdate = {
  id: number;
  status: ApprovalStatus;
  respondedAt: string | null;
  responseNote: string | null;
};

export function ApprovalsBoard({
  approvals,
  clientName,
  readOnly = false,
}: {
  approvals: ApprovalItem[];
  clientName: string;
  /** Set by the admin preview: show the client's controls, but do not let Will act as them. */
  readOnly?: boolean;
}) {
  const [items, setItems] = useState(approvals);
  const [collapsingIds, setCollapsingIds] = useState<number[]>([]);
  const timersRef = useRef<number[]>([]);
  const openApprovals = useMemo(
    () => items.filter((approval) => approval.status === "needs_review"),
    [items],
  );
  const closedApprovals = useMemo(
    () => items.filter((approval) => approval.status !== "needs_review"),
    [items],
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  function moveApprovalToClosed(nextStatus: "approved" | "changes_requested", approval: ApprovalUpdate) {
    const checkDelay = nextStatus === "approved" ? 780 : 0;
    const collapseDuration = 260;

    const collapseTimer = window.setTimeout(() => {
      setCollapsingIds((current) => current.includes(approval.id) ? current : [...current, approval.id]);

      const moveTimer = window.setTimeout(() => {
        setItems((current) =>
          current.map((item) =>
            item.id === approval.id
              ? {
                  ...item,
                  status: approval.status,
                  respondedAt: approval.respondedAt,
                  responseNote: approval.responseNote,
                }
              : item,
          ),
        );
        setCollapsingIds((current) => current.filter((id) => id !== approval.id));
      }, collapseDuration);

      timersRef.current.push(moveTimer);
    }, checkDelay);

    timersRef.current.push(collapseTimer);
  }

  return (
    <section className="portal-approvals" aria-labelledby="approvals-title">
      <div className="portal-approvals-heading">
        <div>
          <p>{clientName}</p>
          <h1 id="approvals-title">Approvals</h1>
        </div>
        <span>{openApprovals.length} open</span>
      </div>

      {openApprovals.length > 0 ? (
        <section className="portal-open-review" aria-labelledby="open-review-title">
          <h2 id="open-review-title">Open for Review</h2>

          {openApprovals.map((approval) => (
            <article
              className={`portal-approval-card${collapsingIds.includes(approval.id) ? " is-collapsing" : ""}`}
              key={approval.id}
            >
              <div className="portal-approval-preview" aria-label={approval.previewLabel}>
                <div className="portal-preview-window">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="portal-preview-lines" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              </div>

              <div className="portal-approval-copy">
                <div className="portal-approval-meta">
                  <span>{approval.phase}</span>
                  <span>Posted {formatPortalDate(approval.requestedBy)}</span>
                  <strong>Needs review</strong>
                </div>

                <h3>{approval.title}</h3>
                <p>{approval.note}</p>

                <div className="portal-approval-footer">
                  <span>Helpful by {formatPortalDate(approval.helpfulBy)}</span>
                  <ApprovalActions
                    readOnly={readOnly}
                    approvalId={approval.id}
                    initialStatus={approval.status}
                    previewHref={approval.previewHref}
                    previewLabel={approval.previewLabel}
                    onStatusChange={moveApprovalToClosed}
                  />
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <section className="portal-approved-list" aria-labelledby="approved-title">
        <h2 id="approved-title">Decided</h2>
        <div>
          {closedApprovals.map((item) => (
            <article className="portal-approved-row" key={item.id}>
              <div className="portal-approved-head">
                <p>{item.title}</p>
                <span>
                  {item.status === "approved" ? "Approved" : "Changes requested"}{" "}
                  {item.respondedAt ? formatPortalDate(item.respondedAt.slice(0, 10)) : ""}
                </span>
              </div>

              {item.responseNote ? (
                <p className="portal-approved-note">
                  <strong>You wrote:</strong> {item.responseNote}
                </p>
              ) : null}

              {item.responseReply ? (
                <p className="portal-approved-reply">
                  <strong>Will replied:</strong> {item.responseReply}
                </p>
              ) : null}
            </article>
          ))}
          {closedApprovals.length === 0 ? (
            <article className="portal-approved-row">
              <div className="portal-approved-head">
                <p>No completed approvals yet</p>
                <span>Pending review</span>
              </div>
            </article>
          ) : null}
        </div>
      </section>
    </section>
  );
}
