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

## Portal connection

Set these environment variables in the Clubs Pages project:

- `CLUBS_PORTAL_REGISTER_URL` — existing portal endpoint that accepts a club registration.
- `CLUBS_PORTAL_TOKEN` — optional bearer token if the portal endpoint requires one.

The Cloudflare Function validates the section, class and club again before forwarding the request. The published capacities on the page are maximum club sizes. Live availability and duplicate-registration checks should continue to be enforced by the existing portal so there is one source of truth.

## Current section rules

- High School: JH 1–3 and SH 1–3.
- Upper Primary: Grades 4–5 only.
- Lower Primary: Grades 1–3 only.
- Nursery: Kindergarten only.

The first unlabeled club list supplied for this build is currently treated as the High School list.
