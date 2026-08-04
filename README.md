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

## Client Portal Admin

The admin panel at `/admin` is how portal content gets written. It is unlinked from
the public site and marked `noindex`.

### Setup

1. Run the migrations: `npm run db:migrate`
2. Set `STUDIO_AUTH_SECRET` (32+ characters, distinct from `PORTAL_AUTH_SECRET`)
3. Create your account: `npm run admin:create`
4. Sign in at `/admin/login`

There is no signup page — admin accounts exist only if the script creates them.

### Environment

| Variable | Required for |
| --- | --- |
| `DATABASE_URL` | Everything |
| `PORTAL_AUTH_SECRET` | Client portal sessions and magic links |
| `STUDIO_AUTH_SECRET` | Admin sessions |
| `APP_URL` | Building portal login links |
| `RESEND_API_KEY`, `PORTAL_FROM_EMAIL` | Emailing portal login links |

Resend is optional. When it is unconfigured the login link is written to the server
log instead of emailed, so local development works without an email provider.

### Notes

- Admin passwords use PBKDF2-SHA256 at 210,000 iterations, which costs roughly 100ms
  of CPU on the sign-in request. That is fine on paid Cloudflare Workers; on a plan
  with a 10ms CPU cap, lower `PBKDF2_ITERATIONS` in `db/adminAuth.ts` or move admin
  auth off the Worker.
- Updates and approvals are drafts until published. `/admin/projects/:id/preview`
  renders the real portal components against published content only.
- Removing an update or approval is a soft delete — the row is retained with
  `deleted_at` set.
