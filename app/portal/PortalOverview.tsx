"use client";

import type { CSSProperties } from "react";
import { portalPhases } from "../../db/portalPhases";
import { formatPortalDate, type PortalData, toParagraphs } from "./usePortalData.ts";

type PortalProgressStyle = CSSProperties & {
  "--portal-completed-steps": number;
};

/**
 * Presentational so the admin "view as client" preview renders the exact same
 * markup the client gets, rather than a lookalike that can drift.
 */
export function PortalOverview({ data }: { data: PortalData }) {
  const { project, approvals, updates } = data;
  const openApprovals = approvals.filter((approval) => approval.status === "needs_review");
  const latestUpdate = updates[0];
  const currentPhaseIndex = Math.max(portalPhases.indexOf(project.currentPhase), 0);
  const progressStyle: PortalProgressStyle = {
    "--portal-completed-steps": currentPhaseIndex,
  };

  return (
    <>
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

          {project.nextUp ? (
            <p className="portal-next-up">
              <strong>Next Up:</strong> {project.nextUp}
            </p>
          ) : null}
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
                <a href="/portal/updates">
                  Updates <span aria-hidden="true">&rsaquo;</span>
                </a>
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
            <time dateTime={latestUpdate.publishedAt}>
              {formatPortalDate(latestUpdate.publishedAt)}
            </time>
            <div className="portal-message-row">
              <span className="portal-avatar" aria-hidden="true">
                W
              </span>
              <div className="portal-message">
                {toParagraphs(latestUpdate.body).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
