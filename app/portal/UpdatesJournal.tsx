"use client";

import {
  formatPortalDate,
  type PortalData,
  type PortalUpdate,
  toParagraphs,
} from "./usePortalData.ts";

/**
 * Presentational so the admin "view as client" preview renders the exact same
 * markup the client gets, rather than a lookalike that can drift.
 */
export function UpdatesJournal({ data }: { data: PortalData }) {
  const updateGroups = Array.from(
    data.updates.reduce((groups, update) => {
      const entries = groups.get(update.phase) ?? [];
      entries.push(update);
      groups.set(update.phase, entries);
      return groups;
    }, new Map<string, PortalUpdate[]>()),
  ).map(([phase, entries]) => ({
    phase,
    status: entries.some((entry) => entry.status === "in_progress") ? "current" : "complete",
    entries,
  }));

  return (
    <section className="portal-journal" aria-labelledby="updates-title">
      <div className="portal-journal-heading">
        <p>{data.project.clientName}</p>
        <h1 id="updates-title">Updates</h1>
      </div>

      <div className="portal-journal-list">
        {updateGroups.map((group) => (
          <section
            className={`portal-phase-group is-${group.status}`}
            key={group.phase}
          >
            <div className="portal-phase-label">
              <span>{group.phase}</span>
            </div>

            <div className="portal-phase-feed">
              {group.entries.map((update) => (
                <article
                  className={[
                    "portal-journal-entry",
                    `is-${update.status.replace("_", "-")}`,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={update.id}
                >
                  <span className="portal-entry-dot" aria-hidden="true" />

                  <div className="portal-journal-card">
                    <div className="portal-journal-copy">
                      <time dateTime={update.publishedAt}>
                        {formatPortalDate(update.publishedAt)}
                      </time>
                      <h2>{update.title}</h2>
                      {toParagraphs(update.body).map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>

                    {update.actionLabel && update.actionHref ? (
                      <div className="portal-journal-actions">
                        <a href={update.actionHref}>{update.actionLabel}</a>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
