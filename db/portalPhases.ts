/**
 * Standalone so client components can import the phase list without pulling
 * db/portal.ts — and with it the Neon driver — into the browser bundle.
 */
export const portalPhases = ["Discovery", "Design", "Build", "Launch", "Live"];
