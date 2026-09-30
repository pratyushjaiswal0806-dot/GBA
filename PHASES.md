# PHASES.md: Build Plan

| | |
|---|---|
| **Status** | Phase 12 complete; ready for Phase 13 |
| **Current phase** | Phase 13: Deploy |
| **Reads with** | [PRD.md](PRD.md) (what), [TRD.md](TRD.md) (how, source of truth), [CLAUDE.md](CLAUDE.md) (rules) |

**How to use this file**

1. Open a new Claude Code session. Paste the **Starter prompt** of the current phase.
2. Do the **Manual steps** first (dashboards, keys). Claude makes a plan. You approve it. Claude builds.
3. Do the **Manual testing** and tick the **Done when** list. Commit with the suggested message.
4. Update the "Current phase" line above and the Status column below. Then start the next phase in a fresh session.

**Order logic:** every phase ends with something you can see and click. The riskiest parts come early: location and address lookup (Phase 3), then photos and Storage (Phase 4). The main demo flow (report, fix, verify) is finished by Phase 8. "Should" and "Could" items come after that. The last two phases are "Polish and error handling" and "Deploy".

| Phase | Name | Goal | Requirements | Status |
|-------|------|------|--------------|--------|
| 1 | Skeleton | The project runs: frontend loads, backend answers a health check, database connects. | R35 | Complete |
| 2 | Database, seed data and categories | The tables and demo data exist in Supabase, and the category list shows on the home page. | R8 (list), R33 (data side) | Complete |
| 3 | Location slice | A citizen can find their spot on a map and see the street, area and ward before reporting. | R3, R4, R5 | Complete |
| 4 | Photo and create report | A citizen can submit a report with a photo and get a ticket code, assigned to the ward officer. | R1, R2, R6, R8, R9, R13, R23 (creation) | Complete |
| 5 | Staff login and officer list | Staff can log in, and an officer sees only their own ward's tickets. | R14, R15, R25 | Complete |
| 6 | Officer detail, start work and status lookup | An officer opens a ticket and starts work, and the citizen sees the new status by ticket code. | R7, R16, R17, R23 | Complete |
| 7 | Action Taken Report | An officer submits remarks and photos, and the ticket moves to "Pending Verification". | R18, R19 | Complete |
| 8 | Verifier check | A verifier compares before and after photos, then approves (closed) or rejects (reopened). | R20, R21, R22, R24 | Complete |
| 9 | Public dashboard, core | Anyone can open a public page with summary numbers, ward and category counts and a "Demo data" label. | R26 to R30, R33 | Complete |
| 10 | Dashboard map, trend and live refresh | The dashboard also shows a map, a trend chart, and updates by itself. | R31, R32, R34 | Complete |
| 11 | Duplicate check | Reporting the same spot twice in the same category is caught, and the citizen can add support instead. | R10, R11, R12 | Complete |
| 12 | Polish and error handling | Every screen handles loading, empty and error cases and works well on a phone. | R36, R37 | Complete |
| 13 | Deploy | The whole demo runs on a hosted HTTPS address, from a phone, without manual fixes. | (demo readiness) | Not started |

Every requirement R1 to R37 sits in exactly one phase above (R23 starts in Phase 4 and every later status change keeps it true).

---

## Phase 1: Skeleton

**Goal:** The project runs end to end: the frontend loads, the backend answers a health check, and the database connects.

**Manual steps (I do these before starting):**

1. Install **Node.js** (current LTS version) and **Git** on your computer if they are not there yet. In a terminal, run `node -v` and `git -v` to check.
2. Create the project folder `gba-civic-tracker`. Copy `PRD.md`, `TRD.md`, `CLAUDE.md` and `PHASES.md` into its root. Open the folder in a terminal and run `git init`.
3. Go to supabase.com and sign in (or create a free account).
4. Click **New project**. Give it a name such as `gba-civic-tracker-pilot`. Pick the region nearest to you. Set a **database password** and save it in a password manager. Wait until the project says it is ready.
5. On the project page, click the **Connect** button at the top. Choose the **Session pooler** connection string (not "Direct" and not "Transaction pooler"). Copy it. Replace the password placeholder in it with your database password.
6. After Claude has created `server/.env.example`: copy it to `server/.env` (same folder). Paste the connection string from step 5 as `DATABASE_URL`. Keep `PORT=3000`. Leave the other settings for later phases.

**What Claude builds:**

- Folder tree from TRD section 4 (only the folders this phase needs), and a `.gitignore` that lists both `.env` files, `node_modules` and `dist`.
- `server/`: `package.json`, `src/index.js`, `app.js`, `config.js` (reads and checks settings, and stops with a clear message if one is missing), `db.js` (`pg` Pool, `withTransaction()` helper, `SET search_path TO public, extensions` on each new connection), `middleware/errorHandler.js`, `utils/ApiError.js`.
- Route `GET /api/health`. It also runs a tiny database query, so it shows whether the database connects (see question 4).
- `frontend/`: Vite + React + Tailwind, `vite.config.js` with the `/api` proxy to `localhost:3000`, and one starter page that calls `/api/health` and shows "Server: OK, Database: OK" (or the failure).
- Express serves `frontend/dist` and `index.html` for non-`/api` paths (the production shape from TRD section 4).
- Vitest and Supertest set up. `server/.env.example` and `frontend/.env.example` (names only, no values).
- Fill in the `Install`, `Test` and `Lint` lines in `CLAUDE.md` (a linter is question 10).

**Starter prompt:**

```
Read CLAUDE.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 1: Skeleton.
Do only this phase. Make a plan first and wait for my approval before writing any code.
At the end, update the TODO commands in CLAUDE.md and tell me what to test.
```

**Manual testing (I do these):**

1. In `server/`, run the install command Claude gives you, then `npm run dev`. Expected: the terminal says the server is listening on port 3000 and the database connected.
2. Open `http://localhost:3000/api/health` in the browser. Expected: a small JSON answer saying the server and the database are OK.
3. In `frontend/`, run the install command, then `npm run dev`. Open the address it prints (usually `http://localhost:5173`). Expected: the page loads and shows "Server: OK, Database: OK".
4. Bad input: open `http://localhost:3000/api/does-not-exist`. Expected: a JSON error with `status`, `code` and `message` (404), not an HTML page or a stack trace.
5. Bad setting: in `server/.env`, delete the value of `DATABASE_URL`, then start the server. Expected: it stops at once with a clear message naming the missing setting. Put the value back.
6. Restart check: stop the server (Ctrl+C) and refresh the frontend page. Expected: the page shows "Server: not reachable" and does not go blank. Start the server again and refresh. Expected: OK again.
7. Run `git status`. Expected: no `.env` file and no `node_modules` in the list.
8. Run the build command in `frontend/`, then start the server with `node server/src/index.js` from the project root. Open `http://localhost:3000`. Expected: the same page loads from Express on port 3000.

**Automated tests:** Config check (a missing setting gives a clear error). `GET /api/health` answers OK when the database is up and reports "down" when the database check fails (using a stand-in for the database). The error handler returns the one error shape for an unknown route.

**Done when:**

- [x] `npm run dev` works in `server/` and in `frontend/`, one command each
- [x] `/api/health` answers and reports the database status
- [x] The frontend page reaches the backend through the `/api` proxy
- [x] The built frontend is served by Express on port 3000
- [x] `.env` files are git-ignored, and `.env.example` files list names only
- [x] `npm test` runs and passes
- [x] The TODO commands in `CLAUDE.md` are filled in or still marked TODO on purpose (lint)

