# PHASES.md: Build Plan

| | |
|---|---|
| **Status** | Phase 14 not started (Phases 1 to 13 complete) |
| **Current phase** | Phase 14: Admin role, staff and category management |
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
| 13 | Deploy | The whole demo runs on a hosted HTTPS address, from a phone, without manual fixes. | (demo readiness) | Complete |
| 14 | Admin role, staff and category management | An admin can log in, manage staff and categories, and every admin change is audited. | R38, R39, R40, R48 | Not started |
| 15 | Assignment and complaint management | An admin can list all tickets with filters, assign unassigned tickets, reassign others, and see overdue ones. | R41, R42, R43 | Not started |
| 16 | Notifications (in-app) | Staff see a bell with an unread count and an inbox for the events that matter to them. | R44, R45 | Not started |
| 17 | Video evidence (OPTIONAL, last) | A short video can be added to a report and an Action Taken Report. Only if the owner says yes. | R49 | Not started |
| 18 | Analytics expansion (staff only) | Staff see resolution times, rejection and reopen rates, workload and age buckets, and admins can export a CSV. | R46, R47 | Not started |
| 19 | Hardening and role-boundary review | Every route is tested for every role, RLS is checked on every table, and the docs and demo helpers are up to date. | (security and demo readiness) | Not started |

Every requirement R1 to R49 sits in exactly one phase above (R23 starts in Phase 4 and every later status change keeps it true; R48 starts in Phase 14 and every later admin write keeps it true).

**Execution order for Phases 14 to 19: 14, 15, 16, 18, 19, then 17 only if the owner says yes.** Phase 17 is optional and last, so the table order and the build order differ on purpose. Phase 17 needs the owner to confirm the video limits before its plan is written. Because Phase 17 may come after Phase 19, Phase 19's tests and docs must still pass without it, and Phase 17 updates them if it is built.

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

1. Create or sign in to Vercel and connect the Git repository. Create two Vercel projects from it: one with root directory `frontend`, and one with root directory `server`.
2. In the frontend project's Preview and Production environments, add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAP_TILE_URL`, `VITE_API_BASE_URL` (the API project's HTTPS origin), and `VITE_MAX_UPLOAD_MB=5`.
3. In the API project's Preview and Production environments, add `PORT` (for local-compatible startup), `DATABASE_URL` (the **session pooler** string), `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `FRONTEND_ORIGINS`, `SUPABASE_BUCKET`, `SIGNED_URL_SECONDS`, `MAX_UPLOAD_MB`, `DUP_RADIUS_METERS`, `DUP_WINDOW_DAYS`, `FAR_WARNING_METERS`, `NOMINATIM_USER_AGENT`, and `RATE_LIMIT_REPORTS_PER_HOUR`. The secret key stays only in the API project.
4. In Supabase, check the project is not paused (the project page shows "Paused" if it is; if so, click the restore button).
5. Run `npm run seed` against the project if you cleaned the data with `reset-demo.sql` and also removed staff (normally not needed).

**What Claude builds:**

- Vercel project configuration for the Vite SPA and the Express Function entrypoint, while keeping local `npm run dev` and `node server/src/index.js` working.
- Browser-side image resizing so ordinary reports and 1-to-3-photo action reports stay below Vercel's Function request limit while original files over 5 MB are still refused.
- A short "deploy notes" section in `README.md` (how to redeploy, how to reset, and the Supabase pause check).
- Checks of the live site: health check, HTTPS, environment variables loaded, a real photo upload on the live address.
- Nothing else. No new features.

**Starter prompt:**

```
Read CLAUDE.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 13: Deploy.
Do only this phase. Make a plan first and wait for my approval before writing any code.
My host is Vercel. Check Vercel's current documentation before writing the steps.
```

**Manual testing (I do these):**

1. Open `https://<your-address>/api/health`. Expected: the server and database are OK, on HTTPS.
2. Open the home page on your phone using the live address. Expected: loads, category list shows.
3. On the phone, report an issue in each of the three categories using the camera and **Use my location**. Expected: each gives a ticket code. This is the first real phone test of location (HTTPS).
4. Bad input: on the live address, report with a fake image (text file renamed) and a pin outside the wards. Expected: 415 and 422 messages, no ticket created.
5. Log in as the officer and the verifier on the live address. Run the full loop: start work, Action Taken Report, approve. Expected: same behaviour as on your laptop.
6. Open the public dashboard on another device. Expected: numbers change within about 10 seconds when you close a ticket.
7. Restart check: redeploy from the Vercel dashboard and reload. Expected: the site comes back and the data is still there. Note any cold-start delay.
8. Security check: do the public-key check from Phase 2 again on the live project. Expected: no rows are returned. Also check that no secret key appears in the page source or in the browser's network tab.
9. Run `reset-demo.sql`, then rehearse the full demo script (PRD section 10) twice on a phone on the live address. Expected: no manual fixes needed either time.
10. Record a screen video of one full run (backup plan). Prepare the roadmap slide (made outside the code) for voice input, AI vehicle-camera analysis and the field-staff app.

