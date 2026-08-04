"use client";

import { type FormEvent, useState } from "react";

type PortalApprovalResponse = {
  id: number;
  status: "needs_review" | "approved" | "changes_requested";
  respondedAt: string | null;
  responseNote: string | null;
};

export function ApprovalActions({
  approvalId,
  initialStatus,
  previewHref,
  previewLabel,
  onStatusChange,
  readOnly = false,
}: {
  approvalId: number;
  initialStatus: "needs_review" | "approved" | "changes_requested";
  previewHref: string;
  previewLabel: string;
  onStatusChange?: (
    status: "approved" | "changes_requested",
    approval: PortalApprovalResponse,
  ) => void;
  /** Admin preview: the client's controls are shown but inert. */
  readOnly?: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [isWritingNote, setIsWritingNote] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const isApproved = status === "approved";

  async function updateApproval(
    nextStatus: "approved" | "changes_requested",
    responseNote?: string,
  ) {
    setIsSaving(true);
    setError("");

    const response = await fetch(`/api/portal/approvals/${approvalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, responseNote }),
    });

    if (response.ok) {
      const data = (await response.json()) as { approval: PortalApprovalResponse };
      setStatus(nextStatus);
      setIsWritingNote(false);
      onStatusChange?.(nextStatus, data.approval);
    } else {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong. Try again.");
    }

    setIsSaving(false);
  }

  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateApproval("changes_requested", note.trim());
  }

  // Asking for changes without saying which changes leaves Will guessing, so
  // the note is part of the action rather than a follow-up email.
  if (isWritingNote) {
    return (
      <form className="portal-change-form" onSubmit={submitNote}>
        <label>
          <span>What would you like changed?</span>
          <textarea
            autoFocus
            onChange={(event) => setNote(event.target.value)}
            placeholder="The headline feels a little formal — could we try something warmer?"
            required
            value={note}
          />
        </label>

        {error ? <p className="portal-change-error">{error}</p> : null}

        <div className="portal-change-actions">
          <button disabled={isSaving || note.trim().length === 0} type="submit">
            {isSaving ? "Sending" : "Send to Will"}
          </button>
          <button
            className="is-secondary"
            disabled={isSaving}
            onClick={() => setIsWritingNote(false)}
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="portal-approval-actions">
      <a href={previewHref}>{previewLabel}</a>
      <button
        className={`portal-approve-button${isApproved ? " is-approved" : ""}`}
        disabled={readOnly || isSaving || isApproved}
        type="button"
        onClick={() => updateApproval("approved")}
        aria-live="polite"
      >
        <span className="portal-checkmark" aria-hidden="true" />
        <span>{isApproved ? "Approved" : isSaving ? "Saving" : "Approve"}</span>
      </button>
      <button
        className="is-secondary"
        disabled={readOnly || isSaving || isApproved}
        type="button"
        onClick={() => setIsWritingNote(true)}
      >
        {status === "changes_requested" ? "Changes requested" : "Request changes"}
      </button>
      {error ? <p className="portal-change-error">{error}</p> : null}
    </div>
  );
}