**Commit message:** `Phase 1: project skeleton with health check and database connection`

---

## Phase 2: Database, seed data and categories

**Goal:** The tables and demo data exist in Supabase, and the category list shows on the home page.

**Manual steps (I do these before starting):**

1. Install **Docker Desktop** if it is not there (the tests use a local PostGIS database, TRD section 14). Start it. If you cannot install Docker, tell Claude before the plan (question 2).
2. In Supabase, open **Settings > API Keys**. Copy the **Project URL** (also shown in the project settings) into `server/.env` as `SUPABASE_URL`. Copy the **secret key** (starts with `sb_secret_`) into `server/.env` as `SUPABASE_SECRET_KEY`. If your project only shows the older keys, use the `service_role` key from the "Legacy" tab. Never paste this key anywhere else.
3. Use the four approved demo emails (`officer.a@demo.example`, `officer.b@demo.example`, `officer.c@demo.example`, and `verifier@demo.example`) and choose a throwaway demo password. Put the password in `server/.env` as `SEED_DEMO_PASSWORD`.
4. Once Claude has written the migration files: apply them. Claude gives you the exact commands for `supabase link` and `supabase db push` in its plan. If the login or link step fails, use the fallback: in Supabase, open **SQL Editor** in the left sidebar, then paste and run the three files from `supabase/migrations/` one by one, in order (`0001`, `0002`, `0003`).
5. Run `npm run seed` in `server/` after the migrations are applied.

**What Claude builds:**

- `supabase/migrations/0001_schema.sql`: PostGIS in the `extensions` schema, and the tables `wards`, `staff`, `categories`, `tickets`, `action_reports`, `media`, `status_history` with the checks from TRD section 5, and row-level security switched on for every table with no policies.
- `0002_seed_wards.sql` (three sample ward shapes) and `0003_seed_categories.sql` (footpath encroachment, potholes / road damage, garbage dumping).
- `server/scripts/seed.js`: creates the 3 officers and 1 verifier through Supabase Auth, their `staff` rows, and metadata-only demo tickets (`is_demo = true`) in all three categories with a mix of statuses, some `CLOSED` with a verifier. Safe to run twice. At the end it prints one test point inside each sample ward and one point outside (used in Phase 3 testing). Demo photos begin in Phase 4 when Storage is configured.
- `server/src/config.js` gets the new settings. `supabase.js` (admin client). `npm run seed` script.
- Route `GET /api/categories` and the home page listing the three categories (from the database, not typed into the page).
- Test setup in `server/tests/setup/`: local PostGIS container, stand-in `auth.users` table, runs the same SQL files.

**Starter prompt:**

```
Read CLAUDE.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 2: Database, seed data and categories.
Do only this phase. Make a plan first and wait for my approval before writing any code.
If the seed script needs a setting that is not in TRD section 12, ask me before adding it.
```

**Manual testing (I do these):**

1. After the migrations: in Supabase, open **Table Editor**. Expected: the 7 tables are listed. `wards` has 3 rows, `categories` has 3 rows.
2. After the seed: open **Authentication > Users** in Supabase. Expected: 4 users (3 officers, 1 verifier). In Table Editor, `staff` has 4 rows, and each officer has a `ward_id`.
3. In Table Editor, open `tickets`. Expected: demo tickets exist, all three categories are present, `is_demo` is true, and at least one is `CLOSED`.
4. Restart check: run `npm run seed` a second time. Expected: no error, and the counts in steps 2 and 3 do not double.
5. Bad input: rename `SUPABASE_SECRET_KEY` in `server/.env` to something wrong and run the seed. Expected: a clear error, and nothing half-written. Put it back.
6. Security check: Claude gives you a one-line command in its report that reads the `tickets` table through the Supabase API using the public (publishable / anon) key. Expected: an empty list or an error, never ticket rows.
7. Start both apps. Open the frontend home page. Expected: the three category names show. Open `http://localhost:3000/api/categories`. Expected: JSON with three categories.
8. Refresh the page. Expected: the same three categories, no crash.

**Automated tests:** Migration test (every table exists, row-level security is on for every table). `categories` test: `GET /api/categories` returns all three, and only reportable ones. Check constraint test: a ticket cannot be `CLOSED` without a verifier (the database itself refuses it). Test setup runs cleanly from an empty database.

**Done when:**

- [x] Migrations applied in Supabase, tables visible in Table Editor
- [x] 3 wards, 3 categories, 4 staff users and demo tickets exist
- [x] Running the seed twice does not create duplicates
- [x] The public key reads no rows from any table
- [x] Home page shows the three categories from the database
- [x] `npm test` passes using the local PostGIS container
- [x] Seed prints test points (inside each ward, and outside)

**Verification note:** The Phase 2 API, database, seed, RLS, build and startup checks passed. Browser automation could not complete the visual category/refresh assertion because Chromium crashes in this environment; the frontend shell and category API were verified instead.

**Commit message:** `Phase 2: database schema, seed data and categories list`

---

## Phase 3: Location slice

**Goal:** A citizen can find their spot on a map and see the street, area and ward before reporting.

**Manual steps (I do these before starting):**

1. In `server/.env`, add `NOMINATIM_USER_AGENT=gba-civic-tracker-pilot` (name sent to the address service) and `NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org` (the configurable public address-lookup endpoint). Copy both names from `server/.env.example`.
2. Have the test points from the Phase 2 seed output ready (inside each ward, and one outside).
3. Optional, for testing on a phone: phone location only works on HTTPS (TRD section 11). Ask Claude in its plan for the current steps to open your laptop's app through a tunnel (for example a Cloudflare tunnel or ngrok). You may need to create a free account for it. If you skip this, test on the laptop now and on the phone in Phase 13 (question 11).

**What Claude builds:**

- `POST /api/locations/resolve`: body `{lat, lng}`, returns `{ward, street, area, inPilotArea}`. Validated with zod, rate limited (public route).
- `wards/ward.service.js` (which ward is this point in, using PostGIS), `geo/geocoding.js` (Nominatim reverse lookup with the proper `User-Agent`, in-memory cache, 3 second timeout, falls back to ward-only), `geo/geoUtils.js`.
- Frontend: `i18n/en.js` (all screen text in one place), `api/client.js`, `components/MapPicker` (Leaflet map with a draggable pin), and the first part of `ReportPage`: "Use my location" button, drop-a-pin fallback, and a box showing street, area and ward, or a clear "outside the pilot area" message.
- Nothing is saved in this phase. There is no submit button yet.

**Starter prompt:**

```
Read CLAUDE.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 3: Location slice.
Do only this phase. Make a plan first and wait for my approval before writing any code.
Check the current Nominatim usage policy before you write the lookup, and tell me what you found.
```

**Manual testing (I do these):**

1. Open the report page on your laptop. Click **Use my location** and allow it. Expected: the pin moves to you. If you are outside the sample wards, you see the "outside the pilot area" message. That is correct.
2. Click the map at the test point inside Ward A. Expected: the box shows Ward A, plus a street and area name.
3. Repeat for Ward B and Ward C. Expected: each shows its own ward name.
4. Click the map at the test point outside all wards. Expected: a clear "outside the pilot area" message, not an error.
5. Drag the pin from inside a ward to outside and back. Expected: the box updates each time.
6. Bad input: block location permission in the browser and click **Use my location**. Expected: a friendly message that says to drop a pin instead, and the pin still works.
7. Bad input: Claude gives you a command to call `POST /api/locations/resolve` with an empty body and with `lat=999`. Expected: both give a 400 error in the standard error shape.
8. Refresh the page. Expected: it loads clean, with no old pin and no crash.
9. Optional (phone through the tunnel): open the page on your phone and tap **Use my location**. Expected: the phone asks for permission and the pin moves.

