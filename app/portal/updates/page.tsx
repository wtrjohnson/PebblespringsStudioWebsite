"use client";

import { useEffect, useState } from "react";

type PortalUpdate = {
  id: number;
  phase: string;
  title: string;
  body: string;
  status: "in_progress" | "completed";
  actionLabel: string | null;
  actionHref: string | null;
  publishedAt: string;
};

type PortalData = {
  project: {
    clientName: string;
  };
  updates: PortalUpdate[];
};

function formatPortalDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function PortalUpdatesPage() {
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

  const updateGroups = data
    ? Array.from(
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
    }))
    : [];

  return (
    <main className="portal-page portal-updates-page">
      <header className="portal-header" aria-label="Client portal header">
        <a className="portal-brand" href="/portal" aria-label="Pebblesprings client portal">
          <img src="/PSLogo.png" alt="" />
          <span>Project Overview</span>
        </a>

        <nav className="portal-nav" aria-label="Client portal navigation">
          <a href="/portal">Overview</a>
          <a aria-current="page" href="/portal/updates">
            Updates
          </a>
          <a href="/portal/approvals">Approvals</a>
          <a href="/portal">Billing</a>
        </nav>
      </header>

      {data ? (
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
                          <p>{update.body}</p>
                        </div>

                        <div className="portal-journal-actions">
                          {update.actionLabel ? (
                            <a href={update.actionHref ?? "/portal"}>{update.actionLabel}</a>
                          ) : null}
                          <button type="button">Ask a question</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