**Automated tests:** No new feature tests. Run the full suite once before the deploy and confirm it passes. Claude also adds a small check that the server refuses to start when a required setting is missing, if one does not exist yet.

**Done when:**

- [x] The app is live on an HTTPS address with the database connected
- [x] All three categories can be reported from a phone with a photo and location
- [x] The full loop (report, start, Action Taken Report, approve) works on the live site
- [x] The public dashboard updates on the live site
- [x] The public key reads no rows, and no secret is visible in the browser
- [x] The demo script ran twice in a row from a phone without fixes
- [ ] A screen recording exists as a backup
- [ ] The Supabase project is not paused, and you know how to check it the day before the demo

**Completion record (2 October 2026):** Phase 13 is deployed on Vercel (production, commit `118a32a`): web `https://frontend-drab-tau-zggj3o49bd.vercel.app`, API `https://api-khaki-psi-58.vercel.app`. Checked from the command line against the live API: `/api/health` reports server and database OK over HTTPS, CORS allows the web origin, an unknown trend interval gives 400, a staff route without login gives 401, a fake image gives 415, a pin outside the wards gives 422, a missing photo gives 400, none of these created a ticket, the public Supabase key reads no `tickets` rows, and no server secret appears in the built frontend. Vercel shows no runtime errors for the API. The phone tests (three categories with camera and location, full loop, dashboard refresh, demo rehearsals) were run by the owner. Still open: the backup screen recording and the roadmap slide are not ticked because I could not confirm them, and the Supabase pause check is a reminder for the day before the demo. `reset-demo.sql` does not delete Storage files.

**Commit message:** `Phase 13: deploy configuration and deploy notes`

---

## Phase 14: Admin role, staff and category management

**Goal:** An admin can log in, manage staff and categories, and every admin change is saved in an audit log. The admin cannot close tickets.

**Manual steps (I do these before starting):**

1. Add `RATE_LIMIT_ADMIN_PER_MINUTE=60` to `server/.env` (copy from `server/.env.example`) and to the API project on Vercel.
2. Confirm the demo admin email (`admin@demo.example`) and the second Ward A officer email (`officer.a2@demo.example`) are accepted by Supabase Auth, or give Claude two addresses you control. The seed uses `SEED_DEMO_PASSWORD` for both.
3. After Claude writes migration `0004`: apply it (`supabase link`, then `supabase db push`, or paste it into the SQL Editor). Then run `npm run seed` again.

**What Claude builds:**

- Migration `0004_admin_audit.sql`: `ADMIN` added to the staff role CHECK (keeping `officer_has_ward`), and the `audit_log` table with RLS enabled and no policies (TRD 5.1).
- `middleware/requireAdmin.js`; `GET /api/auth/me` returns `ADMIN`; the frontend `AuthContext` and `ProtectedRoute` accept the `ADMIN` role. The seed adds the demo admin and the second Ward A officer (password from `SEED_DEMO_PASSWORD`).
- `modules/audit/audit.service.js`: one small helper `writeAudit(client, entry)`, used inside each admin transaction.
- `modules/admin`: staff list, create (Supabase Auth admin API, then the `staff` row and audit row in one transaction; the Auth user is deleted again if the transaction fails), update name or ward, activate, deactivate. Deactivating (or moving to another ward) an officer with unfinished tickets needs `replacementOfficerId` (an active officer of the same ward); without it the answer is `409 STAFF_HAS_ACTIVE_TICKETS`. Cannot deactivate yourself or the last active admin. Category list, create, rename, enable and disable (sets `reportable`). `GET /api/admin/audit-log`. Routes and bodies are in TRD 7.7.
- The password is never stored, logged, audited or returned (TRD section 8).
- `dashboard.queries.js` by-category lists categories that are reportable **or** have tickets (the only public-dashboard change, so a disabled category does not make totals disagree).
- The admin rate limit on `/api/admin/**`.
- Frontend `AdminPage` (staff tab, categories tab) inside `StaffArea`, with a link for admins only. Text goes in `i18n/en.js`.
- Test setup: the stand-in `auth.users` table gets an `email` column, and `createApp` takes a fake admin client.
- Docs: tick this phase in PHASES.md, update the status line in `CLAUDE.md`, `AGENTS.md` and `README.md`.

**Starter prompt:**