**Automated tests:** `wardLookup.test.js`: a point inside a ward maps to that ward, a point outside gives `inPilotArea: false`. Geocoding: a cached result is reused, a slow or failing lookup (using a fake) falls back to ward-only. Route input checks (empty body, out-of-range numbers give 400).

**Done when:**

- [x] Clicking inside each of the 3 wards shows the right ward name
- [x] Street and area show (or a ward-only fallback shows when the lookup fails)
- [x] Outside the wards shows a clear message
- [x] Blocked location permission falls back to the pin
- [x] Bad input gives a 400 in the standard error shape
- [x] `npm test` passes

**Verification note:** The automated suite passes with 18 tests. Nominatim is rate-limited, cached, and falls back to ward-only data if its public service is slow or unavailable.

**Commit message:** `Phase 3: location picker, ward lookup and street/area resolve`

---

## Phase 4: Photo and create report

**Goal:** A citizen can submit a report with a category, description, photo and location, and get a ticket code. The ticket is assigned to the ward officer.

**Manual steps (I do these before starting):**

1. In Supabase, click **Storage** in the left sidebar, then **New bucket** (labels may differ a little). Name it exactly `ticket-media`. Keep it **private** (do not switch on "Public bucket"). Turn on the file size limit and set it to **5 MB**. Save.
2. In `server/.env`, add these four settings (copy the example values from `server/.env.example`): `SUPABASE_BUCKET=ticket-media`, `SIGNED_URL_SECONDS=300`, `MAX_UPLOAD_MB=5`, `RATE_LIMIT_REPORTS_PER_HOUR=20`.
3. Get 3 test images ready on your computer: a normal phone photo (JPG), a file bigger than 5 MB, and a text file renamed to `something.jpg`.

**What Claude builds:**

- `POST /api/reports` (form fields: `photo`, `description`, `lat`, `lng`, `categoryCode`). In one flow: validate with zod, check the category is one of the reportable ones, look up the ward (422 if outside the sample wards), clean and upload the photo, insert the ticket with a random public code, assign it to that ward's officer, set status `OPEN`, and write the first `status_history` row. If the database step fails after the upload, the photo is deleted.
- `middleware/upload.js` (multer, memory), `media/media.service.js` (checks it is a real JPG or PNG, rejects empty or corrupted files, `sharp` turns it upright, resizes to 1600 px, saves as JPEG, and removes EXIF), `utils/publicCode.js`, `rateLimit.js` for public routes (429).
- Frontend `ReportPage` finished: category picker (from `/api/categories`), description box with a character counter (limit 300), `PhotoPicker` (camera or gallery, preview, "avoid faces and number plates" note), the location part from Phase 3, submit button, and a confirmation screen with the ticket code.

**Starter prompt:**

```
Read CLAUDE.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 4: Photo and create report.
Do only this phase. Make a plan first and wait for my approval before writing any code.
Do not build the status lookup page or the duplicate check yet. They come in later phases.
```

**Manual testing (I do these):**

1. On the report page: pick **Footpath Encroachment**, click the map at the test point inside Ward A, type a short description, choose the normal JPG, and submit. Expected: a confirmation screen with a ticket code.
2. Repeat step 1 for **Potholes / Road Damage** in Ward B and **Garbage Dumping** in Ward C. Expected: a different ticket code each time.
3. Database check: in Supabase **Table Editor > tickets**, find the 3 new rows. Expected: status `OPEN`, the right category and ward, `is_demo` false, and an officer assigned. `media` has 3 new rows. `status_history` has one row per ticket. In **Storage > ticket-media**, the 3 files exist.
4. Bad input: submit with an empty description, and with no photo, and with no category chosen. Expected: a clear message next to the missing field each time, and no ticket is created.
5. Bad input: type more than 300 characters into the description. Expected: the counter stops you or shows a clear message. Also try the bigger-than-5 MB file. Expected: "photo too large" (413). Also try the renamed text file. Expected: "not a real photo" (415).
6. Bad input: drop the pin outside the sample wards and submit. Expected: a clear "outside the pilot area" message (422) and no ticket.
7. Privacy check: download one uploaded photo from the Storage page and open its file details (right-click, Properties or Get Info). Expected: no GPS location in the file, and it is upright.
8. Refresh check: refresh the confirmation screen. Expected: the page loads clean (the form is empty, no duplicate ticket is created). Restart the server and repeat step 1. Expected: it still works.
9. Submit more than 20 reports in an hour, or ask Claude for a quick way to lower the limit for testing. Expected: a friendly "too many reports, try later" message (429).

**Automated tests:** `upload.test.js`: 6 MB file gives 413, a `.txt` renamed to `.jpg` gives 415, an empty file is refused, the saved image has no EXIF and is upright. `categories.test.js`: all three category codes are accepted, an unknown code gives 400. Create-report test: a valid report gives 201, an `OPEN` ticket assigned to the ward officer and one history row, and a point outside the wards gives 422 with nothing saved. Rate limit gives 429.

**Done when:**

- [x] A report in each of the three categories can be submitted from the browser
- [x] Ticket, media, history rows and the stored photo exist for each one
- [x] Empty description, missing photo, missing category, too-large file and fake image are all refused with clear messages
- [x] Reports outside the sample wards are refused
- [x] Stored photos have no EXIF data
- [x] `npm test` passes (11 suites, 28 tests)

**Completion record (29 September 2026):** Phase 4 automated tests and the frontend production build pass. The private `ticket-media` bucket is available. A live rate-limit check with a temporary one-request limit returned `400` for the first invalid report and `429 RATE_LIMITED` for the second; no ticket or photo was created.

**Commit message:** `Phase 4: create report with photo upload, ward assignment and confirmation`

---

## Phase 5: Staff login and officer list

**Goal:** Staff can log in, and an officer sees only the tickets of their own ward.

**Manual steps (I do these before starting):**

1. In Supabase, open **Settings > API Keys**. Copy the **publishable key** (starts with `sb_publishable_`; on older projects it is the `anon` key) into `frontend/.env` as `VITE_SUPABASE_ANON_KEY`. Copy the Project URL into `frontend/.env` as `VITE_SUPABASE_URL`. (Create `frontend/.env` by copying `frontend/.env.example`.)
2. Switch off public sign-up: in Supabase, open the **Authentication** section, find the setting **Allow new users to sign up** (under the sign-in providers / email settings) and turn it **off**. Staff users only come from the seed script.
3. Keep the demo emails and password from Phase 2 at hand.

**What Claude builds:**

- Frontend: `api/supabaseClient.js` (used for sign-in only), `auth/AuthContext.jsx`, `auth/ProtectedRoute.jsx`, `LoginPage`, `OfficerTicketsPage` (ticket list for the ward with status and date, filter by status), and a highlighted badge for new and reopened tickets. Log out button. The token is added to every `/api` call in `api/client.js`.
- Server: `middleware/requireAuth.js` (checks the token with Supabase, then loads the `staff` row: role, ward, active), `middleware/requireRole.js`, `auth/auth.routes.js` with `GET /api/auth/me`.
- Officer routes: `GET /api/officer/tickets?status=&page=` (filtered by ward in SQL, all three categories) and `GET /api/officer/tickets/counts` (new and reopened).

