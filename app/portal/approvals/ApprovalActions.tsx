"use client";

import { useState } from "react";

type PortalApprovalResponse = {
  id: number;
  status: "needs_review" | "approved" | "changes_requested";
  respondedAt: string | null;
};

export function ApprovalActions({
  approvalId,
  initialStatus,
  previewHref,
  onStatusChange,
}: {
  approvalId: number;
  initialStatus: "needs_review" | "approved" | "changes_requested";
  previewHref: string;
  onStatusChange?: (status: "approved" | "changes_requested", approval: PortalApprovalResponse) => void;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isSaving, setIsSaving] = useState(false);

  const isApproved = status === "approved";

  async function updateApproval(nextStatus: "approved" | "changes_requested") {
    setIsSaving(true);
    const response = await fetch(`/api/portal/approvals/${approvalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (response.ok) {
      const data = (await response.json()) as { approval: PortalApprovalResponse };
      setStatus(nextStatus);
      onStatusChange?.(nextStatus, data.approval);
    }

    setIsSaving(false);
  }

  return (
    <div className="portal-approval-actions">
      <a href={previewHref}>View preview</a>
      <button
        className={`portal-approve-button${isApproved ? " is-approved" : ""}`}
        disabled={isSaving || isApproved}
        type="button"
        onClick={() => updateApproval("approved")}
        aria-live="polite"
      >
        <span className="portal-checkmark" aria-hidden="true" />
        <span>{isApproved ? "Approved" : isSaving ? "Saving" : "Approve"}</span>
      </button>
      <button
        className="is-secondary"
        disabled={isSaving || isApproved}
        type="button"
        onClick={() => updateApproval("changes_requested")}
      >
        {status === "changes_requested" ? "Changes requested" : "Request changes"}
      </button>
    </div>
  );
}
