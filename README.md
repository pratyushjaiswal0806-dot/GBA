# GBA Civic Issue Tracker

Small pilot portal for reporting civic issues, assigning them to ward officers, and verifying an Action Taken Report. The data and accounts are demo-only.

**Implementation status:** Phase 12 complete; Phase 13 deployment pending.

## Install

```sh
cd server && npm install
cd ../frontend && npm install
```

Copy the example environment files to `server/.env` and `frontend/.env`, then fill in the settings described in `CLAUDE.md` and `TRD.md`. Keep secrets in those `.env` files only.

## Run locally

In one terminal:

```sh
cd server
npm run dev
```

In another terminal:

```sh
cd frontend
npm run dev
```

The Vite page is normally at `http://localhost:5173/`; the Express server is at `http://localhost:3000/`.

## Deploy on Vercel

The Vercel deployment uses two projects from this repository:

- `frontend/` is the Vite project. Its build command is `npm run build` and its output directory is `dist`.
- `server/` is the Express API project. Vercel loads `src/index.js` as the API Function; leave its build command and output directory blank.

Set the frontend project's public build variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_MAP_TILE_URL
VITE_API_BASE_URL=https://<your-api-project>.vercel.app
VITE_MAX_UPLOAD_MB=5
```

Set the API project's server variables from `server/.env.example`, including:

```text
FRONTEND_ORIGINS=https://<your-web-project>.vercel.app
DATABASE_URL=<Supabase session-pooler URL>
SUPABASE_URL=<Supabase project URL>
SUPABASE_SECRET_KEY=<server-only Supabase secret key>
```

On the first setup, deploy the API once to get its URL, put that URL in the frontend project's `VITE_API_BASE_URL`, deploy the frontend, then put the frontend URL in the API project's `FRONTEND_ORIGINS` and redeploy the API.

Keep `SUPABASE_SECRET_KEY`, `DATABASE_URL`, and `SEED_DEMO_PASSWORD` out of the frontend project. Vercel Preview and Production variables are separate, so configure both before deploying each environment. A changed variable takes effect on a new deployment.

Push to the branch connected to Vercel to redeploy, or choose **Redeploy** for an existing deployment in the Vercel dashboard. Vercel Functions do not need a manual wake-up step; check that Supabase is active before a rehearsal.

The browser resizes accepted images before upload so ordinary phone photos stay below Vercel's 4.5 MB Function request limit. The original file-size check still refuses files over the configured 5 MB limit. See [Vercel Function limits](https://vercel.com/docs/functions/limitations).

After the first deployment, set the Supabase Auth Site URL to the production web URL and add the local and Vercel preview redirect patterns. Keep the `ticket-media` bucket private.

Use a Preview deployment for the health, report, officer, verifier, dashboard and phone checks before deploying Production. The `frontend/vercel.json` file provides the SPA fallback needed when a React route is refreshed.

## Database and tests

Apply the migrations with the Supabase CLI (`supabase link`, then `supabase db push`) and seed the demo users and tickets:

```sh
cd server
npm run seed
npm test
```

The tests use the local PostGIS test database configured by `TEST_DATABASE_URL` (the pilot setup uses port `55432`).

To remove non-demo tickets and their database rows while keeping demo tickets and staff, run the SQL script against the database you choose:

```sh
psql "$DATABASE_URL" -f server/scripts/reset-demo.sql
```

The script does not remove files from Supabase Storage.

## Demo logins

- Ward A officer: `officer.a@demo.example`
- Ward B officer: `officer.b@demo.example`
- Ward C officer: `officer.c@demo.example`
- Verifier: `verifier@demo.example`

All four use the password in `server/.env` as `SEED_DEMO_PASSWORD`. Do not commit or share that value.

## Demo script

1. Open the home page and submit a report in a sample ward with a photo; save the ticket code.
2. Track the code from the public **Track a report** page.
3. Sign in as the matching ward officer, open the ticket, start work if needed, and submit an Action Taken Report with remarks, 1–3 after photos, and the action location.
4. Sign in as the verifier, compare the before and after photos, then approve to close or reject with a reason to reopen it.
5. Open the public dashboard and show the demo-data label, summary, charts, map and trend.

For the Phase 12 mock external page, open `mock-gba-site/index.html` from disk and click **GBA Portal**. Its local link points to `http://localhost:3000/` until the Phase 13 deployment.