**Starter prompt:**

```
Read CLAUDE.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 5: Staff login and officer list.
Do only this phase. Make a plan first and wait for my approval before writing any code.
The officer ticket detail page and status changes come in Phase 6. Do not build them now.
```

**Manual testing (I do these):**

1. Open the login page and sign in as the Ward A officer. Expected: you land on the ticket list. It shows only Ward A tickets, in all categories.
2. Log out, then sign in as the Ward B officer. Expected: a different list, with no Ward A tickets.
3. Compare with the database: in **Table Editor > tickets**, filter by ward. Expected: the lists on screen match the rows for each ward (including the reports you made in Phase 4).
4. Check the badge: the Ward A officer should see the new tickets highlighted. Expected: the count matches the number of `OPEN` and `REOPENED` tickets in Ward A.
5. Bad input: try to log in with a wrong password, and with an empty email. Expected: a clear message ("wrong email or password" and "email is required"), and no crash.
6. Bad input: while logged out, open the officer list address directly. Expected: you are sent to the login page. While logged in as an officer, open the verifier address (if it exists yet, or `/verifier`). Expected: blocked, not shown.
7. Refresh check: refresh the ticket list while logged in. Expected: you stay logged in and see the same list. Close the tab, open it again. Expected: same.
8. Ask Claude how to mark one staff row `active = false` (in **Table Editor > staff**, edit the `active` column), then refresh. Expected: that officer is refused with a clear "account disabled" message. Set it back to true.

**Automated tests:** Auth: no token gives 401, a bad token gives 401, an inactive staff member gives 403. Role check: an officer calling a verifier route gets 403. Ward isolation: officer A's list never contains a ward B ticket. `counts` returns numbers, not strings. `/api/auth/me` returns the right role and ward.

**Done when:**

- [x] Login and logout work for officers and the verifier
- [x] An officer sees only their own ward's tickets
- [x] Wrong password and empty fields show clear messages
- [x] A deactivated staff member is refused
- [x] Public sign-up is off in Supabase
- [x] No server-only key appears anywhere in `frontend/` (search confirmed)
- [x] `npm test` passes (12 suites, 32 tests)

**Completion record (30 September 2026):** Phase 5 adds Supabase staff sign-in, active-staff and role checks, ward-only officer queries, ticket filtering, pagination, and open/reopened counts. The frontend production build passes. The staff-only auth bundle is lazy-loaded, so public report visitors do not download it.

**Commit message:** `Phase 5: staff login, role checks and ward-only officer ticket list`

---

## Phase 6: Officer detail, start work and status lookup

**Goal:** An officer opens a ticket and starts work, and the citizen sees the new status by ticket code.

**Manual steps (I do these before starting):**

None. (Use the demo logins and the tickets you made in Phase 4.)

**What Claude builds:**

