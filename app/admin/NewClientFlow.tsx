"use client";

import { useState, type FormEvent } from "react";
import { portalPhases } from "../../db/portalPhases";

type FormState = {
  clientName: string;
  userName: string;
  email: string;
  userRole: "approver" | "viewer";
  projectName: string;
  slug: string;
  siteUrl: string;
  projectStart: string;
  contractAmount: string;
  contractType: string;
  paymentStatus: "pending" | "partial" | "complete";
  currentPhase: string;
  nextUp: string;
};

const initialState: FormState = {
  clientName: "",
  userName: "",
  email: "",
  userRole: "approver",
  projectName: "",
  slug: "",
  siteUrl: "",
  projectStart: "",
  contractAmount: "0",
  contractType: "No Subscription",
  paymentStatus: "pending",
  currentPhase: portalPhases[0],
  nextUp: "",
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function NewClientFlow() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function open() {
    setForm(initialState);
    setError("");
    setIsOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, contractAmount: Number(form.contractAmount) }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; project?: { slug: string } } | null;

      if (!response.ok || !data?.project) {
        setError(data?.error ?? "Unable to create the client.");
        setIsSaving(false);
        return;
      }

      window.location.assign(`/admin?client=${encodeURIComponent(data.project.slug)}`);
    } catch {
      setError("Unable to create the client.");
      setIsSaving(false);
    }
  }

  return (
    <>
      <button aria-label="Add client" className="admin-add-client" onClick={open} type="button">+</button>
      {isOpen ? (
        <div className="admin-onboarding-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
          <section aria-labelledby="new-client-title" className="admin-onboarding-panel" role="dialog" aria-modal="true">
            <div className="admin-onboarding-heading">
              <h2 id="new-client-title">New Client</h2>
              <button aria-label="Close new client form" className="admin-onboarding-close" onClick={() => setIsOpen(false)} type="button">×</button>
            </div>
            <p className="admin-onboarding-intro">Create the client, portal access, active project, and scoring website together.</p>
            <form className="admin-onboarding-form" onSubmit={submit}>
              <fieldset>
                <legend>Client and portal access</legend>
                <label><span>Client name</span><input onChange={(event) => set("clientName", event.target.value)} required value={form.clientName} /></label>
                <div className="admin-onboarding-row">
                  <label><span>Portal user name</span><input onChange={(event) => set("userName", event.target.value)} required value={form.userName} /></label>
                  <label><span>Portal user email</span><input onChange={(event) => set("email", event.target.value)} required type="email" value={form.email} /></label>
                </div>
                <label><span>Portal role</span><select onChange={(event) => set("userRole", event.target.value as FormState["userRole"])} value={form.userRole}><option value="approver">Approver</option><option value="viewer">Viewer</option></select></label>
              </fieldset>
              <fieldset>
                <legend>Project and scoring</legend>
                <div className="admin-onboarding-row">
                  <label><span>Project name</span><input onChange={(event) => { set("projectName", event.target.value); if (!form.slug) set("slug", slugify(event.target.value)); }} required value={form.projectName} /></label>
                  <label><span>Portal slug</span><input onChange={(event) => set("slug", slugify(event.target.value))} required value={form.slug} /></label>
                </div>
                <label><span>Live website URL</span><input onChange={(event) => set("siteUrl", event.target.value)} placeholder="https://example.com" required type="url" value={form.siteUrl} /><em>This URL powers the client’s website scores.</em></label>
                <div className="admin-onboarding-row">
                  <label><span>Project start</span><input onChange={(event) => set("projectStart", event.target.value)} type="date" value={form.projectStart} /></label>
                  <label><span>Development phase</span><select onChange={(event) => set("currentPhase", event.target.value)} value={form.currentPhase}>{portalPhases.map((phase) => <option key={phase}>{phase}</option>)}</select></label>
                </div>
                <label><span>Next up</span><textarea onChange={(event) => set("nextUp", event.target.value)} value={form.nextUp} /></label>
              </fieldset>
              <fieldset>
                <legend>Commercial details</legend>
                <div className="admin-onboarding-row admin-onboarding-row-three">
                  <label><span>Contract amount</span><input min="0" onChange={(event) => set("contractAmount", event.target.value)} required type="number" value={form.contractAmount} /></label>
                  <label><span>Contract type</span><input onChange={(event) => set("contractType", event.target.value)} required value={form.contractType} /></label>
                  <label><span>Payment status</span><select onChange={(event) => set("paymentStatus", event.target.value as FormState["paymentStatus"])} value={form.paymentStatus}><option value="pending">Pending</option><option value="partial">Partial</option><option value="complete">Complete</option></select></label>
                </div>
              </fieldset>
              {error ? <p className="admin-error" role="alert">{error}</p> : null}
              <div className="admin-onboarding-actions"><button onClick={() => setIsOpen(false)} type="button">Cancel</button><button className="is-primary" disabled={isSaving} type="submit">{isSaving ? "Creating" : "Create client"}</button></div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
