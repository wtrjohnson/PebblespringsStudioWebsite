"use client";

import { type FormEvent, useRef, useState } from "react";
import { portalPhases } from "../../../../../db/portalPhases";

export type AdminUpdate = {
  id: number;
  phase: string;
  title: string;
  body: string;
  status: "in_progress" | "completed";
  actionLabel: string | null;
  actionHref: string | null;
  visibility: "draft" | "published";
  publishedAt: string;
};

type Draft = {
  phase: string;
  title: string;
  body: string;
  status: "in_progress" | "completed";
  actionLabel: string;
  actionHref: string;
  publishedAt: string;
  visibility: "draft" | "published";
};

function today() {
  const now = new Date();

  // Local calendar day, not UTC — publishedAt is what the client reads as "when
  // Will posted this", so it should match the day Will is actually having.
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function blankDraft(phase: string): Draft {
  return {
    phase,
    title: "",
    body: "",
    status: "completed",
    actionLabel: "",
    actionHref: "",
    publishedAt: today(),
    visibility: "draft",
  };
}

function toDraft(update: AdminUpdate): Draft {
  return {
    phase: update.phase,
    title: update.title,
    body: update.body,
    status: update.status,
    actionLabel: update.actionLabel ?? "",
    actionHref: update.actionHref ?? "",
    publishedAt: update.publishedAt,
    visibility: update.visibility,
  };
}

export function UpdatesBoard({
  projectId,
  currentPhase,
  initialUpdates,
}: {
  projectId: number;
  currentPhase: string;
  initialUpdates: AdminUpdate[];
}) {
  const [updates, setUpdates] = useState(initialUpdates);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(() => blankDraft(currentPhase));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // Which button was pressed. A state value set in onClick would not be visible
  // to the submit handler firing in the same event, so this rides a ref.
  const intentRef = useRef<Draft["visibility"]>("draft");

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function startNew() {
    setEditingId(null);
    setDraft(blankDraft(currentPhase));
    setError("");
  }

  function startEdit(update: AdminUpdate) {
    setEditingId(update.id);
    setDraft(toDraft(update));
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const visibility = intentRef.current;
    setIsSaving(true);
    setError("");

    const body = JSON.stringify({
      ...draft,
      visibility,
      actionLabel: draft.actionLabel || null,
      actionHref: draft.actionHref || null,
    });

    try {
      const response = await fetch(
        editingId ? `/api/admin/updates/${editingId}` : `/api/admin/projects/${projectId}/updates`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body,
        },
      );
      const data = (await response.json().catch(() => null)) as
        | { update?: AdminUpdate; error?: string }
        | null;

      if (!response.ok || !data?.update) {
        setError(data?.error ?? "Unable to save the update.");
        setIsSaving(false);
        return;
      }

      const saved = data.update;
      setUpdates((current) =>
        editingId
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      startNew();
    } catch {
      setError("Unable to save the update.");
    }

    setIsSaving(false);
  }

  async function remove(update: AdminUpdate) {
    if (!window.confirm(`Remove "${update.title}" from the portal?`)) {
      return;
    }

    const response = await fetch(`/api/admin/updates/${update.id}`, { method: "DELETE" });

    if (response.ok) {
      setUpdates((current) => current.filter((item) => item.id !== update.id));

      if (editingId === update.id) {
        startNew();
      }
    } else {
      setError("Unable to remove the update.");
    }
  }

  const publishedCount = updates.filter((update) => update.visibility === "published").length;

  return (
    <>
      <section className="admin-section" aria-labelledby="updates-title">
        <h2 className="admin-section-bar" id="updates-title">
          Updates
          <span>
            {publishedCount} live / {updates.length - publishedCount} draft
          </span>
        </h2>

        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Phase</th>
              <th scope="col">Title</th>
              <th scope="col">State</th>
              <th scope="col" />
            </tr>
          </thead>
          <tbody>
            {updates.map((update) => (
              <tr key={update.id}>
                <td className="is-numeric" data-label="Date">
                  {update.publishedAt}
                </td>
                <td data-label="Phase">{update.phase}</td>
                <td data-label="Title">{update.title}</td>
                <td data-label="State">
                  <span
                    className={`admin-flag ${
                      update.visibility === "published" ? "is-done" : "is-draft"
                    }`}
                  >
                    {update.visibility === "published" ? "Live" : "Draft"}
                  </span>
                </td>
                <td data-label="">
                  <button className="is-plain" onClick={() => startEdit(update)} type="button">
                    Edit
                  </button>{" "}
                  <button className="is-plain" onClick={() => remove(update)} type="button">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {updates.length === 0 ? (
              <tr className="admin-empty-row">
                <td colSpan={5}>No updates on this project yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="admin-section" aria-labelledby="update-editor-title">
        <h2 className="admin-section-bar" id="update-editor-title">
          {editingId ? `Edit Update #${editingId}` : "New Update"}
          <span>{editingId ? "Existing entry" : "Unsaved"}</span>
        </h2>

        <form className="admin-form" onSubmit={save}>
          <div className="admin-field-row">
            <label className="admin-field">
              <span>Published date</span>
              <input
                onChange={(event) => set("publishedAt", event.target.value)}
                required
                type="date"
                value={draft.publishedAt}
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

            <label className="admin-field">
              <span>Phase state</span>
              <select
                onChange={(event) => set("status", event.target.value as Draft["status"])}
                value={draft.status}
              >
                <option value="completed">Completed</option>
                <option value="in_progress">In progress</option>
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
            <span>Body</span>
            <textarea
              onChange={(event) => set("body", event.target.value)}
              required
              value={draft.body}
            />
            <em>Leave a blank line between paragraphs. They render as separate paragraphs.</em>
          </label>

          <div className="admin-field-row">
            <label className="admin-field">
              <span>Action label</span>
              <input
                onChange={(event) => set("actionLabel", event.target.value)}
                placeholder="Review homepage design"
                type="text"
                value={draft.actionLabel}
              />
            </label>

            <label className="admin-field">
              <span>Action link</span>
              <input
                onChange={(event) => set("actionHref", event.target.value)}
                placeholder="/portal/approvals"
                type="text"
                value={draft.actionHref}
              />
              <em>Both or neither — a label with no link is a dead button.</em>
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
              {editingId ? "Save and publish" : "Publish"}
            </button>
            {editingId ? (
              <button className="is-plain" onClick={startNew} type="button">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </>
  );
}
