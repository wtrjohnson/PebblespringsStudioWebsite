"use client";

import { useEffect, useState } from "react";

export type PortalApproval = {
  id: number;
  title: string;
  phase: string;
  note: string;
  previewLabel: string;
  previewHref: string;
  requestedBy: string;
  helpfulBy: string;
  status: "needs_review" | "approved" | "changes_requested";
  respondedAt: string | null;
  responseNote: string | null;
  responseReply: string | null;
};

export type PortalUpdate = {
  id: number;
  phase: string;
  title: string;
  body: string;
  status: "in_progress" | "completed";
  actionLabel: string | null;
  actionHref: string | null;
  publishedAt: string;
};

export type PortalProject = {
  clientName: string;
  projectName: string;
  currentPhase: string;
  nextUp: string;
};

export type PortalData = {
  project: PortalProject;
  approvals: PortalApproval[];
  updates: PortalUpdate[];
};

/**
 * "empty" and "error" are deliberately distinct: a client with no project yet
 * is a normal state that deserves a calm message, while a failed load must not
 * quietly render as if there were simply nothing to show.
 */
export type PortalState =
  | { status: "loading" }
  | { status: "ready"; data: PortalData }
  | { status: "empty" }
  | { status: "error" };

export function usePortalData() {
  const [state, setState] = useState<PortalState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function loadPortalData() {
      try {
        const response = await fetch("/api/portal/data", { cache: "no-store" });

        if (response.status === 401) {
          window.location.assign("/portal/login");
          return;
        }

        if (!isMounted) {
          return;
        }

        if (response.status === 404) {
          setState({ status: "empty" });
          return;
        }

        if (!response.ok) {
          setState({ status: "error" });
          return;
        }

        setState({ status: "ready", data: (await response.json()) as PortalData });
      } catch {
        if (isMounted) {
          setState({ status: "error" });
        }
      }
    }

    loadPortalData();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}

export function formatPortalDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

/**
 * Update bodies are plain text authored in the admin panel. Blank lines are
 * paragraph breaks; without this they collapse into a single run of text.
 */
export function toParagraphs(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