```
Read CLAUDE.md, AGENTS.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 14: Admin role, staff and category management.
Do only this phase. Make a plan first and wait for my approval before writing any code.
Admin cannot close tickets, approve or reject. Every admin write needs an audit_log row in the same transaction.
No new libraries. Never log or return a password.
```

**Manual testing (I do these):**

1. Sign in as the demo admin. Expected: you land in the staff area and see an **Admin** link. Officers and the verifier do not see it.
2. As an officer, open the admin address directly. Expected: blocked (redirect or 403). Repeat as the verifier.
3. Staff tab: create a new officer for Ward B with a 12+ character password. Expected: the person appears in the list. Sign out and sign in as them with that password. Expected: it works and they see only Ward B.
4. In **Supabase > Authentication**, check the new user exists. In **Table Editor > audit_log**, check a `STAFF_CREATED` row exists and **no password appears anywhere in it**.
5. Change the new officer's name. Expected: the list updates and an audit row shows before and after.
6. Deactivate an officer who has unfinished tickets, with no replacement. Expected: a clear message with the ticket count (409), and the officer is still active.
7. Deactivate the same officer with a replacement from the same ward (use the second Ward A officer for Ward A). Expected: it works, their unfinished tickets now show the replacement as assigned, and the old officer can no longer sign in (clear "account disabled" message).
8. Bad input: try to deactivate yourself, then (with only one admin) try again. Expected: a clear message each time (409).
9. Bad input: create staff with a short password, a bad email, an existing email, and role `ADMIN`. Expected: a clear message each time and no new login in Supabase.
10. Categories tab: add a category, rename it, then disable it. Expected: it leaves the citizen report form. Existing tickets in a disabled category still show their category name, and the public dashboard category chart still counts them. Enable it again. Expected: it returns to the form.
11. Refresh check: refresh the admin page. Expected: you stay logged in and see the same data.

**Automated tests:** Role boundaries (anonymous 401; officer and verifier 403 on every `/api/admin/*` route). Create staff makes an Auth user (fake) and a `staff` row, with no password in the response or audit row. Fake-Auth failure and database failure both leave nothing behind. Deactivate: works, refuses self, last admin, and active tickets without a replacement; with a replacement the tickets move. Category: disable hides it from `GET /api/categories`, the dashboard still counts old tickets, duplicate name gives 409. Every admin write creates an `audit_log` row (and none on failure). `schema.test.js` updated: `audit_log` exists with RLS on, `ADMIN` accepted, `officer_has_ward` still refuses an officer with no ward.

**Done when:**

- [ ] Migration `0004` applied and `audit_log` has RLS on with no policies
- [ ] Admin can sign in; officers and the verifier get 403 on `/api/admin/*`
- [ ] Staff can be created, renamed, moved, deactivated and activated, never deleted
- [ ] Deactivating an officer with unfinished tickets is refused without a replacement
- [ ] A disabled category leaves the report form but old tickets and the dashboard keep it
- [ ] Every admin write has an audit row in the same transaction, and no password is stored anywhere
- [ ] `npm test` passes and the frontend build passes
- [ ] Status lines updated in `CLAUDE.md`, `AGENTS.md`, `README.md`

**Commit message:** `Phase 14: admin role, staff and category management with audit log`

---

## Phase 15: Assignment and complaint management

**Goal:** An admin can list all tickets with filters, assign an unassigned ticket, reassign others to another officer of the same ward, and see overdue tickets.

**Manual steps (I do these before starting):**

