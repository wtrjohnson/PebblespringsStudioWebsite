"use client";

import { type FormEvent, useState } from "react";
import { portalPhases } from "../../../../db/portalPhases";

type ProjectFields = {
  projectName: string;
  slug: string;
  siteUrl: string;
  projectStart: string;
  contractAmount: number;
  contractType: string;
  paymentStatus: "pending" | "partial" | "complete";
  currentPhase: string;
  nextUp: string;
  status: "active" | "completed" | "archived";
};

export function ProjectForm({
  projectId,
  initial,
  compact = false,
}: {
  projectId: number;
  initial: ProjectFields;
  compact?: boolean;
}) {
  const [fields, setFields] = useState(initial);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function set<K extends keyof ProjectFields>(key: K, value: ProjectFields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    setSavedAt("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (response.ok) {
        setSavedAt(new Date().toLocaleTimeString());
      } else {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Unable to save.");
      }
    } catch {
      setError("Unable to save.");
    }

    setIsSaving(false);
  }

  return (
    <form className={`admin-form${compact ? " admin-compact-form" : ""}`} onSubmit={handleSubmit}>
      {compact ? (
        <>
          <div className="admin-compact-fields">
            <label className="admin-field">
              <span>Project name</span>
              <input onChange={(event) => set("projectName", event.target.value)} required type="text" value={fields.projectName} />
            </label>
            <label className="admin-field">
              <span>Slug</span>
              <input onChange={(event) => set("slug", event.target.value)} pattern="[a-z0-9-]+" required type="text" value={fields.slug} />
            </label>
            <label className="admin-field">
              <span>Phase</span>
              <select onChange={(event) => set("currentPhase", event.target.value)} value={fields.currentPhase}>
                {portalPhases.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
              </select>
            </label>
            <label className="admin-field">
              <span>Project status</span>
              <select onChange={(event) => set("status", event.target.value as ProjectFields["status"])} value={fields.status}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
          <label className="admin-compact-next-up">
            <span>Next up</span>
            <textarea onChange={(event) => set("nextUp", event.target.value)} value={fields.nextUp} />
          </label>
        </>
      ) : null}

      {!compact ? <>
      <div className="admin-field-row">
        <label className="admin-field">
          <span>Project name</span>
          <input
            onChange={(event) => set("projectName", event.target.value)}
            required
            type="text"
            value={fields.projectName}
          />
        </label>

        <label className="admin-field">
          <span>Slug</span>
          <input
            onChange={(event) => set("slug", event.target.value)}
            pattern="[a-z0-9-]+"
            required
            type="text"
            value={fields.slug}
          />
          <em>Lowercase letters, numbers, hyphens.</em>
        </label>

        <label className="admin-field">
          <span>Website URL</span>
          <input
            onChange={(event) => set("siteUrl", event.target.value)}
            placeholder="https://example.com"
            type="url"
            value={fields.siteUrl}
          />
        </label>
      </div>

      <div className="admin-field-row">
        <label className="admin-field">
          <span>Project start</span>
          <input onChange={(event) => set("projectStart", event.target.value)} type="date" value={fields.projectStart} />
        </label>

        <label className="admin-field">
          <span>Contract amount</span>
          <input
            min="0"
            onChange={(event) => set("contractAmount", Number(event.target.value))}
            type="number"
            value={fields.contractAmount}
          />
        </label>

        <label className="admin-field">
          <span>Contract type</span>
          <input onChange={(event) => set("contractType", event.target.value)} required type="text" value={fields.contractType} />
        </label>

        <label className="admin-field">
          <span>Payment status</span>
          <select onChange={(event) => set("paymentStatus", event.target.value as ProjectFields["paymentStatus"])} value={fields.paymentStatus}>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="complete">Complete</option>
          </select>
        </label>
      </div>

      <div className="admin-field-row">
        <label className="admin-field">
          <span>Phase</span>
          <select
            onChange={(event) => set("currentPhase", event.target.value)}
            value={fields.currentPhase}
          >
            {portalPhases.map((phase) => (
              <option key={phase} value={phase}>
                {phase}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-field">
          <span>Project status</span>
          <select
            onChange={(event) => set("status", event.target.value as ProjectFields["status"])}
            value={fields.status}
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <em>Only an active project shows in the client portal.</em>
        </label>
      </div>

      <label className="admin-field">
        <span>Next up</span>
        <textarea onChange={(event) => set("nextUp", event.target.value)} value={fields.nextUp} />
        <em>Shown on the client&rsquo;s overview under &ldquo;Next Up&rdquo;.</em>
      </label>
      </> : null}

      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-actions">
        <button className="is-primary" disabled={isSaving} type="submit">
          {isSaving ? "Saving" : "Save project"}
        </button>
        {savedAt ? <span>Saved {savedAt}</span> : null}
      </div>
    </form>
  );
}
