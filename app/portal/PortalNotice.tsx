"use client";

import type { PortalState } from "./usePortalData";

/**
 * Shared empty/error copy so a client never sits in front of a page that has
 * silently rendered nothing.
 */
export function PortalNotice({ state }: { state: PortalState }) {
  if (state.status === "empty") {
    return (
      <section className="portal-notice" aria-live="polite">
        <h1>Your project isn&rsquo;t set up yet.</h1>
        <p>
          Nothing has been published to your portal so far. Will is still getting things in
          place — if this looks wrong, email{" "}
          <a href="mailto:will@pebblesprings.co">will@pebblesprings.co</a>.
        </p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="portal-notice" aria-live="polite">
        <h1>We couldn&rsquo;t load your project.</h1>
        <p>
          Something went wrong on our end. Refresh the page, and if it keeps happening email{" "}
          <a href="mailto:will@pebblesprings.co">will@pebblesprings.co</a>.
        </p>
      </section>
    );
  }

  return null;
}
