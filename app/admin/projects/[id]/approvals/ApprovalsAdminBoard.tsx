"use client";

import { type FormEvent, useRef, useState } from "react";
import { portalPhases } from "../../../../../db/portalPhases";

export type AdminApproval = {
  id: number;
  title: string;
  phase: string;
  note: string;
  previewLabel: string;
  previewHref: string;
  requestedBy: string;
  helpfulBy: string;
  status: "needs_review" | "approved" | "changes_requested";
  visibility: "draft" | "published";
  respondedAt: string | null;
  responseNote: string | null;
  responseReply: string | null;
  repliedAt: string | null;
};

type Draft = {
  title: string;
  phase: string;
  note: string;
  previewLabel: string;
  previewHref: string;
  requestedBy: string;
  helpfulBy: string;
  visibility: "draft" | "published";
};

function today() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function addDays(days: number) {
  const now = new Date();
  now.setDate(now.getDate() + days);

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function blankDraft(phase: string): Draft {
  return {
    title: "",
    phase,
    note: "",
    previewLabel: "Preview",
    previewHref: "",
    requestedBy: today(),
    helpfulBy: addDays(3),
    visibility: "draft",
  };
}

function toDraft(approval: AdminApproval): Draft {
  return {
    title: approval.title,
    phase: approval.phase,
    note: approval.note,
    previewLabel: approval.previewLabel,
    previewHref: approval.previewHref,
    requestedBy: approval.requestedBy,
    helpfulBy: approval.helpfulBy,
    visibility: approval.visibility,
  };
}

const STATUS_LABELS: Record<AdminApproval["status"], string> = {
  needs_review: "Needs review",
  approved: "Approved",
  changes_requested: "Changes requested",
};

function ReplyForm({
  approval,
  onReplied,
}: {
  approval: AdminApproval;
  onReplied: (approval: AdminApproval) => void;
}) {
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/approvals/${approval.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply }),
      });
      const data = (await response.json().catch(() => null)) as
        | { approval?: AdminApproval; error?: string }
        | null;

      if (!response.ok || !data?.approval) {
        setError(data?.error ?? "Unable to save the reply.");
      } else {
        onReplied(data.approval);
      }
    } catch {
      setError("Unable to save the reply.");
    }

    setIsSaving(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="admin-field">
        <span>Your reply</span>
        <textarea
          onChange={(event) => setReply(event.target.value)}
          required
          value={reply}
        />
        <em>One reply per approval. The client sees it on their approvals page.</em>
      </label>

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-actions">
        <button className="is-primary" disabled={isSaving} type="submit">
          {isSaving ? "Sending" : "Send reply"}
        </button>
      </div>
    </form>
  );
}

