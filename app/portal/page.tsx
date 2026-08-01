"use client";

import { type CSSProperties, useEffect, useState } from "react";

type PortalApproval = {
  id: number;
  title: string;
  status: "needs_review" | "approved" | "changes_requested";
};

type PortalUpdate = {
  body: string;
  publishedAt: string;
};

type PortalProject = {
  clientName: string;
  projectName: string;
  currentPhase: string;
  nextUp: string;
};

type PortalData = {
  project: PortalProject;
  approvals: PortalApproval[];
  updates: PortalUpdate[];
};

type PortalProgressStyle = CSSProperties & {
  "--portal-completed-steps": number;
};

const portalPhases = ["Discovery", "Design", "Build", "Launch", "Live"];

function formatPortalDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function PortalHeader() {
  return (
    <header className="portal-header" aria-label="Client portal header">
      <a className="portal-brand" href="/portal" aria-label="Pebblesprings client portal">
        <img src="/PSLogo.png" alt="" />
        <span>Project Overview</span>
      </a>

      <nav className="portal-nav" aria-label="Client portal navigation">
        <a aria-current="page" href="/portal">
          Overview
        </a>
        <a href="/portal/updates">Updates</a>
        <a href="/portal/approvals">Approvals</a>
        <a href="/portal">Billing</a>
      </nav>
    </header>
  );
}

export default function PortalPage() {
  const [data, setData] = useState<PortalData | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPortalData() {
      const response = await fetch("/api/portal/data", { cache: "no-store" });

      if (response.status === 401) {
        window.location.assign("/portal/login");
        return;
      }

      if (!response.ok) {
        return;
      }

      const nextData = (await response.json()) as PortalData;

      if (isMounted) {
        setData(nextData);
      }
    }

    loadPortalData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!data) {
    return (
      <main className="portal-page">
        <PortalHeader />
      </main>
    );
  }

  const { project, approvals, updates } = data;
  const openApprovals = approvals.filter((approval) => approval.status === "needs_review");
  const latestUpdate = updates[0];
  const currentPhaseIndex = Math.max(portalPhases.indexOf(project.currentPhase), 0);
  const progressStyle: PortalProgressStyle = {
    "--portal-completed-steps": currentPhaseIndex,
  };

  return (
    <main className="portal-page">
      <PortalHeader />

      <section className="portal-overview-grid" aria-label="Project overview">
        <article className="portal-status-card">
          <div className="portal-status-copy">
            <h1>{project.projectName}</h1>
            <p>{project.currentPhase} Phase</p>
          </div>

          <div className="portal-progress" aria-label="Project phase progress">
            <div className="portal-progress-track" style={progressStyle} aria-hidden="true">
              <span className="portal-progress-fill" />
              {portalPhases.map((phase, index) => (
                <span
                  className={`portal-progress-dot${index <= currentPhaseIndex ? " is-complete" : ""}`}
                  key={phase}
                />
              ))}
            </div>
            <div className="portal-progress-labels">
              {portalPhases.map((phase) => (
                <span key={phase}>{phase}</span>
              ))}
            </div>
          </div>

          <p className="portal-next-up">
            <strong>Next Up:</strong> {project.nextUp}
          </p>
        </article>

        <section className="portal-attention" aria-labelledby="attention-title">
          <h2 id="attention-title">
            Needs Your Attention
            {openApprovals.length > 0 ? <span>{openApprovals.length}</span> : null}
          </h2>

          <div className="portal-action-list">
            {openApprovals.map((item) => (
              <div className="portal-action-row" key={item.id}>
                <p>{item.title}</p>
                <a href="/portal/approvals" aria-label={`Review: ${item.title}`}>
                  Review <span aria-hidden="true">&rsaquo;</span>
                </a>
              </div>
            ))}
            {openApprovals.length === 0 ? (
              <div className="portal-action-row">
                <p>No open approvals</p>
                <a href="/portal/updates">Updates <span aria-hidden="true">&rsaquo;</span></a>
              </div>
            ) : null}
          </div>
        </section>
      </section>

      {latestUpdate ? (
        <section className="portal-update" aria-labelledby="latest-update-title">
          <div className="portal-update-heading">
            <h2 id="latest-update-title">Latest from Will</h2>
            <a href="/portal/updates">View all updates</a>
          </div>

          <div className="portal-update-thread">
            <time dateTime={latestUpdate.publishedAt}>{formatPortalDate(latestUpdate.publishedAt)}</time>
            <div className="portal-message-row">
              <span className="portal-avatar" aria-hidden="true">
                W
              </span>
              <p className="portal-message">
                {latestUpdate.body}
              </p>
            </div>
            <a className="portal-question" href="/portal">
              Ask a question
            </a>
          </div>
        </section>
      ) : null}
    </main>
  );
}