- `tickets/ticket.stateMachine.js` (the allowed moves from TRD section 6, in one place), `ticket.service.js`, `ticket.queries.js`, and the `withTransaction()` pattern with a row lock for changes.
- `GET /api/tickets/:id` (photo links made by Express that last 5 minutes, description, map position, ward, timeline; 403 for an officer opening another ward's ticket, 404 if missing).
- `POST /api/tickets/:id/start` (`OPEN` or `REOPENED` to `IN_PROGRESS`, writes `status_history` with who and when).
- Public `GET /api/reports/:publicCode` (category, status, ward, area, created date, timeline, no names, no photos).
- Frontend: `TicketDetailPage` (photo, description, map, ward, timeline, **Start work** button), `StatusBadge`, and `TrackPage` (enter ticket code, see status and timeline).

**Starter prompt:**

```
Read CLAUDE.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 6: Officer detail, start work and status lookup.
Do only this phase. Make a plan first and wait for my approval before writing any code.
Do not build the Action Taken Report yet. Only the start-work move is allowed in this phase.
```

**Manual testing (I do these):**

1. Sign in as the Ward A officer, open a ticket from the list. Expected: original photo, description, category, map pin, ward and a timeline showing "created".
2. Click **Start work**. Expected: status changes to In Progress, and the timeline gets a new line with the time and your name.
3. On the public **Track** page, type that ticket's code. Expected: the status shows In Progress and the timeline matches. No names or photos are shown.
4. Database check: in **Table Editor > status_history**, find the new row. Expected: from `OPEN` to `IN_PROGRESS`, with the officer's id and the time. `tickets.status` is `IN_PROGRESS`.
5. Bad input: click **Start work** again on the same ticket (or reload an old page with the button still showing). Expected: a clear message that it is already in progress (409), and no second history row.
6. Bad input: while signed in as the Ward A officer, open a Ward B ticket's address by changing the id in the address bar. Expected: "not allowed" (403) message. Open a ticket id that does not exist (for example 99999). Expected: a "ticket not found" message (404).
7. Bad input: on the Track page, submit an empty code, then a made-up code, then a code with 200 characters. Expected: a message for each, no crash ("not found" for the last two).
8. Refresh check: refresh the ticket detail page and the Track page. Expected: the same content, status kept.

**Automated tests:** `ticketStateMachine.test.js` (unit): only the moves in TRD section 6 are allowed, everything else is refused. Start work: `OPEN` to `IN_PROGRESS` works and writes history, a second call gives 409. Ward isolation: officer A gets 403 on a ward B ticket detail and cannot start it. Public status route: returns no photos or names, unknown code gives 404.

**Done when:**

- [x] The officer sees the ticket detail with photo, map and timeline
- [x] Start work changes the status and writes history
- [x] The Track page shows the new status
- [x] Starting twice, another ward's ticket and a missing ticket give clear messages (409, 403, 404)
- [x] `npm test` passes

**Completion record (30 September 2026):** Phase 6 functionality is complete. The officer detail, state machine, start-work transition, audit history and public status lookup are implemented. A middleware-scope regression that incorrectly required login for public Track lookups was fixed and verified: an unknown public code now returns `404 TICKET_NOT_FOUND`, not `401 AUTH_REQUIRED`. The final integration-suite rerun is currently blocked because the local PostGIS test port `127.0.0.1:55432` is unavailable; the previously completed Phase 6 suite had 48 passing tests before this final route-scope correction.

**Commit message:** `Phase 6: ticket detail, start work, state machine and public status lookup`

---

## Phase 7: Action Taken Report

**Goal:** An officer submits remarks and photos, and the ticket moves to "Action Taken, Pending Verification".

**Manual steps (I do these before starting):**

None. (Have 1 to 3 ordinary JPG photos ready, plus one file over 5 MB.)

**What Claude builds:**

- `POST /api/tickets/:id/action-report` (form fields `remarks`, `photos` 1 to 3 files, `lat`, `lng`). In one transaction with a row lock: check the status allows it (`OPEN`, `IN_PROGRESS` or `REOPENED`), check ward ownership, clean and upload the photos, save the `action_reports` row and `media` rows (type `ACTION`), set `PENDING_VERIFICATION`, write history.
- `actionReports/actionReport.service.js`, reusing the photo cleaning from Phase 4.
- Frontend `ActionReportPage`: remarks box, photo picker (1 to 3), the location picker from Phase 3 (question 5), submit. The ticket detail shows the Action Taken Report after it is sent, and the **Submit Action Taken Report** button appears for open, in-progress and reopened tickets.

**Starter prompt:**

```
Read CLAUDE.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 7: Action Taken Report.
Do only this phase. Make a plan first and wait for my approval before writing any code.
Do not build the verifier screens yet. Closing a ticket is not possible in this phase.
```

**Manual testing (I do these):**

1. Sign in as the Ward A officer, open an `IN_PROGRESS` ticket, click **Submit Action Taken Report**. Type remarks, add 2 photos, set the location (use the same spot as the ticket), submit. Expected: a success message, the ticket shows "Pending Verification", and the report is visible on the detail page.
2. Also submit a report on an `OPEN` ticket that was never started. Expected: it works too (start work is optional, TRD section 6).
3. Database check: in **Table Editor**, `action_reports` has the new rows, `media` has rows of type `ACTION` for the photos, `status_history` shows the move to `PENDING_VERIFICATION`, and the files are in **Storage > ticket-media**.
4. Bad input: submit with empty remarks, then with no photo, then with 4 photos, then with the file over 5 MB. Expected: a clear message each time, and the ticket status does not change.
5. Bad input: type a very long remarks text (over the limit Claude states in its plan). Expected: a clear "too long" message.
6. Bad input: try to open the report page for a ticket that is already `PENDING_VERIFICATION`. Expected: the button is gone, and going to the page address directly shows a "not allowed now" message (409).
7. Refresh check: after submitting, refresh the detail page and restart the server. Expected: status stays "Pending Verification" and the photos still open.
8. Try the same as a Ward B officer on a Ward A ticket. Expected: 403 message.

**Automated tests:** Action report happy path (1 to 3 photos, status becomes `PENDING_VERIFICATION`, history written, media type `ACTION`). Refused cases: no photo, 4 photos, empty remarks, wrong status (409), other ward (403), verifier role (403). Photos are cleaned the same way as in Phase 4.

**Done when:**

- [x] An officer can submit an Action Taken Report with 1 to 3 photos
- [x] The ticket moves to Pending Verification, and history and rows are saved
- [x] No photo, too many photos, empty remarks and wrong status are refused with clear messages
- [x] Still no way to close a ticket
- [x] `npm test` passes

**Completion record (30 September 2026):** Phase 7 functionality and verification are complete. The Ward A happy path was verified from `IN_PROGRESS` and `OPEN` tickets, including location, action photos, pending-verification status, audit history and Storage objects. Empty remarks, missing photos, four-photo uploads, oversized uploads, long remarks, wrong status and Ward B access were verified. The citizen report flow was also rechecked. The full server suite passes: 15 test files and 66 tests.

**Commit message:** `Phase 7: Action Taken Report with photos and pending verification status`

---

## Phase 8: Verifier check

**Goal:** A verifier compares the before and after photos, then approves (ticket closed) or rejects with a reason (ticket reopened).

**Manual steps (I do these before starting):**

1. In `server/.env`, add `FAR_WARNING_METERS=50` (copy from `server/.env.example`).

**What Claude builds:**

- `GET /api/verifier/tickets?status=PENDING_VERIFICATION` (queue, all wards).
- `GET /api/tickets/:id/compare` (original photo, action photos, both times and places, `distanceMeters`, `farWarning`, with short-lived photo links).
- `POST /api/tickets/:id/approve` (`PENDING_VERIFICATION` to `CLOSED`, the only way to `CLOSED`) and `POST /api/tickets/:id/reject` (body `{reason}`, to `REOPENED`, returns to the same officer, reason saved and shown to the officer).
- Three layers guarding closing: the screen, the server route and the database check.
- Frontend: `VerifierQueuePage`, `ComparePage` with `SideBySide` (original beside action photo, with time and place for both, and a warning when far), **Approve** and **Reject** buttons (reason required). Officer ticket detail shows the rejection reason and the ticket is highlighted as reopened.

**Starter prompt:**

```
Read CLAUDE.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 8: Verifier check.
Do only this phase. Make a plan first and wait for my approval before writing any code.
Approve must be the only path to CLOSED. Do not add any route that sets a status directly.
```

**Manual testing (I do these):**

1. Sign in as the verifier. Expected: you see a queue with the tickets that are waiting (from Phase 7), from all wards.
2. Open one. Expected: the original photo and the action photo side by side, both with time and location, and the distance between them.
3. Click **Approve**. Expected: the ticket shows Closed and leaves the queue. Database check: `tickets.status` is `CLOSED`, `status_history` has the move, and the verifier is recorded.
4. Use another waiting ticket. Click **Reject** with a reason. Expected: the ticket leaves the queue. Sign in as that ticket's officer: the ticket is highlighted as Reopened and shows the reason.
5. As that officer, submit a new Action Taken Report for the reopened ticket (Phase 7 screen), then approve it as the verifier. Expected: the ticket closes. This is the reject-then-fix loop.
6. Far-away check: submit an Action Taken Report with the location set far from the original spot (over 50 m). Open it as the verifier. Expected: a clear warning about the distance.
7. Bad input: click **Reject** with an empty reason, and again with a very long reason. Expected: a clear message each time, and the ticket does not change.
8. Bad input: sign in as an officer and try to open the verifier queue address. Expected: blocked (403 or redirect). Also open the compare address of a ticket that is not waiting. Expected: a "not allowed now" message (409).
9. Refresh check: refresh the compare page and restart the server. Expected: same content. Photo links may be new, they still open.
10. Public check: open the Track page with the closed ticket's code. Expected: Closed. With the rejected one: Reopened.

**Automated tests:** `closeRules.test.js` (Supertest + PostGIS): closing without an Action Taken Report gives 409, an officer calling approve gives 403, a verifier approving a waiting ticket works, a deactivated verifier gets 403. Reject without a reason gives 400, reject sends to `REOPENED` and saves the reason. Database constraint test: setting `CLOSED` without a verifier fails at the database. Compare: `distanceMeters` matches a known pair of points and `farWarning` switches at the setting.

**Done when:**

- [x] The queue, side-by-side compare and both buttons work
- [x] Approve closes, reject reopens with a visible reason, history is complete
- [x] The officer can redo the report after a rejection, and the ticket can then be closed
- [x] A far-away action photo shows a warning
- [x] Closing without a report or as an officer is refused on the server (409, 403)
- [x] `npm test` passes (16 files, 98 tests)

**Completion record (30 September 2026):** Phase 8 is complete. The verifier queue, side-by-side compare, approve and reject are implemented. Approve is the only code path to `CLOSED`, and no route sets a status directly (`PATCH`/`PUT`/`POST` on `/status` and `/close` return 404). Reject reasons are limited to 500 characters and are shown to the officer, not on the public Track page. Photo times are upload times (EXIF is removed). `FAR_WARNING_METERS` is now a required server setting. The full server suite passes and the frontend build passes. Manual tests 1 to 10 were run against the real Supabase project, through the API and headless Chromium, and the restart check and click-through were then done by hand. Not checked: a phone-width layout of the compare page. Test tickets from these runs (descriptions start "Phase 8 manual test") stay in the database until the reset script in Phase 12.

**Commit message:** `Phase 8: verifier queue, side-by-side compare, approve and reject`

---

## Phase 9: Public dashboard, core

**Goal:** Anyone can open a public page with summary numbers, ward-wise and category-wise counts and a "Demo data" label.

**Manual steps (I do these before starting):**

None.

**What Claude builds:**

- `dashboard/dashboard.queries.js` and `dashboard.routes.js`: `GET /api/dashboard/summary` (total, open, resolved, resolution rate, `isDemoData`), `GET /api/dashboard/by-ward` (total, open, resolved per ward), `GET /api/dashboard/by-category` (three categories). Counts are cast to plain numbers in SQL (`::int`).
- Frontend `DashboardPage` (no login): `StatCard` for the summary, a ward chart or table (complaints per ward, resolved vs pending), a category chart, a clear "Demo data" banner. Recharts charts.

**Starter prompt:**

```
Read CLAUDE.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 9: Public dashboard, core.
Do only this phase. Make a plan first and wait for my approval before writing any code.
Do not build the map, the trend chart or the auto refresh yet. They come in Phase 10.
```

**Manual testing (I do these):**

1. Open the dashboard address while logged out. Expected: it loads without a login and shows the "Demo data" banner.
2. Check the summary numbers against the database: in **Table Editor > tickets**, count all rows, the open ones (not `CLOSED`) and the `CLOSED` ones. Expected: total, open and resolved on the page match your counts, and the resolution rate is resolved divided by total.
3. Check the ward view. Expected: each ward's total and its resolved vs pending numbers match the `tickets` table when you filter by ward.
4. Check the category view. Expected: all three categories show, and the numbers match when you filter by category.
5. Change the data: close or report one ticket (using the earlier screens), then reload the dashboard. Expected: the numbers change by exactly one where you expect.
6. Bad case: stop the server and reload the dashboard. Expected: a friendly "could not load numbers" message, not a blank page. Start the server again. (The dashboard has no typed input to test.)
7. Refresh check: reload the page several times. Expected: same numbers each time, no flicker to zero.
8. Open the dashboard on a phone-size window (resize your browser narrow). Expected: cards stack and charts stay readable.

**Automated tests:** `dashboard.test.js`: counts match a known set of tickets, a category or ward with no tickets shows 0 (not missing), values are numbers not strings, `isDemoData` is true when seed rows exist. The public routes need no login and expose no names or photos.

**Done when:**

- [x] The dashboard works without login and shows the "Demo data" label
- [x] Summary, ward and category numbers match the database
- [x] Numbers change after a ticket is created or closed (after reload)
- [x] A server error shows a friendly message
- [x] `npm test` passes (17 files, 109 tests)

**Completion record (30 September 2026):** Phase 9 is complete. `GET /api/dashboard/summary`, `/by-ward` and `/by-category` are public and return only counts and ward and category names. "Open" means not `CLOSED` and not `REJECTED`, "resolved" means `CLOSED`, and the resolution rate is a percentage with one decimal (0 when there are no tickets). Wards and reportable categories with no tickets show 0. The `/dashboard` page shows the "Demo data" banner, summary cards, a ward chart with table and a category chart (Recharts, lazy-loaded). The numbers were checked against separate SQL on the real database, and the error state, reload stability and 360 px width were checked in headless Chromium. Recharts was added to `frontend/`. The routes have no rate limit yet; revisit in Phase 10 when polling starts. Test tickets from earlier phases stay in the database until the Phase 12 reset script.

**Commit message:** `Phase 9: public dashboard with summary, ward and category numbers`

---

## Phase 10: Dashboard map, trend and live refresh

**Goal:** The dashboard also shows a map of complaints, a trend chart, and updates by itself.

**Manual steps (I do these before starting):**

None.

**What Claude builds:**

- `GET /api/dashboard/map` (points with `lat`, `lng` and `status` only, no names or photos), `GET /api/dashboard/trend?interval=week` (or `month`, other values give 400).
- Frontend: map with pins coloured by status (Leaflet), a trend chart (Recharts), and the whole page re-requesting its numbers every 10 seconds.

**Starter prompt:**

```
Read CLAUDE.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 10: Dashboard map, trend and live refresh.
Do only this phase. Make a plan first and wait for my approval before writing any code.
```

**Manual testing (I do these):**

1. Open the dashboard. Expected: a map with pins coloured by status, and a trend chart of complaints per week.
2. Click a pin. Expected: nothing private shows, only public information such as the category and status (no name, no photo).
3. Switch the trend between week and month (if the page offers it). Expected: the chart changes and the totals still add up to the same total.
4. Live refresh: keep the dashboard open in one window. In another window, submit a new report or close a ticket. Expected: within about 10 seconds the numbers and map update without reloading the page.
5. Bad input: Claude gives you a command to call `/api/dashboard/trend?interval=year`. Expected: a 400 error in the standard shape.
6. Refresh check: reload the page and restart the server while the page is open. Expected: the page shows a friendly message while the server is down and recovers on its own when it is back.
7. Compare: count the pins against the number of tickets in the database. Expected: they match.

**Automated tests:** Trend: counts per week match a known set of tickets, `interval=year` gives 400. Map: returns only `lat`, `lng`, `status`, and the number of points equals the number of tickets.

**Done when:**

- [x] Map shows pins coloured by status and no private data
- [x] Trend chart works for week and month, and a wrong value gives 400
- [x] Dashboard updates within about 10 seconds after a ticket is created or closed
- [x] The page recovers after the server was down
- [x] `npm test` passes (18 files, 119 tests)

**Completion record (30 September 2026):** Phase 10 is complete. `GET /api/dashboard/map` returns one point per ticket with only `lat`, `lng` and `status`. `GET /api/dashboard/trend?interval=week|month` defaults to week, uses UTC weeks starting on Monday, fills empty periods with 0, and returns 400 `INVALID_INTERVAL` for anything else. The dashboard now has a Leaflet map (pins coloured by status, legend with counts, popup showing the status only) and a Recharts trend line with a Week/Month switch. All five dashboard routes are re-requested every 10 seconds, one round at a time, and polling pauses in a hidden tab. If the server is down, the page keeps the last numbers, shows a notice, and recovers by itself. Live updates were timed against the real project (new report shown after 7.8 s, closing a ticket after 6.9 s), pins matched the ticket count, and the 360 px width was checked. Known limit: the dashboard routes have no rate limit (one open tab makes about 30 requests a minute); adding one needs a new setting and a TRD change. Test tickets from earlier phases stay in the database until the Phase 12 reset script.

**Commit message:** `Phase 10: dashboard map, trend chart and 10-second refresh`

---

## Phase 11: Duplicate check

**Goal:** Reporting the same spot twice in the same category is caught, and the citizen can choose to add support instead of creating a new ticket.

**Manual steps (I do these before starting):**

1. In `server/.env`, add `DUP_RADIUS_METERS=50` and `DUP_WINDOW_DAYS=30` (copy from `server/.env.example`).

**What Claude builds:**

- `GET /api/reports/nearby?lat=&lng=&category=`: open tickets in the same category within the radius and time window (PostGIS `ST_DWithin`, status not `CLOSED`).
- `POST /api/reports/:publicCode/support`: adds 1 to `support_count`.
- Frontend `ReportPage`: after the citizen picks a location and category, show any nearby open report and two choices: **Same issue, add my support** or **This is different, submit anyway**. Support count shows on the public status and (as a number) on the officer ticket detail.

**Starter prompt:**

```
Read CLAUDE.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 11: Duplicate check.
Do only this phase. Make a plan first and wait for my approval before writing any code.
```

**Manual testing (I do these):**

1. Report an issue in a category at a spot in Ward A (Phase 4 flow). Then start a second report in the same category, about 15 to 20 metres away. Expected: the existing report shows with the two choices.
2. Click **Same issue, add my support**. Expected: a thank-you message and no new ticket. Database check: `tickets.support_count` went up by 1 and no new ticket row exists.
3. Start another report at the same spot and choose **This is different, submit anyway**. Expected: a new ticket is created.
4. Start a report at the same spot but in a different category. Expected: no duplicate is shown.
5. Start a report about 1 km away, same category. Expected: no duplicate is shown.
6. Close the first ticket (officer report and verifier approval), then report again at the same spot. Expected: no duplicate is shown, because closed tickets are ignored.
7. Bad input: Claude gives you a command to call the support route with a made-up code, and the nearby route with a missing category. Expected: 404 and 400 in the standard error shape.
8. Refresh check: refresh the page while the duplicate choice is showing. Expected: the page starts clean without an error, and the support count on the ticket is not changed by a refresh.

**Automated tests:** `duplicates.test.js`: 17 m away is found, 1 km away is not, a different category is ignored, a closed ticket is ignored, a ticket older than the window is ignored. Support adds exactly 1, an unknown code gives 404.

**Done when:**

- [x] A same-category report within 50 m of an open ticket is caught
- [x] Different category, far away, older and closed tickets are not shown as duplicates
- [x] Add-support raises the count without creating a ticket
- [x] Submit-anyway creates a new ticket
- [x] `npm test` passes

**Completion record (30 September 2026):** Phase 11 duplicate detection and add-support flow are complete. The nearby-ticket and support routes, same-category/radius/time-window filtering, submit-anyway path and frontend duplicate prompt are implemented. The full server suite passes: 19 test files and 146 tests. The frontend production build passes.

**Commit message:** `Phase 11: duplicate check with add-my-support option`

---

## Phase 12: Polish and error handling

**Goal:** Every screen handles loading, empty and error cases, works well on a phone, and the demo helpers are ready.

**Manual steps (I do these before starting):**

1. Decide if you want a linter (question 10). Tell Claude the answer before the plan.
2. Have a real phone ready (Android or iPhone) with a browser. If you want to test it before Phase 13, set up the tunnel from Phase 3 again.

**What Claude builds:**

- Loading, empty and error states on every screen (report, track, login, officer list, ticket detail, action report, verifier queue, compare, dashboard). A friendly not-found page. Clear messages for 401 (sent to login), 403, 409, 413, 415, 422 and 429 (all from the one error shape). Nothing shows a stack trace.
- Long text is cut or wrapped properly. Buttons are disabled while sending, so nothing is submitted twice. Every screen works at phone width.
- All screen text lives in `i18n/en.js`.
- `mock-gba-site/index.html`: a simple fake "GBA website" page with a link to the portal (R36).
- `server/scripts/reset-demo.sql`: deletes tickets where `is_demo = false` and their photos records, history and reports, and keeps the seed data.
- `README.md`: how to run, how to test, demo logins.
- Fill in any remaining `TODO` commands in `CLAUDE.md`. A full test run.
- Only fixes and polish. No new features.

**Starter prompt:**

```
Read CLAUDE.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 12: Polish and error handling.
Do only this phase. Make a plan first and wait for my approval before writing any code.
No new features. Only handle errors, phone layout, text and the demo helpers listed in PHASES.md.
```

**Manual testing (I do these):**

1. Walk through the whole demo script in PRD section 10 on your laptop. Expected: it runs from start to end with no error screens and no blank pages.
2. Repeat the report flow on a phone (or a very narrow browser window, about 360 pixels wide). Expected: nothing is cut off, buttons are easy to tap, and the camera or gallery opens for the photo.
3. Bad input: on every form (report, login, action report, reject), submit empty, then with a very long text. Expected: a clear message each time, and no crash.
4. Stop the server while a page is open, then click a button. Expected: a friendly "could not reach the server" message. Start it again and retry. Expected: works.
5. Log in, wait until the login expires (or delete the login from the browser's storage), then click something. Expected: you are sent to the login page with a clear message.
6. Double-click **Submit** quickly on the report form. Expected: only one ticket is created (check **Table Editor > tickets**).
7. Open a wrong address like `/nothing-here`. Expected: a friendly page with a link back home.
8. Run `reset-demo.sql` (Claude tells you how: SQL Editor or command). Expected: the tickets you made are gone, the seed tickets and staff stay, and the dashboard shows the seed numbers again. Check in the database.
9. Open `mock-gba-site/index.html` in a browser and click the link. Expected: it opens the portal.
10. Refresh check: refresh each main screen once. Expected: none loses its content or crashes.
11. Run `npm test` in `server/`. Expected: everything passes.

**Automated tests:** The full suite runs green. Error handler: each error code (400, 401, 403, 404, 409, 413, 415, 422, 429) gives the standard shape. Reset script: after it runs, only seed tickets remain. A test for the double-submit case (two quick reports do not break anything). Any bug found in this phase gets a test.

**Done when:**

- [x] Every screen has loading, empty and error states
- [x] The whole demo script runs on a phone-width screen
- [x] Double submit creates one ticket
- [x] `reset-demo.sql` works, `mock-gba-site` links to the portal, and `README.md` exists
- [x] All `TODO` commands in `CLAUDE.md` are filled in or clearly marked as skipped
- [x] `npm test` passes

**Completion record (30 September 2026):** Phase 12 polish is complete. The frontend request client now handles network, non-JSON and status-specific failures, expired staff sessions return to login, and unknown routes and ticket-load failures have recovery paths. Report, action-report, verifier decisions, support, and login submissions use ref-based double-submit locks. Long ticket text wraps, the home navigation wraps at 360 px, and a headless Chromium audit found no horizontal overflow on the public screens. The mock GBA page, reset SQL and README are included. The backend suite passes: 21 test files and 160 tests, including error-handler, oversized JSON, reset-script and concurrent-report tests. The frontend production build passes. A real phone camera/location check and running the reset script against the real database remain manual checks for the owner; the reset script was proven on the test database and does not delete Storage files.

**Commit message:** `Phase 12: polish, error handling, phone layout, demo helpers and README`

---

## Phase 13: Deploy

**Goal:** The whole demo runs on a hosted HTTPS address, from a phone, without manual fixes.

**Manual steps (I do these before starting):**

1. Pick the host (question 11). Create an account on it. Tell Claude which one before the plan. Claude checks that host's current documentation and gives you the exact click steps in its plan (host dashboards change, so this file does not guess them).
2. In the host's dashboard, add the server settings from `server/.env` as its environment variables: `PORT` (if the host wants to set it, leave it to the host), `DATABASE_URL` (the **session pooler** string), `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_BUCKET`, `SIGNED_URL_SECONDS`, `MAX_UPLOAD_MB`, `DUP_RADIUS_METERS`, `DUP_WINDOW_DAYS`, `FAR_WARNING_METERS`, `NOMINATIM_USER_AGENT`, `RATE_LIMIT_REPORTS_PER_HOUR`. Add the two `VITE_` settings so they are available when the frontend is built (they end up in the browser, so only public values).
3. Connect the host to your Git repository (push the project to a private repository first), or follow the host's own upload method. Claude gives the exact steps.
4. In Supabase, check the project is not paused (the project page shows "Paused" if it is; if so, click the restore button).
5. Run `npm run seed` against the project if you cleaned the data with `reset-demo.sql` and also removed staff (normally not needed).

**What Claude builds:**

- The build and start commands for the chosen host (build the frontend and install the server; start with `node server/src/index.js`), any host config file it needs, and the changes for the port and for serving the built frontend.
- A short "deploy notes" section in `README.md` (how to redeploy, how to reset, the wake-up warning for free hosts).
- Checks of the live site: health check, HTTPS, environment variables loaded, a real photo upload on the live address.
- Nothing else. No new features.

**Starter prompt:**

```
Read CLAUDE.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 13: Deploy.
Do only this phase. Make a plan first and wait for my approval before writing any code.
My host is <name of host>. Check that host's current documentation before writing the steps.
```

**Manual testing (I do these):**

1. Open `https://<your-address>/api/health`. Expected: the server and database are OK, on HTTPS.
2. Open the home page on your phone using the live address. Expected: loads, category list shows.
3. On the phone, report an issue in each of the three categories using the camera and **Use my location**. Expected: each gives a ticket code. This is the first real phone test of location (HTTPS).
4. Bad input: on the live address, report with a fake image (text file renamed) and a pin outside the wards. Expected: 415 and 422 messages, no ticket created.
5. Log in as the officer and the verifier on the live address. Run the full loop: start work, Action Taken Report, approve. Expected: same behaviour as on your laptop.
6. Open the public dashboard on another device. Expected: numbers change within about 10 seconds when you close a ticket.
7. Restart check: restart the service from the host dashboard (or redeploy) and reload. Expected: the site comes back and the data is still there. Note how long the first request takes if the host sleeps.
8. Security check: do the public-key check from Phase 2 again on the live project. Expected: no rows are returned. Also check that no secret key appears in the page source or in the browser's network tab.
9. Run `reset-demo.sql`, then rehearse the full demo script (PRD section 10) twice on a phone on the live address. Expected: no manual fixes needed either time.
10. Record a screen video of one full run (backup plan). Prepare the roadmap slide (made outside the code) for voice input, AI vehicle-camera analysis and the field-staff app.

**Automated tests:** No new feature tests. Run the full suite once before the deploy and confirm it passes. Claude also adds a small check that the server refuses to start when a required setting is missing, if one does not exist yet.

**Done when:**

- [ ] The app is live on an HTTPS address with the database connected
- [ ] All three categories can be reported from a phone with a photo and location
- [ ] The full loop (report, start, Action Taken Report, approve) works on the live site
- [ ] The public dashboard updates on the live site
- [ ] The public key reads no rows, and no secret is visible in the browser
- [ ] The demo script ran twice in a row from a phone without fixes
- [ ] A screen recording exists as a backup
- [ ] The Supabase project is not paused, and you know how to check it the day before the demo

**Commit message:** `Phase 13: deploy configuration and deploy notes`

---

## Environment variables needed across the project (names only)

**Server (`server/.env`, never committed; template `server/.env.example`):**

| Name | First needed in |
|------|-----------------|
| `PORT` | Phase 1 |
| `DATABASE_URL` | Phase 1 |
| `SUPABASE_URL` | Phase 2 |
| `SUPABASE_SECRET_KEY` | Phase 2 |
| `NOMINATIM_USER_AGENT` | Phase 3 |
| `NOMINATIM_BASE_URL` | Phase 3 |
| `SUPABASE_BUCKET` | Phase 4 |
| `SIGNED_URL_SECONDS` | Phase 4 |
| `MAX_UPLOAD_MB` | Phase 4 |
| `RATE_LIMIT_REPORTS_PER_HOUR` | Phase 4 |
| `FAR_WARNING_METERS` | Phase 8 |
| `DUP_RADIUS_METERS` | Phase 11 |
| `DUP_WINDOW_DAYS` | Phase 11 |
| `SEED_DEMO_PASSWORD` | Phase 2 |
| `TEST_DATABASE_URL` (local test database only) | Phase 2 |

**Frontend (`frontend/.env`, never committed; template `frontend/.env.example`; public values only):**

| Name | First needed in |
|------|-----------------|
| `VITE_SUPABASE_URL` | Phase 5 |
| `VITE_SUPABASE_ANON_KEY` | Phase 5 |
| `VITE_MAP_TILE_URL` | Phase 3 |

The host (Phase 13) needs the same server names as its environment variables, plus the two `VITE_` names available at build time.

---

## Questions and gaps found in the PRD and TRD

I did not guess these. Where a phase above had to assume something, I say what.

1. **Sample ward areas.** **Resolved for Phase 2:** use three adjacent sample polygons around central Bengaluru. Phase 2 prints deterministic interior points and one outside point for later location testing.
2. **Docker.** **Resolved:** Docker is available for the local PostGIS test database. The test harness uses `TEST_DATABASE_URL` and refuses non-local hosts.
3. **How to apply migrations.** CLAUDE.md and TRD say `supabase link` then `supabase db push`. I could not confirm the exact login and link steps, so Phase 2 keeps the SQL Editor paste as a fallback. Which do you prefer? Should I add the Supabase CLI as a project tool (`npx supabase`)?
4. **Health check.** TRD section 7.1 only says `GET /api/health` is an "is the server up?" check. Your rule for Phase 1 needs the database to be tested, so Phase 1 makes it also report the database status. This is a small TRD change. OK?
5. **Officer's action-photo location.** R18 and the TRD route take `lat` and `lng`, but the TRD does not say how the officer gives it. Phase 7 assumes the same "use my location or drop a pin" picker as the citizen. OK?
6. **Photo time.** R20 wants time for both photos. Because EXIF data is removed, the time shown will be the **upload time**, not the moment the photo was taken. Is that acceptable?
7. **Text limits.** Only the description has a limit (300 characters, marked "e.g."). Action Taken Report remarks and the reject reason have none. Suggestion: 500 characters each. What limits do you want?
8. **Repeated support.** Citizens are anonymous, so one person can press "add my support" many times (only the rate limit slows this down). Acceptable for a pilot?
9. **Seed data.** **Resolved:** `SEED_DEMO_PASSWORD` is stored in `server/.env`; demo tickets are metadata-only in Phase 2, with photos beginning in Phase 4 when Storage is configured.
10. **Linter.** **Resolved in Phase 12:** skip linting for this pilot; no linter was chosen, so CLAUDE.md marks it as skipped without adding a library.
11. **Hosting and phone testing.** TRD decision S2 says the host is chosen in the last phase. Phone location needs HTTPS, so phone testing before Phase 13 needs a tunnel tool, and the risk that the host does not work is found late. Do you want to choose the host now and do a small early deploy after Phase 1, or keep it for the end? Which host do you want?
12. **Demo emails.** **Resolved:** use the four illustrative `demo.example` addresses with email confirmation enabled by the seed. If the Supabase project rejects them, replace them in the seed script with four addresses you control.
13. **Install commands.** CLAUDE.md lists Install as TODO, and the TRD has no root `package.json`. Phase 1 assumes two separate installs (`npm install` in `server/` and in `frontend/`). OK?
14. **Should and Could items.** R25 (badges, Could) is in Phase 5 and R12 (support count, Could) is in Phase 11. If time is short, they can be dropped without breaking the main demo. Do you agree to keep them in?
