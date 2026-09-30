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
