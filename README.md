# Pebblesprings Studio Website

A dead-simple portfolio site for Pebblesprings Studio.

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## Project Shape

- `app/page.tsx` contains the single-page portfolio homepage.
- `app/TestHeroGallery.tsx` contains the homepage work gallery.
- `app/globals.css` contains the visual system and responsive layout.
- `app/portal/` is the client-facing portal; `app/admin/` is the studio admin panel.
- `app/admin.css` contains the admin panel's "ledger" visual system.
- `public/og.png` is the generated social preview image.
- `.openai/hosting.json` declares optional Sites resources.

## Monitoring data sync

Client monitoring is read into this app from `pebblesprings-ops`; the app does not run scheduled PageSpeed checks. Ref owns Lighthouse calls and Pulse owns uptime checks. The public `/api/lighthouse-score` endpoint is intentionally separate for on-demand checks of arbitrary URLs.

Configure these deployment variables:

- `PEBBLESPRINGS_OPS_REPO`: GitHub `owner/repository` for `pebblesprings-ops`.
- `PEBBLESPRINGS_OPS_BRANCH`: canonical branch, normally `main`.
- `PEBBLESPRINGS_OPS_GITHUB_TOKEN`: token if the ops repository is private.
- `REF_SYNC_SECRET`: shared secret used by Ref to sign the JSON body `{ "commitSha": "..." }` with HMAC-SHA256 and send it as `x-ops-signature: sha256=...`.
- `CRON_SECRET`: already used by Vercel; the reconciliation job sends it to `/api/cron/monitoring-sync`.

Ref should commit these CSV files under `monitoring/`:

- `lighthouse_scores.csv`: one row per `project_key` and `captured_day`, including `url`, `status`, `captured_at`, `run_id`, and the four score columns (`speed_score`, `reach_score`, `reliability_score`, `visibility_score`).
- `lighthouse_alerts.csv`: alert rows with `alert_key`, `project_key`, `url`, `metric`, first/second captured days and values, `status`, and `recommendation`.
- `runs.csv`: optional run metadata with `run_id`, `agent`, `status`, `started_at`, `completed_at`, and `error_message`.

Pulse can add `uptime_checks.csv` with `project_key`, `url`, `captured_day`, `status`, `http_status`, `response_time_ms`, and the run fields. Ref calls `POST /api/monitoring/ops-sync` after pushing a commit; Vercel periodically calls `/api/cron/monitoring-sync` as a reconciliation fallback.

## Client Portal Admin

The admin panel at `/admin` is how portal content gets written. It is unlinked from
the public site and marked `noindex`.

### Setup

Pending migrations are applied by `postinstall`, so a deploy migrates itself using the
`DATABASE_URL` already configured in the host. Nothing has to be run by hand. It hangs
off install rather than build because Vercel detects this project as a framework and
runs its own build, skipping the `build` script in `package.json`.

To create the first admin account, set these in the hosting environment and redeploy:

- `ADMIN_BOOTSTRAP_EMAIL`
- `ADMIN_BOOTSTRAP_PASSWORD` (12+ characters)
- `ADMIN_BOOTSTRAP_NAME` (optional)

The next build creates or updates that account, then you sign in at `/admin/login`.
**Delete the three `ADMIN_BOOTSTRAP_*` variables afterwards** — while they are set,
every build resets that account's password to their value.

Locally, with a real `DATABASE_URL` in `.env.local`, `npm run admin:create` does the
same thing interactively. There is no signup page in either case.

### Environment

| Variable | Required for |
| --- | --- |
| `DATABASE_URL` | Everything |
| `PORTAL_AUTH_SECRET` | Client portal sessions and magic links |
| `STUDIO_AUTH_SECRET` | Admin sessions — optional, see below |
| `APP_URL` | Building portal login links |
| `RESEND_API_KEY`, `PORTAL_FROM_EMAIL` | Emailing portal login links |
| `ADMIN_BOOTSTRAP_*` | One-time admin account creation |

`STUDIO_AUTH_SECRET` is optional: when unset, a distinct admin key is derived from
`PORTAL_AUTH_SECRET`, so the admin panel deploys without provisioning a new secret.
Setting it explicitly is stronger, because then a leaked portal secret does not imply
a leaked admin one. Setting or changing it signs out all admin sessions.

Resend is optional. When it is unconfigured the login link is written to the server
log instead of emailed, so local development works without an email provider.

> `vercel env pull` writes the literal string `[SENSITIVE]` for variables marked
> sensitive in the Vercel dashboard rather than their real values. The migration
> script fails with an explicit message when it sees that, instead of surfacing as a
> confusing "Invalid URL" later on.

### Notes

- Admin passwords use PBKDF2-SHA256 at 210,000 iterations, which costs roughly 100ms
  of CPU on the sign-in request. That is fine on paid Cloudflare Workers; on a plan
  with a 10ms CPU cap, lower `PBKDF2_ITERATIONS` in `db/adminAuth.ts` or move admin
  auth off the Worker.
- Updates and approvals are drafts until published. `/admin/projects/:id/preview`
  renders the real portal components against published content only.
- Removing an update or approval is a soft delete — the row is retained with
  `deleted_at` set.