export function ApprovalsAdminBoard({
  projectId,
  currentPhase,
  initialApprovals,
}: {
  projectId: number;
  currentPhase: string;
  initialApprovals: AdminApproval[];
}) {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [editingId, setEditingId] = useState<number | null>(() => initialApprovals[0]?.id ?? null);
  const [draft, setDraft] = useState<Draft>(() => initialApprovals[0] ? toDraft(initialApprovals[0]) : blankDraft(currentPhase));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const intentRef = useRef<Draft["visibility"]>("draft");

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function startNew() {
    setEditingId(null);
    setDraft(blankDraft(currentPhase));
    setError("");
  }

  function startEdit(approval: AdminApproval) {
    setEditingId(approval.id);
    setDraft(toDraft(approval));
    setError("");
  }

  function replaceApproval(saved: AdminApproval) {
    setApprovals((current) => current.map((item) => (item.id === saved.id ? saved : item)));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(
        editingId
          ? `/api/admin/approvals/${editingId}`
          : `/api/admin/projects/${projectId}/approvals`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...draft, visibility: intentRef.current }),
        },
      );
      const data = (await response.json().catch(() => null)) as
        | { approval?: AdminApproval; error?: string }
        | null;

      if (!response.ok || !data?.approval) {
        setError(data?.error ?? "Unable to save the approval.");
        setIsSaving(false);
        return;
      }

      const saved = data.approval;

      if (editingId) {
        replaceApproval(saved);
      } else {
        setApprovals((current) => [saved, ...current]);
      }

      startNew();
    } catch {
      setError("Unable to save the approval.");
    }

    setIsSaving(false);
  }

  async function remove(approval: AdminApproval) {
    const warning = approval.respondedAt
      ? `"${approval.title}" already has a client response. Remove it from the portal?`
      : `Remove "${approval.title}" from the portal?`;

    if (!window.confirm(warning)) {
      return;
    }

    const response = await fetch(`/api/admin/approvals/${approval.id}`, { method: "DELETE" });

    if (response.ok) {
      setApprovals((current) => current.filter((item) => item.id !== approval.id));

      if (editingId === approval.id) {
        startNew();
      }
    } else {
      setError("Unable to remove the approval.");
    }
  }

  const openCount = approvals.filter(
    (approval) => approval.visibility === "published" && approval.status === "needs_review",
  ).length;
  const responded = approvals.filter((approval) => approval.respondedAt);

  return (
    <div className="admin-approvals-board">
      <section className="admin-section admin-approvals-list" aria-labelledby="approvals-admin-title">
        <h2 className="admin-section-bar" id="approvals-admin-title">
          Approvals
          <span>{openCount} out for review</span>
        </h2>

        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">Requested</th>
              <th scope="col">Phase</th>
              <th scope="col">Title</th>
              <th scope="col">State</th>
              <th scope="col">Client</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {approvals.map((approval) => (
              <tr className={editingId === approval.id ? "is-selected" : undefined} key={approval.id}>
                <td className="admin-approval-marker" data-label="" aria-hidden="true">
                  <span className={approval.visibility === "draft" ? "is-draft" : undefined} />
                </td>
                <td className="is-numeric" data-label="Requested">
                  {approval.requestedBy}
                </td>
                <td data-label="Phase">{approval.phase}</td>
                <td data-label="Title">{approval.title}</td>
                <td data-label="State">
                  <span
                    className={`admin-flag ${
                      approval.visibility === "published" ? "is-done" : "is-draft"
                    }`}
                  >
                    {approval.visibility === "published" ? "Live" : "Draft"}
                  </span>
                </td>
                <td data-label="Client">
                  <span
                    className={`admin-flag ${
                      approval.status === "approved"
                        ? "is-done"
                        : approval.status === "needs_review"
                          ? ""
                          : "is-open"
                    }`}
                  >
                    {STATUS_LABELS[approval.status]}
                  </span>
                </td>
                <td data-label="">
                  <button className="is-plain" onClick={() => startEdit(approval)} type="button">
                    Edit
                  </button>{" "}
                  <button className="is-plain" onClick={() => remove(approval)} type="button">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {approvals.length === 0 ? (
              <tr className="admin-empty-row">
                <td colSpan={7}>No approvals on this project yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="admin-section admin-approvals-responses" aria-labelledby="responses-title">
        <h2 className="admin-section-bar" id="responses-title">
          Client Responses
          <span>{responded.length} on file</span>
        </h2>

        {responded.map((approval) => (
          <div key={approval.id}>
            <p className="admin-subbar">
              {approval.title} — {STATUS_LABELS[approval.status]}
              {approval.respondedAt ? ` on ${approval.respondedAt.slice(0, 10)}` : ""}
            </p>

            {approval.responseNote ? (
              <p className="admin-quote">{approval.responseNote}</p>
            ) : (
              <p className="admin-note">No note left with this response.</p>
            )}

            {approval.responseReply ? (
              <>
                <p className="admin-note">
                  Your reply{approval.repliedAt ? ` — ${approval.repliedAt.slice(0, 10)}` : ""}
                </p>
                <p className="admin-quote">{approval.responseReply}</p>
              </>
            ) : (
              <ReplyForm approval={approval} onReplied={replaceApproval} />
            )}
          </div>
        ))}

        {responded.length === 0 ? (
          <p className="admin-note">Nothing has come back from the client yet.</p>
        ) : null}
      </section>

      <section className="admin-section admin-approvals-editor" aria-labelledby="approval-editor-title">
        <h2 className="admin-section-bar" id="approval-editor-title">
          {editingId ? `Edit Approval #${editingId}` : "New Approval Request"}
          <span>{editingId ? "Existing entry" : "Unsaved"}</span>
        </h2>

        <form className="admin-form" onSubmit={save}>
          <div className="admin-field-row">
            <label className="admin-field">
              <span>Requested on</span>
              <input
                onChange={(event) => set("requestedBy", event.target.value)}
                required
                type="date"
                value={draft.requestedBy}
              />
            </label>

            <label className="admin-field">
              <span>Helpful by</span>
              <input
                onChange={(event) => set("helpfulBy", event.target.value)}
                required
                type="date"
                value={draft.helpfulBy}
              />
            </label>

            <label className="admin-field">
              <span>Phase</span>
              <select onChange={(event) => set("phase", event.target.value)} value={draft.phase}>
                {portalPhases.map((phase) => (
                  <option key={phase} value={phase}>
                    {phase}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="admin-field">
            <span>Title</span>
            <input
              onChange={(event) => set("title", event.target.value)}
              required
              type="text"
              value={draft.title}
            />
          </label>

          <label className="admin-field">
            <span>What you want their eye on</span>
            <textarea
              onChange={(event) => set("note", event.target.value)}
              required
              value={draft.note}
            />
          </label>

          <div className="admin-field-row">
            <label className="admin-field">
              <span>Preview label</span>
              <input
                onChange={(event) => set("previewLabel", event.target.value)}
                type="text"
                value={draft.previewLabel}
              />
            </label>

            <label className="admin-field">
              <span>Preview link</span>
              <input
                onChange={(event) => set("previewHref", event.target.value)}
                placeholder="https://preview.example.com"
                required
                type="text"
                value={draft.previewHref}
              />
              <em>Where the client actually goes to look at the work.</em>
            </label>
          </div>

          {error ? (
            <p className="admin-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="admin-actions">
            <button
              disabled={isSaving}
              onClick={() => {
                intentRef.current = "draft";
              }}
              type="submit"
            >
              Save as draft
            </button>
            <button
              className="is-primary"
              disabled={isSaving}
              onClick={() => {
                intentRef.current = "published";
              }}
              type="submit"
            >
              {editingId ? "Save and send" : "Send to client"}
            </button>
            {editingId ? (
              <button className="is-plain" onClick={startNew} type="button">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