1. Add `SLA_DEFAULT_DAYS=7` to `server/.env`, `server/.env.example` and the API project on Vercel.
2. After Claude writes migration `0005`: apply it. Run `npm run seed` again so demo tickets get due dates (some in the past, so overdue shows).
3. Make sure a ward has no active officer before testing assign (for example, deactivate the Ward C officer in Phase 14's screen, with no unfinished tickets, or use a ward you set up), so a report there becomes `SUBMITTED`.

**What Claude builds:**

- Migration `0005_sla_due_date.sql`: `categories.sla_days` (nullable) and `tickets.due_at` (nullable), with an index (TRD 5.1). Report creation sets `due_at` from the category's `sla_days` or `SLA_DEFAULT_DAYS`. The admin category screen gets an SLA field.
- State machine: `SUBMITTED` to `OPEN` allowed, reachable only from the admin assign route. `ticketStateMachine.test.js` updated.
- Officer `start` and `action-report` now require the **assigned** officer (403 otherwise). Viewing stays ward-wide.
- `GET /api/admin/tickets` (filters: ward, category, status, officer, unassigned, overdue, date range; sorting; pages), `POST /api/admin/tickets/:id/assign`, `POST /api/admin/tickets/:id/reassign` (TRD 7.7). Row lock plus transaction; the target officer must be active, an officer, and in the ticket's ward; writes `status_history` with a reason and an `audit_log` row. Deactivate-with-replacement (Phase 14) uses the same reassign code.
- Overdue is computed on read (`due_at < now()` and status not `CLOSED`). No cron or background job. `GET /api/tickets/:id` also returns `dueAt` and `isOverdue`.
- Admin rate limit on the new routes.
- Frontend `AdminTicketsPage`: table with filters and paging, an overdue badge, a ticket detail with an assign or reassign control (read-only otherwise), and the timeline shows "Reassigned". Text in `i18n/en.js`.
- Docs: PHASES.md, status lines.

**Starter prompt:**

```
Read CLAUDE.md, AGENTS.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 15: Assignment and complaint management.
Do only this phase. Make a plan first and wait for my approval before writing any code.
SUBMITTED to OPEN is allowed only through the admin assign route. Reassign must not change the status.
Closing stays verifier-only. No route may set a status directly.
```

**Manual testing (I do these):**

1. Sign in as the admin and open the ticket list. Expected: tickets from all wards, with status, ward, officer, due date and an overdue badge on the late ones.
2. Use each filter (ward, category, status, officer, unassigned, overdue, date range) and the sort. Expected: the list changes to match, and the total changes with it. Compare with **Table Editor > tickets**.
3. Report an issue in a ward with no active officer. Expected: it shows as `SUBMITTED` and unassigned. Assign it to a new officer of that ward. Expected: status `OPEN`, the officer sees it in their list, and the timeline shows the assignment.
4. Reassign an `OPEN` ticket in Ward A from the first officer to the second. Expected: status unchanged, the timeline shows "Reassigned" with a reason, the old officer no longer has it as theirs, and the new one does.
5. As the **old** officer, try to start work on that ticket (open its address). Expected: refused (403). As the new officer: **Start work** works.
6. Bad input: assign a ticket to an inactive officer, to an officer of another ward, and to a verifier. Expected: a clear 409 each time and no change.
7. Bad input: try to reassign a `CLOSED` ticket and a `PENDING_VERIFICATION` ticket, and try to assign a ticket that is not `SUBMITTED`. Expected: 409 each time.
8. As an officer or verifier, call the admin routes (Claude gives you a command). Expected: 403.
9. Database check: `status_history` has the assignment and reassignment rows and `audit_log` has `TICKET_ASSIGNED` and `TICKET_REASSIGNED` rows.
10. Set an SLA on a category, then report in it. Expected: the new ticket's `due_at` is created time plus that many days. Older tickets are unchanged.
11. Refresh check: refresh the list with filters set. Expected: it loads clean.

**Automated tests:** Assign moves `SUBMITTED` to `OPEN` and writes history, audit and (later) notification rows. Reassign keeps the status. Inactive, non-officer and other-ward targets give 409. Closed and pending tickets cannot be reassigned (409). Assign on a non-`SUBMITTED` ticket gives 409. Non-admin gets 403, anonymous 401. A non-assigned officer gets 403 on start and action-report. Filters, sort and paging return the right rows. Overdue only for unfinished tickets with a past `due_at`. Old tickets with `due_at = NULL` are never overdue. State machine: only `SUBMITTED` to `OPEN` was added. Two simultaneous assigns: one wins, one gets 409.

**Done when:**

- [ ] Migration `0005` applied; new tickets get a due date
- [ ] Admin ticket list filters, sorts and pages correctly
- [ ] Assign (`SUBMITTED` to `OPEN`) and reassign (status unchanged) work, with history and audit rows
- [ ] Inactive or other-ward officers, closed and pending tickets are refused (409)
- [ ] The old officer can no longer act on a reassigned ticket
- [ ] Overdue badge and filter work, with no background job
- [ ] `npm test` passes and the frontend build passes
- [ ] Status lines updated in `CLAUDE.md`, `AGENTS.md`, `README.md`

**Commit message:** `Phase 15: admin ticket list, assign and reassign, SLA due dates and overdue flag`

---

## Phase 16: Notifications (in-app)

**Goal:** Staff see a bell with an unread count and an inbox for the events that matter to them. No email, SMS or push.

**Manual steps (I do these before starting):**

1. Add `RATE_LIMIT_NOTIFICATIONS_PER_MINUTE=60` to `server/.env`, `server/.env.example` and the API project. Add `VITE_NOTIFICATION_POLL_SECONDS=30` to `frontend/.env`, `frontend/.env.example` and the frontend project on Vercel.
2. After Claude writes migration `0006`: apply it.

**What Claude builds:**

- Migration `0006_notifications.sql`: `notifications` table, index on `(recipient_id, read_at)`, RLS enabled with no policies (TRD 5.1).
- `modules/notifications`: a small `createNotification(client, {...})` helper called **inside the existing transactions**, and the four routes in TRD 7.8: list mine, unread count, mark one read, mark all read. Every query is limited to the signed-in user; another person's id gives 404.
- Triggers (TRD 7.8): new ticket in ward and ticket assigned or reassigned (officer), action report submitted (all active verifiers), reopened (officer), closed (assigned officer), unassigned ticket created (all active admins).
- Notification rate limit.
- Frontend: `NotificationBell` in the staff header with the unread count, a simple inbox page, polling every `VITE_NOTIFICATION_POLL_SECONDS` seconds (no realtime, no new library), polling pauses in a hidden tab. Clicking a notification marks it read and opens the ticket.
- R25 badge: Claude proposes in the plan whether the bell replaces the officer badge (`/api/officer/tickets/counts`) or both stay. I decide.
- Docs: PHASES.md, status lines.

**Starter prompt:**

```
Read CLAUDE.md, AGENTS.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 16: Notifications (in-app).
Do only this phase. Make a plan first and wait for my approval before writing any code.
Create notification rows inside the existing service transactions. Poll, no realtime, no new library.
Tell me in the plan whether the bell should replace the R25 badge.
```

**Manual testing (I do these):**

1. Report a new issue in Ward A. Sign in as the Ward A officer. Expected: the bell shows 1 unread and the inbox has a "new ticket in your ward" message.
2. Report an issue in a ward with no active officer. Sign in as the admin. Expected: an "unassigned ticket" notification.
3. As the admin, assign it, and reassign another ticket. Expected: the new officer gets a notification each time.
4. As the officer, submit an Action Taken Report. Sign in as the verifier. Expected: an "action report submitted" notification.
5. As the verifier, reject one ticket and approve another. Expected: the assigned officer gets "reopened" and "closed" notifications.
6. Click a notification. Expected: it opens the ticket and the unread count goes down by one. Use **Mark all read**. Expected: the count is 0.
7. Polling: keep a staff page open, then cause an event in another window. Expected: the bell updates within the poll interval without a reload. Switch tabs: polling pauses while the tab is hidden.
8. Privacy: as the Ward B officer, check you never see Ward A's notifications. Ask Claude for a command that marks another user's notification as read. Expected: 404.
9. Failure case: a failed action (for example a 409 on a second approve) creates no new notification (check **Table Editor > notifications**).
10. Stop the server while the page is open. Expected: the bell keeps the last count, and recovers when the server is back.
11. Refresh check: refresh any staff page. Expected: the bell count is right immediately.

**Automated tests:** Each trigger creates the right rows for the right recipients (and only those). A failed transaction creates none. A user cannot list or mark another user's notifications (404). Unread count, mark-one, mark-twice (keeps the first time) and mark-all work. Anonymous gets 401. Notification rate limit gives 429. `schema.test.js`: `notifications` exists with RLS on.

**Done when:**

- [ ] Migration `0006` applied and `notifications` has RLS on with no policies
- [ ] All seven triggers create the right notifications inside the existing transactions
- [ ] The bell, count and inbox work for officer, verifier and admin, with polling
- [ ] A user can only see and change their own notifications
- [ ] The R25 badge decision is recorded
- [ ] `npm test` passes and the frontend build passes
- [ ] Status lines updated in `CLAUDE.md`, `AGENTS.md`, `README.md`

**Commit message:** `Phase 16: in-app notifications with bell, inbox and polling`

---

## Phase 18: Analytics expansion (staff only)

**Goal:** Staff see resolution times, reopen and rejection rates, officer workload, overdue counts and age buckets, and admins can export the ticket list as CSV. The public dashboard stays unchanged.

(Phase 18 is built before Phase 17. Phase 17 is optional and last.)

**Manual steps (I do these before starting):**

1. Add `CSV_EXPORT_MAX_ROWS=5000` to `server/.env`, `server/.env.example` and the API project.
2. Run `npm run seed` if Claude's plan says the seed needs more demo history (for example closed, reopened and rejected tickets with different times) so the charts are not empty.

**What Claude builds:**

- `modules/analytics`: `analytics.queries.js` and `analytics.routes.js` with the six routes in TRD 7.9 (resolution time average and median by ward and category, reopen rate, rejection rate, officer workload, overdue count, open tickets by age). Optional `wardId`, `from` and `to`. Admin and verifier see all wards; an officer is limited to their own ward (another ward gives 403).
- `modules/admin/csv.js` and `GET /api/admin/tickets/export.csv`: written by hand, same filters as the admin list, capped by `CSV_EXPORT_MAX_ROWS`, with formula-injection protection (cells starting with `=`, `+`, `-` or `@` get a prefix) and proper escaping.
- The public `/api/dashboard/*` routes and page are not touched.
- Frontend: `AnalyticsPage` for staff, reusing the existing chart components, with ward and date filters; an **Export CSV** button on the admin ticket list. The link shows for the roles that may use it.
- Docs: PHASES.md, status lines.

**Starter prompt:**

```
Read CLAUDE.md, AGENTS.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 18: Analytics expansion (staff only).
Do only this phase. Make a plan first and wait for my approval before writing any code.
Keep the public dashboard aggregate-only and unchanged. Write the CSV by hand, no new library.
```

**Manual testing (I do these):**

1. Sign in as the admin and open Analytics. Expected: all six metrics show, for all wards.
2. Check two numbers against the database by hand: the average resolution time for one ward (closed tickets, `closed_at - created_at`) and the overdue count. Expected: they match.
3. Apply a ward filter and a date range. Expected: the numbers change and make sense.
4. Sign in as a Ward A officer. Expected: only Ward A numbers. Ask Claude for a command that requests Ward B's analytics as that officer. Expected: 403.
5. Sign in as the verifier. Expected: all wards.
6. Open the public dashboard. Expected: unchanged.
7. As the admin, export the CSV with a filter. Expected: a file opens in a spreadsheet with the right rows and columns.
8. Formula check: create a ticket whose description starts with `=1+1` (or ask Claude for a safe test). Export. Expected: the cell shows as text, not as a formula.
9. Try the export as an officer and as the verifier. Expected: 403.
10. Bad input: a bad date, `from` after `to`, and an unknown sort value. Expected: 400 in the standard shape.
11. Refresh check: reload the analytics page with filters. Expected: loads clean.

**Automated tests:** Each metric matches a known seeded set (including the median, a ward with no closed tickets, and zero values). Reopen and rejection rates handle a zero denominator. Officer scoping (own ward only, 403 for another). Verifier and admin see all wards. Anonymous 401. CSV: formula prefix for `=`, `+`, `-`, `@`; commas, quotes and new lines escaped; row cap; only admin allowed; same filters as the list. Public dashboard tests still pass unchanged.

**Done when:**

- [ ] The six staff metrics are correct against seeded data
- [ ] Admin and verifier see all wards; an officer sees only their own
- [ ] CSV export works, is capped, and is safe against formula injection
- [ ] The public dashboard is unchanged
- [ ] `npm test` passes and the frontend build passes
- [ ] Status lines updated in `CLAUDE.md`, `AGENTS.md`, `README.md`

**Commit message:** `Phase 18: staff analytics and CSV export`

---

## Phase 19: Hardening and role-boundary review

**Goal:** Every route is tested for every role, RLS is confirmed on every table, rate limits cover the new routes, and the demo helpers and docs are up to date.

**Manual steps (I do these before starting):**

1. In Supabase, check the project is not paused.
2. Have the demo logins ready: admin, verifier, the three officers and the second Ward A officer.

**What Claude builds:**

- `roleMatrix.test.js`: a role-by-route table that calls **every** route as anonymous, officer (own ward and another ward), verifier and admin, and checks the expected status code. A new route without a row in the table fails the test.
- `schema.test.js`: RLS is enabled on **every** table, including `audit_log` and `notifications`, with no policies.
- Rate limits on admin and notification routes confirmed; error shapes follow `errorHandler` everywhere (including the CSV route and the 404 and 403 cases).
- `seed.js` and `reset-demo.sql` updated for the new tables, the demo admin and the second officer (reset also clears notifications and `audit_log`). The script and README say that **Storage files are still not removed**.
- Final doc sweep: README (demo logins, demo script steps for admin), TRD known limits, PHASES.md, PRD traceability and the demo script in PRD section 10 (add an optional admin step).
- Fixes for anything the matrix finds. No new features.

**Starter prompt:**

```
Read CLAUDE.md, AGENTS.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 19: Hardening and role-boundary review.
Do only this phase. Make a plan first and wait for my approval before writing any code.
Build the role-by-route matrix test first, tell me what it finds, then fix. No new features.
```

**Manual testing (I do these):**

1. Run `npm test` in `server/`. Expected: everything passes, including the role matrix.
2. Public-key check (Phase 2 command), now for `tickets`, `staff`, `audit_log` and `notifications`. Expected: no rows from any of them.
3. In the Supabase dashboard, check each table shows RLS enabled and no policies.
4. Walk the whole demo script on a phone, including the admin steps: sign in as admin, assign a `SUBMITTED` ticket, reassign one, watch the officer's bell, close it as the verifier. Expected: no error screens.
5. Try to close a ticket as the admin (Claude gives you a command). Expected: 403, and no route sets a status directly.
6. Rate limits: hit an admin route and the notification route repeatedly (Claude gives a command). Expected: 429 in the standard shape.
7. Run `reset-demo.sql`. Expected: live tickets, notifications and audit rows are gone, and seed tickets, staff and the demo admin stay. Storage files remain (as documented).
8. Read the README demo logins and steps. Expected: they work exactly as written.

**Automated tests:** The role matrix, the all-tables RLS check, the rate-limit checks for admin and notification routes, an error-shape check for admin and notification errors, and the updated reset-script test.

**Done when:**

- [ ] Role matrix test covers every route and passes
- [ ] RLS is on for every table, with no policies, checked by a test
- [ ] Admin and notification routes are rate limited and use the standard error shape
- [ ] `seed.js`, `reset-demo.sql` and the README match the new tables and logins
- [ ] Docs sweep done (README, TRD known limits, PHASES.md, PRD traceability)
- [ ] `npm test` passes and the frontend build passes
- [ ] Status lines updated in `CLAUDE.md`, `AGENTS.md`, `README.md`

**Commit message:** `Phase 19: role-boundary tests, RLS check, rate limits and final doc sweep`

---

## Phase 17: Video evidence (OPTIONAL, build last, only after the owner says yes)

**Goal:** A short video can be added to a citizen report and to an Action Taken Report, uploaded straight to Supabase Storage. A photo is still required.

**Before this phase:** Claude asks the owner to confirm the limits first. Proposed: MP4, MOV or WebM; 20 MB; 20 seconds; one video per report and per Action Taken Report; citizen reports included (anonymous uploads carry more abuse risk than officer uploads, so the owner may choose officers only). The owner must also confirm the storage risk: the free plan has 1 GB.

**Manual steps (I do these before starting):**

1. Say **yes** to starting this phase, and confirm or change the limits above.
2. In Supabase, create a second **private** bucket named `ticket-videos`. Set its file size limit to the video limit and its allowed types to `video/mp4`, `video/quicktime`, `video/webm`.
3. Add `SUPABASE_VIDEO_BUCKET`, `MAX_VIDEO_MB`, `MAX_VIDEO_SECONDS` to `server/.env`, `server/.env.example` and the API project. Add `VITE_MAX_VIDEO_MB` and `VITE_MAX_VIDEO_SECONDS` to the frontend settings.
4. After Claude writes migration `0007`: apply it.
5. Have a short MP4 or MOV, one over the size limit, one over the length limit, and a text file renamed `.mp4`.

**What Claude builds:**

- Migration `0007_media_kind.sql`: `media.kind` (`PHOTO` or `VIDEO`) with the constraints in TRD 5.1 (type, one video per report or action report).
- Signed-upload flow (TRD section 10): an upload-ask route that checks type, size and role and rate limits, then returns a signed upload token; the browser uploads straight to Storage (Vercel's 4.5 MB request limit); the report or action-report request includes `videoPath`; Express checks the real object size and type in Storage and writes the `media` row in the same transaction.
- Duration is checked in the browser only (the server cannot verify it without a new library). Say so in the plan.
- A plain `<video controls>` player with a signed link, on the ticket detail, `ComparePage` and `ActionReportPage` (and the report form if citizens are included). No poster frame.
- The privacy notice now says videos are stored as uploaded and hidden data (such as location) is not removed. `en.js` updated.
- Update `roleMatrix.test.js`, `schema.test.js`, README and TRD known limits.

**Starter prompt:**

```
Read CLAUDE.md, AGENTS.md, PRD.md, TRD.md and PHASES.md fully. We are on Phase 17: Video evidence (optional).
I confirm: build it. Limits: <fill in: types, MB, seconds, who may upload>.
Do only this phase. Make a plan first and wait for my approval before writing any code.
No new libraries. A photo is still required. Videos go straight to Supabase Storage with a signed upload URL.
```

**Manual testing (I do these):**

1. As an officer, submit an Action Taken Report with 1 photo and 1 short video. Expected: it works, the status becomes Pending Verification, and the video plays on the detail page.
2. As the verifier, open the compare page. Expected: the video plays beside the photos.
3. As a citizen (if included), report with a photo and a video. Expected: a ticket code, and the officer sees the video.
4. Bad input: a video over the size limit, over the length limit, a text file renamed `.mp4`, and a second video. Expected: a clear message each time and no ticket or status change.
5. Try an upload-ask as the wrong role (for example the verifier asking for an action-report upload). Expected: 403.
6. Skip the video. Expected: photo-only reports and Action Taken Reports still work exactly as before.
7. Database and Storage check: `media` has a `VIDEO` row; the file is in `ticket-videos`. The privacy notice mentions video.
8. Phone check: record a video on a phone and upload it on the live address. Expected: it works within the limits.
9. Refresh check: refresh a ticket with a video. Expected: the player still works (new signed link).

**Automated tests:** Wrong type, over-size, missing object and a second video are refused. Wrong role gets 403. Rate limit gives 429. A registered video creates a `VIDEO` media row in the same transaction as the report. Photo-only paths are unchanged. `schema.test.js` covers the new constraints.

**Done when:**

- [ ] Owner confirmed yes and the limits
- [ ] Migration `0007` applied and the video bucket exists with its limits
- [ ] A video can be added to an Action Taken Report (and a report, if included) within the limits
- [ ] Wrong type, size and role are refused
- [ ] ComparePage and ActionReportPage show and accept video; photo-only still works
- [ ] Privacy notice and known limits (no duration check on the server, unused files, hidden data) updated
- [ ] `npm test` passes and the frontend build passes
- [ ] Status lines updated in `CLAUDE.md`, `AGENTS.md`, `README.md`

**Commit message:** `Phase 17: optional video evidence with signed uploads`

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
| `FRONTEND_ORIGINS` | Phase 13 |
| `RATE_LIMIT_ADMIN_PER_MINUTE` | Phase 14 |
| `SLA_DEFAULT_DAYS` | Phase 15 |
| `RATE_LIMIT_NOTIFICATIONS_PER_MINUTE` | Phase 16 |
| `CSV_EXPORT_MAX_ROWS` | Phase 18 |
| `SUPABASE_VIDEO_BUCKET` (optional) | Phase 17 |
| `MAX_VIDEO_MB` (optional) | Phase 17 |
| `MAX_VIDEO_SECONDS` (optional) | Phase 17 |

**Frontend (`frontend/.env`, never committed; template `frontend/.env.example`; public values only):**

| Name | First needed in |
|------|-----------------|
| `VITE_SUPABASE_URL` | Phase 5 |
| `VITE_SUPABASE_ANON_KEY` | Phase 5 |
| `VITE_MAP_TILE_URL` | Phase 3 |
| `VITE_API_BASE_URL` | Phase 13 |
| `VITE_MAX_UPLOAD_MB` | Phase 13 |
| `VITE_NOTIFICATION_POLL_SECONDS` | Phase 16 |
| `VITE_MAX_VIDEO_MB` (optional) | Phase 17 |
| `VITE_MAX_VIDEO_SECONDS` (optional) | Phase 17 |

The host (Phase 13) needs the same server names as its environment variables, plus the `VITE_` names available at build time.

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

### Phases 14 to 19: questions and decisions (2 October 2026)

Answered by the owner ("all recommended") before the docs were changed. Recorded here and in PRD Q15 to Q22 and TRD T7 to T16.

15. **Disabled categories.** **Resolved:** reuse `categories.reportable`, no `active` column. The public by-category chart lists categories that are reportable or have tickets.
16. **Reassignment scope.** **Resolved:** same ward only, only for `OPEN`, `IN_PROGRESS` and `REOPENED` tickets. A second Ward A officer is added to the demo seed. (Slightly stretches PRD Q11, demo data only.)
17. **Assigned officer rule.** **Resolved:** start and Action Taken Report need the assigned officer. This changes Phase 6 and 7 behaviour and is done in Phase 15.
18. **Initial passwords.** **Resolved:** the admin types an initial password (12+ characters); it is never stored, logged, audited or returned. No email invite. Known limit: no change-password screen.
19. **Who an admin can create.** **Resolved:** officers and verifiers only. Admins come from the seed or the Supabase dashboard.
20. **Deactivation with unfinished tickets.** **Resolved:** refused without a same-ward replacement officer; the replacement takes the tickets. The same rule applies to a ward change.
21. **Reassign history and SLA.** **Resolved:** reassignment writes a `status_history` row with from = to. `SLA_DEFAULT_DAYS` is used when a category has no SLA; old tickets have no due date.
22. **CSV export.** **Resolved:** admin only.
23. **R25 badge.** **Open on purpose:** decided in the Phase 16 plan.
24. **Video (Phase 17).** **Open until the owner says yes:** the limits, whether citizen reports are included, and the free-plan storage risk. The server cannot check video duration without a new library; the browser check is the only duration limit.
25. **Docs drift fixed in Stage 1.** `AGENTS.md` had the heading `# CLAUDE.md` and an old status; it is now identical to `CLAUDE.md`. TRD section 4 said `app.js` (the code uses `application.js`) and did not list the `officer` and `verifier` modules.
26. **Not yet verified.** The Supabase Auth admin API call shape (`auth.admin.createUser`) and the signed-upload API for video have not been re-checked against current docs; Claude checks them when the phase plan is written. A free-plan check of Supabase limits (TRD section 3) was not repeated.
27. **Manual items from Phase 13 still open:** the backup screen recording, the roadmap slide, and the Supabase pause check.
