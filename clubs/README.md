# RFA Clubs Registration

Standalone club-registration site for `clubs.royalfamilyacademy.org`.

This application is intentionally independent of the RFA ERP/portal. It does not read student records from the portal, use portal authentication, or write into portal club tables.

## What the standalone system does

Parents enter the learner's full name, choose the correct section/class and club, and provide their own contact details. The standalone service then:

- validates class/club eligibility on the server;
- stores the registration in its own database;
- enforces each club's published capacity;
- prevents the same learner from holding two active club registrations in the same term;
- returns a registration reference;
- exposes live places remaining through `/api/clubs`.

For duplicate protection, a learner key is generated from normalized student name + class + guardian phone. No portal student ID or admission number is required.

## Cloudflare Pages + D1

Create a separate Pages project from the same GitHub repository:

- Repository: `FIBRE007/html-portfolio`
- Production branch: `main`
- Root directory: `clubs`
- Build command: `exit 0`
- Build output directory: `.`
- Custom domain: `clubs.royalfamilyacademy.org`

Because the Pages project root is `clubs`:

- `clubs/functions/api/register.js` becomes `POST /api/register`;
- `clubs/functions/api/clubs.js` becomes `GET /api/clubs`.

Create a Cloudflare D1 database for the site and bind it to the Pages project with the binding name `DB`.

Apply `clubs/schema.sql` to that D1 database. The schema creates the independent `clubs` and `registrations` tables, the one-club-per-learner rule, the capacity-protection trigger, and the initial club catalogue/capacities.

No portal URL, portal secret, Supabase connection, Render service, or ERP environment variable is required by this standalone site.

## Club rules represented by the page

The first, unlabeled list supplied for this build is treated as the general club list. The lists explicitly marked `ONLY` remain restricted:

- General clubs: shown to eligible Primary and High School learners.
- Upper Primary-only clubs: Grades 4 and 5.
- Lower Primary-only clubs: Grades 1, 2 and 3.
- Nursery-only clubs: Kindergarten.

Grade 6 is not added because it was not included in the supplied club-registration rules.

## Registration period

The current code is fixed to:

- Session: `2026/2027`
- Term: `Joy Term`

Change the constants in `app.js`, `functions/api/register.js`, and `functions/api/clubs.js` when opening a new registration period.
