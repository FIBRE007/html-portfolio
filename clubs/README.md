# RFA Clubs Registration

Standalone club-registration site for `clubs.royalfamilyacademy.org`.

## Cloudflare Pages

Create a separate Pages project from the same GitHub repository:

- Repository: `FIBRE007/html-portfolio`
- Production branch: `main`
- Root directory: `clubs`
- Build command: none
- Build output directory: `.`
- Custom domain: `clubs.royalfamilyacademy.org`

Because the Pages project root is `clubs`, `clubs/functions/api/register.js` is deployed as `/api/register`.

## Existing portal integration

The live RFA portal code is in `FIBRE007/New-project` and is deployed on Render. Its existing registration route is `POST /api/clubs/:clubId/register` and already enforces:

- an open club status;
- scheduled opening time;
- maximum club capacity;
- one active club per learner per academic term;
- instant approval (no waitlist when full).

That route intentionally requires a signed-in portal session and CSRF protection, so the public standalone page must not call it directly from the browser.

The standalone Pages Function therefore forwards verified submissions to a server-side clubs bridge. Configure these variables in the Clubs Pages project:

- `CLUBS_API_URL` — the server-side standalone club-registration bridge URL.
- `CLUBS_BRIDGE_SECRET` — a secret stored only in the Pages environment and the bridge configuration. Never place it in browser JavaScript or commit it to GitHub.

The bridge should verify the admission number and guardian phone against the existing RFA student record, then write through the same production club tables while preserving the portal's capacity and one-club-per-term rules.

## Club rules represented by the page

The first, unlabeled list supplied for this build is treated as the general club list. The lists explicitly marked `ONLY` remain restricted:

- General clubs: shown to eligible Primary and High School learners.
- Upper Primary-only clubs: Grades 4 and 5.
- Lower Primary-only clubs: Grades 1, 2 and 3.
- Nursery-only clubs: Kindergarten.

Grade 6 is not added to the registration selector because it was not included in the supplied club-registration rules.

## Current production prerequisite

Before opening registration, confirm the production academic calendar points to the intended session and term. The portal's normal club endpoint obtains its term from the active academic year, so an incorrect active-year flag can place registrations in the wrong term.
