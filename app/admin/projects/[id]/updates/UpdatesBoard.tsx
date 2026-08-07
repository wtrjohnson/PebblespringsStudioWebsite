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
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function blankDraft(phase: string): Draft {
  return { phase, title: "", body: "", status: "completed", actionLabel: "", actionHref: "", publishedAt: today(), visibility: "draft" };
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
  const [editingId, setEditingId] = useState<number | null>(initialUpdates[0]?.id ?? null);
  const [draft, setDraft] = useState<Draft>(() => initialUpdates[0] ? toDraft(initialUpdates[0]) : blankDraft(currentPhase));
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
    const body = JSON.stringify({ ...draft, visibility, actionLabel: draft.actionLabel || null, actionHref: draft.actionHref || null });

    try {
      const response = await fetch(
        editingId ? `/api/admin/updates/${editingId}` : `/api/admin/projects/${projectId}/updates`,
        { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body },
      );
      const data = (await response.json().catch(() => null)) as { update?: AdminUpdate; error?: string } | null;

      if (!response.ok || !data?.update) {
        setError(data?.error ?? "Unable to save the update.");
        setIsSaving(false);
        return;
      }

      const saved = data.update;
      setUpdates((current) => editingId ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      startEdit(saved);
    } catch {
      setError("Unable to save the update.");
    }

    setIsSaving(false);
  }

  async function remove(update: AdminUpdate) {
    if (!window.confirm(`Remove "${update.title}" from the portal?`)) return;
    const response = await fetch(`/api/admin/updates/${update.id}`, { method: "DELETE" });
    if (response.ok) {
      setUpdates((current) => current.filter((item) => item.id !== update.id));
      if (editingId === update.id) startNew();
    } else {
      setError("Unable to remove the update.");
    }
  }

  const publishedCount = updates.filter((update) => update.visibility === "published").length;
  const timeline = updates.slice(0, 4);

  return (
    <>
      <div className="admin-updates-content">
        <div className="admin-updates-timeline" aria-label="Project update timeline">
          {timeline.map((update) => (
            <div
              className={`admin-update-timeline-item${editingId === update.id ? " is-current" : ""}`}
              key={update.id}
              onClick={() => startEdit(update)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); startEdit(update); } }}
              role="button"
              tabIndex={0}
            >
              <span className={`admin-update-dot${update.visibility === "draft" ? " is-draft" : ""}`} />
              <span className="admin-update-timeline-copy">
                <strong>{update.phase}</strong>
                <span className="admin-update-timeline-title">{update.title}</span>
                <span className="admin-update-item-controls" onClick={(event) => event.stopPropagation()}>
                  <b>{update.visibility === "published" ? "LIVE" : "DRAFT"}</b>
                  <button onClick={() => startEdit(update)} type="button">Edit</button>
                  <button onClick={() => void remove(update)} type="button">Delete</button>
                </span>
              </span>
            </div>
          ))}
          {updates.length > 4 ? <span className="admin-update-more">+{updates.length - 4}</span> : null}
        </div>

        <section className="admin-update-editor" aria-labelledby="update-editor-title">
          <h2 id="update-editor-title">{editingId ? `Edit Update #${editingId}` : "New Update"}</h2>
          <form className="admin-update-form" onSubmit={save}>
            <label className="admin-update-field admin-update-date">
              <span>Published Date</span>
              <input onChange={(event) => set("publishedAt", event.target.value)} required type="date" value={draft.publishedAt} />
            </label>
            <label className="admin-update-field admin-update-phase">
              <span>Phase</span>
              <select onChange={(event) => set("phase", event.target.value)} value={draft.phase}>
                {portalPhases.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
              </select>
            </label>
            <label className="admin-update-field admin-update-status">
              <span>Status</span>
              <select onChange={(event) => set("status", event.target.value as Draft["status"])} value={draft.status}>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
              </select>
            </label>
            <label className="admin-update-field admin-update-title-field">
              <span>Title</span>
              <input onChange={(event) => set("title", event.target.value)} required type="text" value={draft.title} />
            </label>
            <label className="admin-update-field admin-update-body-field">
              <span>Body</span>
              <textarea onChange={(event) => set("body", event.target.value)} required value={draft.body} />
            </label>
            <label className="admin-update-field admin-update-action-label">
              <span>Action Label</span>
              <input onChange={(event) => set("actionLabel", event.target.value)} placeholder="Review homepage design" type="text" value={draft.actionLabel} />
            </label>
            <label className="admin-update-field admin-update-action-link">
              <span>Action Link</span>
              <input onChange={(event) => set("actionHref", event.target.value)} placeholder="/portal/approvals" type="text" value={draft.actionHref} />
            </label>
            {error ? <p className="admin-error" role="alert">{error}</p> : null}
            <div className="admin-update-actions">
              <button disabled={isSaving} onClick={() => { intentRef.current = "draft"; }} type="submit">Save as draft</button>
              <button className="is-primary" disabled={isSaving} onClick={() => { intentRef.current = "published"; }} type="submit">{editingId ? "Save and publish" : "Publish"}</button>
              {editingId ? <button className="is-danger" onClick={() => { const update = updates.find((item) => item.id === editingId); if (update) void remove(update); }} type="button">Delete</button> : null}
              {editingId ? <button className="is-plain" onClick={startNew} type="button">New</button> : null}
            </div>
          </form>
        </section>

        <section className="admin-update-summary" aria-label="Update counts">
          <strong>{publishedCount}</strong>
          <span>Live</span>
          <strong>{updates.length - publishedCount}</strong>
          <span>Draft</span>
        </section>
      </div>

    </>
  );
}
