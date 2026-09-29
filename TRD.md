# TRD: GBA Civic Issue Tracker (Pilot)

| | |
|---|---|
| **Product** | Verified Civic Issue Tracker (pilot of the GBA digital governance platform) |
| **Builds on** | `PRD.md` v0.2. Requirement IDs (R1 to R37) and decisions (Q1 to Q12) point to that file. |
| **Version** | 0.3 (proposal, for review) |
| **Date** | 29 September 2026 |
| **Status** | Draft. Every choice has a "why" so you can push back on anything unclear. |

### What changed from v0.2

| Area | v0.2 | v0.3 (this version) |
|------|------|---------------------|
| Issue types | Footpath encroachment only (others were dummy numbers) | **Three reportable categories:** footpath encroachment, potholes / road damage, garbage dumping |
| Open questions | S1 to S3 and T2 to T4 were open | **All decided** (section 17) |
| Doc location | `docs/` folder | **Docs in the project root:** `PRD.md`, `TRD.md`, `PHASES.md`, `CLAUDE.md` |
| Env files | One root `.env.example` plus `frontend/.env` | **`server/.env` and `frontend/.env`**, each with its own `.env.example` |
| Role checks | `/api/tickets/**` was "any staff" | **Each route checks its own role** (section 8) |
| Database connection | Direct or pooler, decide later | **Session pooler by default** (section 13) |
| `.gitignore` | Not shown | **Added** to the folder tree |

Everything else (the tables, the status rules, the requirements mapping) is unchanged.

---

## 1. What this document does

The PRD says **what** the pilot does. This document says **how** we build it: the tools, the folders, the database tables, the API routes and how login works.

Rule I followed: **pick the simplest thing that fully covers the PRD.** Where there is a simpler option and a "grown-up" option, I picked the simple one and said when you would switch.

---

## 2. Big Picture

```
  Phone / laptop browser
     │            │
     │ page + /api│ sign-in only (email + password)
     ▼            ▼
┌──────────────────────┐            ┌─────────────────────────────────┐
│  Express (Node)      │  SQL       │  Supabase                       │
│  - serves React app  │ ─────────► │   • Postgres + PostGIS (tables) │
│  - ticket rules      │            │   • Auth (staff logins)         │
│  - photo handling    │ ─────────► │   • Storage (photos, private)   │
│  - dashboard numbers │  server    └─────────────────────────────────┘
└─────────┬────────────┘  key
          │  street / area lookup
          ▼
    Nominatim (OpenStreetMap)
```

Three parts you build: **frontend** (React), **backend** (Express), **database setup** (SQL files). Supabase gives you the database, the login system and the photo storage. Two outside services come from OpenStreetMap: **map tiles** and **address lookup**.

**Important rule:** the browser only talks to Supabase to **sign in**. Everything else goes through Express. All ticket rules live in one place, so they can't be skipped.

---

## 3. Stack and Why

| Piece | Choice | Why (in simple words) | Other option, and when I'd switch |
|-------|--------|-----------------------|-----------------------------------|
| **Backend** | **Node.js + Express** (JavaScript, ES modules) | Your choice. Small, quick to start, and the same language as the frontend. | TypeScript adds safety but more setup. Decision S3: plain JavaScript for now. Easy to add later. |
| **Database host** | **Supabase Postgres** | A ready-made Postgres with nothing to install or host. PostGIS is available. | Your own Postgres in Docker (v0.1). Fine, just more setup. |
| **Map queries** | **PostGIS** | The PRD needs "which ward is this point in?" (R5) and "is there a report within 50 m?" (R10). PostGIS answers each with one SQL line. | Doing map maths by hand is slower and easier to get wrong. |
| **How Express talks to the database** | **`pg`** (node-postgres), plain SQL | A status change and its history row must be saved **together or not at all** (a transaction). Plain SQL does that. PostGIS functions also need SQL. | `supabase-js` sends each call as a separate web request, so it can't group them in a transaction without extra database functions. |
| **Staff login** | **Supabase Auth** (email + password) | No password code to write. Supabase stores passwords safely and gives a user list in its dashboard. | Own `users` table + `bcrypt` + `jsonwebtoken`. More code, same result. Decision S1: Supabase Auth. |
| **Photo storage** | **Supabase Storage**, private bucket | No servers or folders to manage. Photos stay private. Express hands out links that expire quickly. | A local folder works on one machine but is lost on many free hosts when the app restarts. |
| **Database changes** | **SQL files** in `supabase/migrations/`, applied with the Supabase CLI | The database is rebuilt from files, so it's repeatable. | Pasting SQL into the Supabase SQL editor works for a quick first try. |
| **Input checks** | **zod** | Describes the allowed shape of each request in a few lines and gives clear errors. | `express-validator` or `joi`. |
| **File upload** | **multer** (in memory) | Reads the photo from the form. Hard size limit built in. | `busboy` (lower level). |
| **Photo check and clean** | **sharp** | Confirms it's a real image, fixes rotation, shrinks it, and drops hidden data like GPS. I tested this. | `jimp` (slower). |
| **Spam limit** | **express-rate-limit** | One line per route. | A hosted firewall later. |
| **Security headers** | **helmet** | Sensible defaults with one line. | |
| **Frontend** | **React + Vite** (plain JavaScript) | Most screens are forms, lists and charts. Works on phone browsers. | Plain HTML pages get messy with logins and maps. |
| **Styling** | **Tailwind CSS** | Quick way to fit phones (R37). | |
| **Maps on screen** | **Leaflet** (`react-leaflet`) + OpenStreetMap tiles | Free, light, supports "click to drop a pin" (R4). | Google Maps needs a paid key. |
| **Street/area from coordinates** | **Nominatim**, called from Express | Free, no key. Express caches results. | Google Geocoding (paid). |
| **Charts** | **Recharts** | Simple bar, pie and line charts in React. | Chart.js. |
| **Live dashboard (R34)** | **Page asks again every 10 seconds** | Easiest thing that works. | Server-Sent Events later. |
| **Hosting** | **One Node service** that serves `/api` **and** the built React files | One thing to deploy. Same address for app and API, so no CORS setup. The host gives HTTPS (needed for phone location). | Frontend on Netlify/Vercel/Cloudflare Pages and API elsewhere. More moving parts. |
| **Tests** | **Vitest + Supertest**, against a local PostGIS container | Tests run real map queries. | |

### What Supabase does for us, and what it doesn't

| Supabase gives us | We still write |
|-------------------|----------------|
| Postgres + PostGIS | All tables, all ticket rules, all queries |
| Login system and user list | The `staff` table (role and ward) and the "who is this?" check |
| File storage and short-lived links | Photo checking and cleaning |
| A web dashboard to look at data | Nothing to host for these parts |

Supabase can also act as a backend all by itself (browser talks straight to the database, protected by row rules). **We are not doing that.** You chose Express, and the "cannot close without proof" rule is easier to keep safe in one server.

### Supabase free plan: does it fit?

Numbers from the Supabase pricing page (checked 29 Sept 2026; limits can change, so glance at the page before the demo):

| Limit | Free plan | Our pilot |
|-------|-----------|-----------|
| Database size | 500 MB | Text rows only. Tiny |
| File storage | 1 GB | Photos are shrunk to a few hundred KB each, so thousands fit |
| Biggest single file | 50 MB | We allow 5 MB |
| Data out (egress) | 5 GB / month | Plenty for a demo |
| Active projects | 2 | We need 1 |
| **Inactivity** | **Project is paused after 1 week with little activity** | **Real risk. See section 13** |

---

## 4. Folder Structure

One repository (a "monorepo") so the backend, frontend and docs stay in step.

```
gba-civic-tracker/
├── README.md                    how to run it, demo logins
├── CLAUDE.md                    working rules for Claude
├── PRD.md                       what to build
├── TRD.md                       how to build it (source of truth)
├── PHASES.md                    build phases and the current phase
├── .gitignore                   must list .env files, node_modules and dist
├── supabase/
│   └── migrations/
│       ├── 0001_schema.sql            tables + security switches
│       ├── 0002_seed_wards.sql        three sample ward shapes
│       └── 0003_seed_categories.sql   the three categories
│
├── server/                      Node + Express
│   ├── package.json
│   ├── .env.example             server settings (real .env is git-ignored)
│   ├── src/
│   │   ├── index.js             starts the server
│   │   ├── app.js               builds the app: middleware, routes, serves frontend
│   │   ├── config.js            reads and checks settings
│   │   ├── db.js                pg Pool + withTransaction() helper
│   │   ├── supabase.js          admin client (Auth check + Storage)
│   │   ├── middleware/
│   │   │   ├── requireAuth.js   token → staff member
│   │   │   ├── requireRole.js   OFFICER / VERIFIER gate
│   │   │   ├── rateLimit.js
│   │   │   ├── upload.js        multer setup
│   │   │   └── errorHandler.js  one error shape for everything
│   │   ├── modules/
│   │   │   ├── auth/            auth.routes.js            (GET /me)
│   │   │   ├── tickets/         ticket.routes.js, ticket.service.js,
│   │   │   │                    ticket.stateMachine.js, ticket.queries.js
│   │   │   ├── actionReports/   actionReport.service.js
│   │   │   ├── media/           media.service.js  (sharp + Storage + signed links)
│   │   │   ├── wards/           ward.service.js   (which ward is this point in?)
│   │   │   ├── geo/             geocoding.js, geoUtils.js
│   │   │   └── dashboard/       dashboard.routes.js, dashboard.queries.js
│   │   └── utils/               ApiError.js, publicCode.js, schemas.js (zod)
│   ├── scripts/
│   │   ├── seed.js              creates demo staff (Supabase admin API) + demo tickets
│   │   └── reset-demo.sql       deletes live demo tickets, keeps seed data
│   └── tests/
│       ├── setup/               stub for Supabase's auth table + runs the SQL files
│       ├── ticketStateMachine.test.js
│       ├── closeRules.test.js
│       ├── wardLookup.test.js
│       ├── duplicates.test.js
│       ├── categories.test.js
│       ├── upload.test.js
│       └── dashboard.test.js
│
├── frontend/                    React + Vite
│   ├── package.json
│   ├── .env.example             public settings only (real .env is git-ignored)
│   ├── vite.config.js           dev proxy: /api → localhost:3000
│   └── src/
│       ├── main.jsx, App.jsx    app start + routes
│       ├── api/                 supabaseClient.js (sign-in only), client.js (adds token),
│       │                        reports.js, tickets.js, dashboard.js
│       ├── auth/                AuthContext.jsx, ProtectedRoute.jsx
│       ├── i18n/                en.js  (all screen text in one place: English now, more languages later)
│       ├── components/          MapPicker, PhotoPicker, StatusBadge, SideBySide, StatCard, charts/
│       └── pages/
│           ├── ReportPage.jsx           citizen report (R1 to R6, R10, R11)
│           ├── TrackPage.jsx            status by ticket code (R7)
│           ├── LoginPage.jsx
│           ├── OfficerTicketsPage.jsx   ward list (R15)
│           ├── TicketDetailPage.jsx     (R16, R17)
│           ├── ActionReportPage.jsx     (R18)
│           ├── VerifierQueuePage.jsx    tickets waiting for a check
│           ├── ComparePage.jsx          side-by-side + approve/reject (R20, R21, R24)
│           └── DashboardPage.jsx        (R26 to R34)
│
└── mock-gba-site/
    └── index.html               fake "GBA website" with a link to the portal (R36)
```

**Why folders by feature** (`tickets/`, `media/`, `wards/`) **and not by type** (`controllers/`, `services/`)? Everything about tickets sits in one folder, so a change to tickets touches one place.

Build step for production: `npm run build` in `frontend/` creates `frontend/dist`. Express serves that folder with `express.static`, and sends `index.html` for any non-`/api` route so React's page links work on refresh.

---

## 5. Data Tables

This SQL is the content of `0001_schema.sql`. **I ran it on a real PostgreSQL 16 + PostGIS**, set up the same way Supabase does it (PostGIS inside an `extensions` schema, and a stand-in for Supabase's `auth.users` table). The tests are listed under it.

```sql
-- Supabase rule: install PostGIS in its own schema, never in "public".
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Ward shapes (map polygons)
CREATE TABLE wards (
    id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name      VARCHAR(100) NOT NULL UNIQUE,
    boundary  extensions.geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX idx_wards_boundary ON wards USING GIST (boundary);

-- Staff profile. The login itself (email + password) lives in Supabase Auth.
-- Same id as the Supabase Auth user. Citizens have no account in the pilot (PRD Q2).
CREATE TABLE staff (
    id          UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name   VARCHAR(100) NOT NULL,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('OFFICER', 'VERIFIER')),
    ward_id     INT REFERENCES wards(id),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT officer_has_ward CHECK (role <> 'OFFICER' OR ward_id IS NOT NULL)
);

-- Issue types. Only rows with reportable = true show up on the citizen form.
CREATE TABLE categories (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        VARCHAR(40)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    reportable  BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE tickets (
    id                   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_code          VARCHAR(12)  NOT NULL UNIQUE,        -- what the citizen sees, e.g. K7M2QX9A
    category_id          INT          NOT NULL REFERENCES categories(id),
    description          VARCHAR(300) NOT NULL,
    lat                  DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lng                  DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
    location             extensions.geography(Point, 4326)    -- built automatically from lat/lng
                         GENERATED ALWAYS AS (
                             extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography
                         ) STORED,
    street               VARCHAR(200),
    area                 VARCHAR(200),
    ward_id              INT REFERENCES wards(id),
    status               VARCHAR(30)  NOT NULL DEFAULT 'SUBMITTED'
                         CHECK (status IN ('SUBMITTED', 'OPEN', 'IN_PROGRESS',
                                           'PENDING_VERIFICATION', 'CLOSED',
                                           'REOPENED', 'REJECTED')),
    assigned_officer_id  UUID REFERENCES staff(id),
    support_count        INT          NOT NULL DEFAULT 1,     -- people who reported the same issue
    is_demo              BOOLEAN      NOT NULL DEFAULT FALSE, -- dummy seed data (R33)
    closed_by            UUID REFERENCES staff(id),
    closed_at            TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- Safety net: the database itself refuses CLOSED without a verifier and a time.
    CONSTRAINT closed_needs_verifier
        CHECK (status <> 'CLOSED' OR (closed_by IS NOT NULL AND closed_at IS NOT NULL))
);
CREATE INDEX idx_tickets_location        ON tickets USING GIST (location);
CREATE INDEX idx_tickets_ward_status     ON tickets (ward_id, status);
CREATE INDEX idx_tickets_officer_status  ON tickets (assigned_officer_id, status);
CREATE INDEX idx_tickets_created         ON tickets (created_at);

-- One row per Action Taken Report. A ticket can have several (after a reject).
CREATE TABLE action_reports (
    id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id        INT           NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    officer_id       UUID          NOT NULL REFERENCES staff(id),
    remarks          VARCHAR(1000) NOT NULL,
    lat              DOUBLE PRECISION,
    lng              DOUBLE PRECISION,
    submitted_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    decision         VARCHAR(10)   CHECK (decision IN ('APPROVED', 'REJECTED')),
    decided_by       UUID REFERENCES staff(id),
    decided_at       TIMESTAMPTZ,
    decision_reason  VARCHAR(500),
    CONSTRAINT rejection_needs_reason
        CHECK (decision IS DISTINCT FROM 'REJECTED' OR decision_reason IS NOT NULL)
);
CREATE INDEX idx_action_reports_ticket ON action_reports (ticket_id);

-- Photo records. The file itself is in the Supabase Storage bucket.
CREATE TABLE media (
    id                INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id         INT          NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    action_report_id  INT REFERENCES action_reports(id) ON DELETE CASCADE,
    type              VARCHAR(10)  NOT NULL CHECK (type IN ('ORIGINAL', 'ACTION')),
    storage_path      VARCHAR(300) NOT NULL,              -- path inside the bucket
    content_type      VARCHAR(50)  NOT NULL,
    size_bytes        INT          NOT NULL,
    lat               DOUBLE PRECISION,
    lng               DOUBLE PRECISION,
    captured_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT media_type_matches_report
        CHECK ((type = 'ORIGINAL' AND action_report_id IS NULL)
            OR (type = 'ACTION'   AND action_report_id IS NOT NULL))
);
CREATE INDEX idx_media_ticket ON media (ticket_id);

-- Audit trail (R23): every status change, who did it, and why.
CREATE TABLE status_history (
    id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id    INT         NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    from_status  VARCHAR(30),
    to_status    VARCHAR(30) NOT NULL,
    changed_by   UUID REFERENCES staff(id),        -- empty when the system or a citizen did it
    reason       VARCHAR(500),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_history_ticket ON status_history (ticket_id);

-- SECURITY SWITCH (very important on Supabase, see section 8):
-- Turn on row-level security for every table and add NO policies.
-- Result: the public "anon" key can read and write nothing.
-- Express connects with the database owner login, which is not blocked.
ALTER TABLE wards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE media           ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history  ENABLE ROW LEVEL SECURITY;
```

### How the tables connect

```
Supabase Auth user ──1:1── staff ──> wards
                            │
categories ──< tickets >── wards
                  │
                  ├──< media (ORIGINAL photo)
                  ├──< status_history
                  └──< action_reports ──< media (ACTION photos)
```

### What I tested on a real database

| Test | Result |
|------|--------|
| Whole SQL file runs clean, with PostGIS in the `extensions` schema | Works |
| Point-in-polygon: a point inside "Sample Ward A" returns Ward A (R5) | Works |
| Duplicate search: a report about 17 m away is found, one about 1 km away is not (R10) | Works |
| Set a ticket to `CLOSED` with no verifier | **Refused by the database** (R22 safety net) |
| Officer with no ward | Refused |
| Reject an action report without a reason | Refused |
| `ACTION` photo not linked to an action report | Refused |
| Dashboard query: tickets per ward, resolved per ward with `GROUP BY` | Works |
| Distance between original and action location in metres (R24) | Works |
| `anon` role reading `tickets` with security switch ON | **Sees 0 rows, cannot insert** |
| Table owner login reading `tickets` with security switch ON | Sees all rows (this is how Express connects) |

### Notes on the data choices

- **`public_code` next to `id`.** The internal `id` counts 1, 2, 3, so anyone could guess other people's tickets. Citizens get a random `public_code` instead.
- **IDs are plain integers, not `BIGINT`.** The Node `pg` library hands back big numbers (`BIGINT`, and also `count(*)`) as **text strings**, which causes bugs like `"5" + 1 = "51"`. Integers avoid it. In queries, write `count(*)::int`.
- **`staff.id` is a UUID from Supabase Auth.** Supabase creates the login; we add one `staff` row with the same id to say "this person is an OFFICER of ward 3".
- **No `version` column.** In Express, the ticket row is locked while it is changed (`SELECT ... FOR UPDATE`). If two verifiers click at once, the second waits, then sees the new status and gets a 409.
- **`is_demo`.** Dummy seed tickets are marked. This drives the "Demo data" label (R33) and lets `reset-demo.sql` clear only the live tickets between rehearsals.
- **`categories`.** Three rows, all `reportable = true`: `FOOTPATH_ENCROACHMENT`, `ROAD_DAMAGE` (potholes / road damage) and `GARBAGE_DUMPING`. The `reportable` flag stays so a future category can exist in the data without showing on the form. (PRD Q3 and Q11.)
- **Status as text with a `CHECK`,** not a database enum. Easier to change later.
- **Photo location comes from the browser at upload time,** not from the photo's hidden EXIF data. Many phones and browsers remove EXIF when a photo is picked from the gallery.
- **`captured_at` is the time the server received the photo.** It is trustworthy, but it is not proof of when the photo was taken.
- **Seed data split.** Wards and categories are SQL files. **Staff and demo tickets are made by `npm run seed`**, because staff logins must be created through Supabase Auth, and closed demo tickets need a verifier id. Demo tickets are spread across all three categories.

`0003_seed_categories.sql` is just:

```sql
INSERT INTO categories (code, name, reportable) VALUES
  ('FOOTPATH_ENCROACHMENT', 'Footpath Encroachment',    true),
  ('ROAD_DAMAGE',           'Potholes / Road Damage',   true),
  ('GARBAGE_DUMPING',       'Garbage Dumping',          true);
```

---

## 6. Ticket Status Rules

All status changes go through one file, `ticket.stateMachine.js`. It holds this table and rejects everything else with **HTTP 409**.

| From | To | Who | Route | Notes |
|------|----|-----|-------|-------|
| (new) | `OPEN` | System | `POST /api/reports` | Ward found and an active officer exists for it |
| (new) | `SUBMITTED` | System | `POST /api/reports` | Ward found but no active officer yet (PRD Q8) |
| `OPEN` / `REOPENED` | `IN_PROGRESS` | Officer of that ward | `POST /api/tickets/:id/start` | R17 |
| `OPEN` / `IN_PROGRESS` / `REOPENED` | `PENDING_VERIFICATION` | Officer of that ward | `POST /api/tickets/:id/action-report` | Needs at least one photo (R18, R19). Starting first is optional |
| `PENDING_VERIFICATION` | `CLOSED` | Verifier | `POST /api/tickets/:id/approve` | The **only** code path that sets `CLOSED` (R22) |
| `PENDING_VERIFICATION` | `REOPENED` | Verifier | `POST /api/tickets/:id/reject` | Reason is required (R21) |
| `CLOSED` | nothing | | | Final in the pilot |
| any | `REJECTED` | | | **Reserved and unused** in the pilot (Decision T3, PRD Q9) |

Three layers guard the closing rule (R22):

1. **The screen** only shows the Approve button in the right state. (Convenience only.)
2. **The server** (`stateMachine` + `ticket.service.approve`) checks the state, the role, and that a photo exists.
3. **The database** refuses `CLOSED` with no verifier (the `closed_needs_verifier` check).

Every change runs inside **one database transaction** (`withTransaction`) together with a `status_history` row (R23). The shape of each change in code:

```js
// ticket.service.js (sketch)
export async function approve(ticketId, verifier) {
  return withTransaction(async (client) => {
    const t = await lockTicket(client, ticketId);            // SELECT ... FOR UPDATE
    assertCanMove(t.status, 'CLOSED');                       // state machine, else 409
    await assertHasActionPhoto(client, ticketId);            // else 409
    await markLatestReportApproved(client, ticketId, verifier.id);
    await setStatus(client, ticketId, 'CLOSED',
                    { closed_by: verifier.id, closed_at: new Date() });
    await addHistory(client, ticketId, t.status, 'CLOSED', verifier.id);
  });                                                        // any error = everything undone
}
```

---

## 7. API Routes

Base path: `/api`. Everything is JSON, except uploads (`multipart/form-data`). All times are ISO 8601 in UTC. Route names use Express style (`:id`).

### 7.1 Public (no login)

| Method | Route | What it does | PRD |
|--------|-------|--------------|-----|
| `GET` | `/api/categories` | List reportable categories (the three in the pilot). Fills the category picker | R8 |
| `POST` | `/api/locations/resolve` | Body `{lat, lng}`. Returns `{ward, street, area, inPilotArea}` so the citizen sees it before submitting | R3, R4, R5 |
| `GET` | `/api/reports/nearby?lat=&lng=&category=` | Open tickets of the **same category** within 50 m in the last 30 days. Used for the duplicate check | R10 |
| `POST` | `/api/reports` | Create a report. Form fields: `photo`, `description`, `lat`, `lng`, `categoryCode` (required, one of the three) | R1, R2, R6, R8, R9, R13 |
| `POST` | `/api/reports/:publicCode/support` | "Same issue, add my support": `support_count + 1` | R11, R12 |
| `GET` | `/api/reports/:publicCode` | Public status: category, status, ward, area, created date, timeline (no names, no photos) | R7 |
| `GET` | `/api/dashboard/summary` | Totals: all, open, resolved, resolution rate, plus `isDemoData` | R27, R33 |
| `GET` | `/api/dashboard/by-ward` | Per ward: total, open, resolved | R28, R30 |
| `GET` | `/api/dashboard/by-category` | Per category counts | R29 |
| `GET` | `/api/dashboard/trend?interval=week` | Complaints per week (or `month`) | R32 |
| `GET` | `/api/dashboard/map` | Points `{lat, lng, status}` for map pins. No names, no photos | R31 |
| `GET` | `/api/health` | Returns the server and database status for the Phase 1 diagnostic page | |

`GET /api/health` returns HTTP 200 with `{ "server": "ok", "database": "ok" }` when the database is reachable. If the server is reachable but the database check fails, it returns `{ "server": "ok", "database": "down" }` so the client can distinguish the two states.

`POST /api/reports` success response (201):

```json
{
  "publicCode": "K7M2QX9A",
  "status": "OPEN",
  "ward": "Sample Ward A",
  "street": "Example Road",
  "area": "Sample Area"
}
```

### 7.2 Login

**There is no login route in Express.** The React app signs in directly with Supabase (`supabase.auth.signInWithPassword({ email, password })`) and receives a token. Express only has:

| Method | Route | Who | What it does |
|--------|-------|-----|--------------|
| `GET` | `/api/auth/me` | Logged in staff | Returns `{id, name, role, wardId}` from the `staff` table (used when the page reloads) |

Logging out is `supabase.auth.signOut()` in the browser.

### 7.3 Officer (role `OFFICER`)

| Method | Route | What it does | PRD |
|--------|-------|--------------|-----|
| `GET` | `/api/officer/tickets?status=&page=` | Tickets of **the officer's own ward only** (all three categories) | R15 |
| `GET` | `/api/officer/tickets/counts` | Counts for badges: new, reopened | R25 |
| `POST` | `/api/tickets/:id/start` | Move to `IN_PROGRESS` | R17 |
| `POST` | `/api/tickets/:id/action-report` | Form fields: `remarks`, `photos` (1 to 3 files), `lat`, `lng`. Moves to `PENDING_VERIFICATION` | R18, R19 |

### 7.4 Verifier (role `VERIFIER`)

| Method | Route | What it does | PRD |
|--------|-------|--------------|-----|
| `GET` | `/api/verifier/tickets?status=PENDING_VERIFICATION` | Queue of tickets waiting for a check (all wards) | R20 |
| `GET` | `/api/tickets/:id/compare` | Everything for the side-by-side screen (below) | R20, R24 |
| `POST` | `/api/tickets/:id/approve` | `PENDING_VERIFICATION` → `CLOSED` | R21, R22 |
| `POST` | `/api/tickets/:id/reject` | Body `{reason}`. `PENDING_VERIFICATION` → `REOPENED` | R21 |

`GET /api/tickets/:id/compare` response. The photo `url` values are **short-lived links** made by Express (see section 10):

```json
{
  "ticketId": 42,
  "status": "PENDING_VERIFICATION",
  "original": {
    "url": "https://<project>.supabase.co/storage/v1/object/sign/ticket-media/...?token=...",
    "capturedAt": "2026-09-29T08:10:00Z", "lat": 12.975, "lng": 77.595
  },
  "action": {
    "actionReportId": 7,
    "remarks": "Encroachment removed with the shop owner.",
    "photos": [ { "url": "https://<project>.supabase.co/storage/v1/object/sign/ticket-media/...?token=..." } ],
    "capturedAt": "2026-09-30T05:40:00Z",
    "lat": 12.9751, "lng": 77.5952
  },
  "distanceMeters": 24.4,
  "farWarning": false
}
```

### 7.5 Shared staff route (officer or verifier)

| Method | Route | What it does | PRD |
|--------|-------|--------------|-----|
| `GET` | `/api/tickets/:id` | Ticket detail: photo links, description, map position, ward, status timeline. **Officers get 403 for tickets of another ward.** | R16 |

### 7.6 Errors

Every error uses the same shape (`errorHandler.js`), so the frontend handles all of them the same way:

```json
{ "status": 409, "code": "ILLEGAL_TRANSITION", "message": "A ticket can only be closed after an Action Taken Report is submitted." }
```

| HTTP code | When |
|-----------|------|
| 400 | Bad input (zod check failed, description too long, category not reportable) |
| 401 | Not logged in, or token expired/invalid |
| 403 | Logged in but wrong role, inactive staff, or officer opening another ward's ticket |
| 404 | Ticket not found |
| 409 | Not allowed in the current status, or someone changed the ticket first |
| 413 | Photo too large |
| 415 | File is not a real JPG/PNG |
| 422 | Location is outside the pilot wards |
| 429 | Too many requests (rate limit) |

**Why one route per action** (`/start`, `/approve`, `/reject`) and not a single "change status" route? Each route allows exactly one move and one role. There is no way to send `{"status": "CLOSED"}` and skip a step.

**Express note:** on Express 4, wrap async route functions so a thrown error reaches `errorHandler` (Express 5 does this for you). Check which version `npm install express` gives you.

---

## 8. Login and Access (Auth)

### Who needs to log in

| User | Login? | How they're limited |
|------|--------|---------------------|
| Public visitor | No | Dashboard and status page only |
| Citizen | No (pilot) | Can create a report, add support, check status by code. Rate-limited |
| Ward Officer | Yes | Sees and changes tickets **of their own ward only** |
| Verifier | Yes | Sees tickets in all wards, approves or rejects |

### How it works

1. Staff type email and password. The React app sends them **to Supabase Auth** and gets back a **session**: a signed token (JWT) that the `supabase-js` library keeps fresh automatically.
2. For every request to Express, `api/client.js` adds the header `Authorization: Bearer <token>`.
3. `requireAuth` in Express asks Supabase "who is this token?" using `supabaseAdmin.auth.getUser(token)`. Invalid or expired → **401**.
4. Express then reads that person's row: `SELECT role, ward_id FROM staff WHERE id = $1 AND active`. No row, or `active = false` → **403**. Sets `req.user = { id, role, wardId }`.
5. `requireRole('OFFICER')` or `requireRole('VERIFIER')` guards **each route separately** (Decision S4):
   - Officer only: `/api/officer/**`, `POST /api/tickets/:id/start`, `POST /api/tickets/:id/action-report`
   - Verifier only: `/api/verifier/**`, `GET /api/tickets/:id/compare`, `POST /api/tickets/:id/approve`, `POST /api/tickets/:id/reject`
   - Any active staff member: `GET /api/tickets/:id`, `GET /api/auth/me`
   - Public routes from 7.1 need nothing
6. **Ward check happens inside the SQL,** not just in the route: every officer query includes `WHERE ward_id = $wardId`. An officer who guesses another ticket's ID gets 403.

### Details and the reasons

| Decision | Why |
|----------|-----|
| **Supabase Auth for passwords** | No hashing code to write or get wrong. Users are created in Supabase (by the seed script or the dashboard), so there is no public sign-up. |
| **Role and ward stored in our `staff` table**, not inside the token | Easy to change. And since Express reads it on every request, **deactivating someone takes effect immediately.** |
| **`getUser(token)` on every request** | Works for any Supabase key setup and is easy to understand. Cost: one extra web call per request. Fine for a pilot. **Faster option later:** verify the token locally with the `jose` library and Supabase's public keys (a JWKS address). That works with Supabase's newer signing keys only. |
| **Server key stays on the server** | Express uses the Supabase **server key** (called the *service role* or *secret* key in the dashboard). It can do anything, so it is never sent to the browser and never committed. The browser only gets the public **anon** key, which can only do sign-in because the tables have no open policies. |
| **Email as the username** | Supabase Auth logs in with email. The login screen says "Email". Demo emails like `officer.a@demo.example` are fine if Supabase accepts them. If it rejects the domain, use an address you own. (I haven't tested this part.) |
| **Token kept by `supabase-js` in the browser** | Simple. Downside: script injection on the page could read it, so the React app must never show untrusted HTML. |
| **No CORS setup in production** | Express serves the app and the API from the same address. In development, Vite's proxy does the same job. |
| **Rate limiting on public routes** | `express-rate-limit` limits requests per IP (for example 20 reports per hour, adjustable). This is the pilot's simple answer to spam (§12 of the MoM). Set `app.set('trust proxy', 1)` behind a host's proxy, or every visitor looks like the same IP. |
| **Secrets in environment variables** | Put in `.env`, never committed. |
| **Demo passwords** | Seeded staff use simple passwords listed in the README, for the demo only. Change them before any real use. |

### Supabase: the one thing you must not skip

Supabase automatically exposes tables in the `public` schema through a web API that uses the **public anon key**. That key sits in the frontend code, so anyone can find it. **A table without row-level security can be read and written by anyone who has that key.** The Supabase docs say so directly.

That is why the schema file ends with `ENABLE ROW LEVEL SECURITY` on every table and adds no policies. Result: the anon key sees and changes nothing. Express is unaffected because it connects with the database owner login, which is not blocked. (I tested both sides, see section 5.)

**Rule for the future:** every new table gets that same line the moment it is created.

### Known limits (fine for a pilot, fix before real use)

- The token lives in browser storage (see the table above).
- Anyone can add "support" to a ticket several times. The rate limit only slows this down.
- One extra call to Supabase Auth on every staff request.
- No two-step login.

---

## 9. Key Flows in Technical Terms

### Citizen report (R1 to R13)

1. Citizen picks a category (list from `GET /api/categories`). Browser gets location (`navigator.geolocation`), or the citizen drops a pin (R4). The map component holds `lat/lng`.
2. Frontend calls `POST /api/locations/resolve`. Express runs `ST_Contains(boundary, point)` for the ward and asks Nominatim for street and area. Screen shows all three (R5). If no ward matches, the screen says the location is outside the pilot area.
3. On **Submit**, frontend first calls `GET /api/reports/nearby` (same category only). If something is found, it shows a choice: **support** or **submit anyway**.
4. `POST /api/reports` (multipart). Express: checks and cleans the photo → uploads it to Storage → then, in one transaction, finds the ward, picks the ward's active officer, and inserts `tickets`, `media` and the first `status_history` row. If the transaction fails, Express deletes the uploaded photo again.
5. Response gives the `publicCode` (R6).

### Officer and verification (R13 to R24)

1. Officer signs in and sees their ward's list. Opens a ticket. `POST /start` (optional).
2. Officer submits the report: `POST /action-report` with remarks and photo(s). Location is read from the officer's browser at that moment. Status → `PENDING_VERIFICATION`.
3. Verifier opens the queue, then `GET /compare`. Express measures the distance between both locations with PostGIS `ST_Distance` and sets `farWarning` if over 50 m (adjustable). The screen shows both photos side by side.
4. Verifier taps **Approve** (`CLOSED`, sets `closed_by`, `closed_at`, marks the action report `APPROVED`) or **Reject** (`REOPENED`, saves the reason, marks the action report `REJECTED`).

### Dashboard (R26 to R34)

Express answers each dashboard route with one `GROUP BY` query, for example:

```sql
SELECT w.name AS ward,
       count(t.id)::int                                                        AS total,
       (count(*) FILTER (WHERE t.status = 'CLOSED'))::int                      AS resolved,
       (count(*) FILTER (WHERE t.status NOT IN ('CLOSED', 'REJECTED')))::int   AS open
FROM wards w
LEFT JOIN tickets t ON t.ward_id = w.id
GROUP BY w.name
ORDER BY w.name;
```

The page re-requests every 10 seconds (R34). `summary` includes `isDemoData: true` whenever any seed rows exist, which turns on the "Demo data" banner (R33).

---

## 10. Photo Handling (R9)

| Step | Rule |
|------|------|
| **In the browser** | Camera or gallery via `<input type="file" accept="image/*" capture="environment">`. Photo is shrunk (about 1600 px on the long side) before upload. |
| **Size** | `multer` limit of 5 MB. Anything bigger → `413`. The Storage bucket also has a 5 MB limit as a second guard. |
| **Type** | `sharp` reads the file's real content. If it isn't a JPEG or PNG image, → `415`. (I tested that a text file is rejected.) |
| **Clean and re-save** | `sharp(buffer).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 80 })`. **`rotate()` first** so phone photos stay upright, then the hidden data (phone GPS, model) is dropped when the new JPEG is written. (I tested that the output has no EXIF data.) |
| **File name** | `tickets/<ticketId>/<random uuid>.jpg`. The user's file name is never used. |
| **Bucket** | One **private** bucket, `ticket-media`. Nothing in it has a public address. |
| **Showing a photo** | Express creates a **signed link** with `createSignedUrl(path, 300)`: it works for 5 minutes. Express puts these links straight inside ticket details and `/compare`, so React uses a normal `<img src>`. |
| **Reasons for 5 minutes** | Supabase can't cancel a signed link before it expires, so it should be short. If a page stays open longer, reload it and the links are made again. |
| **Not one transaction** | The photo upload and the database insert are separate systems. Upload first; if the database step fails, delete the photo. |
| **Privacy notice** | The upload screen shows a short "avoid faces and number plates" note (PRD privacy row). |

---

## 11. Location Handling

- **Ward lookup:** `SELECT id FROM wards WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))`. Sample ward shapes are loaded from `0002_seed_wards.sql`, and real ones can replace them later.
- **Street and area:** Express calls Nominatim `reverse` with a proper `User-Agent`. The free public server has a fair-use policy (about one request per second, no heavy use), so results are cached in memory and there is a 3-second timeout. **Check the current policy before the demo.** If it fails, `street` and `area` stay empty and the screen still shows the ward.
- **Duplicate check:** `ST_DWithin(location, point, 50)` on the `geography` column, so **50 means metres**. Also same category, status not `CLOSED` or `REJECTED`, and created in the last 30 days. Both numbers come from settings.
- **Distance for the before/after check:** `ST_Distance` between the original photo's point and the action report's point, in metres.
- **Function names:** PostGIS lives in the `extensions` schema on Supabase. In `db.js`, run `SET search_path TO public, extensions` whenever a new connection opens (`pool.on('connect', ...)`), so queries can say `ST_Contains` instead of `extensions.ST_Contains`.
- **Phone location needs HTTPS.** `localhost` is allowed, but a phone reaching your laptop by IP address is not. For phone testing, use the deployed HTTPS address or a tunnel (for example a Cloudflare tunnel or ngrok).

---

## 12. Settings (Environment Variables)

**Server (`server/.env`, never committed. Template: `server/.env.example`):**

| Setting | Purpose | Example |
|---------|---------|---------|
| `PORT` | Where Express listens | `3000` |
| `DATABASE_URL` | Supabase database connection string (from the project's Connect page). Use the **session pooler** string by default (Decision S2) | `postgresql://...` |
| `SUPABASE_URL` | Your project address | `https://<project>.supabase.co` |
| `SUPABASE_SECRET_KEY` | Server-only key (*service role* / *secret* key). **Never in the browser** | (long secret) |
| `SUPABASE_BUCKET` | Photo bucket name | `ticket-media` |
| `SIGNED_URL_SECONDS` | Life of a photo link | `300` |
| `MAX_UPLOAD_MB` | Photo size limit | `5` |
| `DUP_RADIUS_METERS` | Duplicate search distance (same for all three categories) | `50` |
| `DUP_WINDOW_DAYS` | Duplicate search time window | `30` |
| `FAR_WARNING_METERS` | Before/after distance warning | `50` |
| `NOMINATIM_USER_AGENT` | Name sent to the address service | `gba-civic-tracker-pilot` |
| `RATE_LIMIT_REPORTS_PER_HOUR` | Spam limit per IP | `20` |
| `SEED_DEMO_PASSWORD` | Password used only when creating the four demo staff logins | (throwaway demo password) |

**Frontend (`frontend/.env`, never committed. Template: `frontend/.env.example`. These end up in the browser, so only public values):**

| Setting | Purpose |
|---------|---------|
| `VITE_SUPABASE_URL` | Your project address |
| `VITE_SUPABASE_ANON_KEY` | The public *anon* / *publishable* key. Safe in the browser **only because row-level security is on** |

**Test-only setting:** `TEST_DATABASE_URL` points Vitest at a local PostGIS database. It must use
`localhost`, `127.0.0.1` or `::1`; it is not used by the deployed server.

---

## 13. Running and Deploying

| Where | How |
|-------|-----|
| **One-time Supabase setup** | Create a project. Apply the SQL files (`supabase link`, then `supabase db push`, or paste them into the SQL editor). Create a **private** bucket named `ticket-media` with a 5 MB limit. Then run `npm run seed` in `server/`. |
| **Development** | `npm run dev` in `server/` (Express on port 3000) and `npm run dev` in `frontend/` (Vite forwards `/api` to Express). |
| **Demo hosting** | Any Node host (for example Render, Railway or Fly.io). The host is picked in the last phase, before the demo (Decision S2). Build command: build the frontend, then install the server. Start command: `node server/src/index.js`. The host provides HTTPS. Add the settings from section 12 as environment variables there. |
| **Reset between rehearsals** | Run `server/scripts/reset-demo.sql` (deletes tickets where `is_demo = false`, and their photo records, history and reports). Delete the matching files from the bucket too, or ignore them. |
| **Backup plan** | A screen recording of the full demo, as the PRD says. |

### Things that can bite you before the demo

| Risk | What to do |
|------|------------|
| **Supabase pauses free projects after 1 week of low activity.** (Docs: you get a warning email about a week before, and can restore from the dashboard within 1 year.) | Open the app or run a query every few days. **Check the project the day before the demo.** If paused, click *Resume project* in the dashboard. |
| **Some free Node hosts put the app to sleep when nobody uses it.** The first request is then slow. | Open the app a few minutes before you present. |
| **Direct database connections use IPv6.** Some hosts only support IPv4. | **Decision S2: use the session pooler connection string by default.** It works on IPv4 hosts. Use the direct string only if you know your host supports IPv6. (Docs recommend a direct connection for long-running servers and the session pooler as the IPv4 fallback. Avoid the *transaction* pooler because we use `SET search_path`.) |
| **Nominatim slow or blocking** | Results are cached and failures fall back to ward-only. Do a few lookups before the demo so common spots are cached. |
| **Demo email rejected by Supabase Auth** | Use an email address you own. |

---

## 14. Testing Plan

Tests need a database with PostGIS. Use a local container (the `postgis/postgis` image) and run the same SQL files. Supabase's `auth.users` table doesn't exist there, so `tests/setup/` creates a tiny stand-in table with just an `id`. For the login step, `createApp({ authenticate })` takes a fake "who is this token?" function in tests, so tests never call Supabase Auth.

| Test | Type | What it proves |
|------|------|----------------|
| `ticketStateMachine.test.js` | Unit | Only the moves in section 6 are allowed |
| `closeRules.test.js` | Integration (Supertest + PostGIS) | Trying to close without an action report gets 409. An officer trying `/approve` gets 403. Closing with a verifier works. (PRD success criterion 2) |
| Officer ward isolation | Integration | Officer A gets 403 on a ward B ticket |
| Inactive staff | Integration | A deactivated verifier gets 403 |
| `wardLookup.test.js` | Integration | A point inside a ward maps to that ward. A point outside gives 422 |
| `duplicates.test.js` | Integration | 17 m away is found. 1 km away is not |
| `upload.test.js` | Integration | 6 MB file gets 413. A `.txt` renamed `.jpg` gets 415. Saved image has no EXIF and is upright |
| `categories.test.js` | Integration | All three category codes are accepted. An unknown code gets 400. The duplicate check ignores tickets of another category |
| `dashboard.test.js` | Integration | Counts match a known set of tickets and are numbers, not strings |
| Row-level security check | Manual, once | With the anon key, reading `tickets` through the Supabase API returns nothing |
| Demo rehearsal | Manual on a phone | Full flow in section 10 of the PRD |

---

## 15. How This Covers the PRD

| PRD requirements | Where in this TRD |
|------------------|-------------------|
| R1, R2, R9 (photo, description, upload checks) | `POST /api/reports`, section 10 |
| R3, R4, R5 (location, pin, ward/street/area) | `POST /api/locations/resolve`, section 11, `MapPicker` |
| R6, R7 (confirmation, check status) | `POST /api/reports` response, `GET /api/reports/:publicCode` |
| R8 (pick one of three categories, room to grow) | `categories` table (three rows), `GET /api/categories` |
| R10, R11, R12 (duplicate check, support) | `GET /api/reports/nearby`, `POST .../support`, `support_count` |
| R13 (auto-assign to ward officer) | Report flow step 4, `staff.ward_id` |
| R14, R15 (officer login, own-ward list) | Section 8 (Supabase Auth + `staff`), `GET /api/officer/tickets` |
| R16, R17 (detail page, In Progress) | `GET /api/tickets/:id`, `POST .../start` |
| R18, R19 (Action Taken Report, status change) | `POST .../action-report`, `action_reports`, `media` |
| R20, R21 (side by side, approve/reject) | `GET .../compare`, `/approve`, `/reject` |
| R22 (server-enforced closing) | Section 6 (three layers) |
| R23 (audit trail) | `status_history`, same transaction as each change |
| R24 (distance warning) | `distanceMeters`, `farWarning` in `/compare` |
| R25 (badge) | `GET /api/officer/tickets/counts` |
| R26 to R34 (dashboard) | `/api/dashboard/*`, section 9, `is_demo` |
| R35 (standalone portal) | One Express service with its own address |
| R36 (mock GBA site link) | `mock-gba-site/index.html` |
| R37 (mobile browsers) | React + Tailwind, tested on a phone |

---

## 16. Choices Worth a "Why This?"

These are the calls most likely to raise a question. Ask about any of them.

1. **Why Express?** It was your choice. It also keeps the whole project in JavaScript, so you switch between frontend and backend without switching languages.
2. **Why Supabase at all?** It removes three chores for a prototype: hosting a database, building a login system, and storing photos. PostGIS is included.
3. **Why still write our own backend instead of using Supabase directly from the browser?** The "no closing without proof" rule and the "write history in the same transaction" rule are safest in one server you control.
4. **Why `pg` (plain SQL) and not `supabase-js` for data?** Transactions and PostGIS queries. `supabase-js` sends each call separately.
5. **Why turn on row-level security with no policies?** The anon key is public. With no policies it can do nothing, so the only way in is through Express.
6. **Why Supabase Auth and not our own login?** Less code, and safe password storage comes for free. The trade-off is one more service, and email as the username.
7. **Why store role and ward in `staff`, not in the token?** So you can change or deactivate someone and it works right away.
8. **Why short-lived photo links?** Photos stay private, and a link that leaks stops working after 5 minutes.
9. **Why does the database also block closing?** If someone later adds a new route and forgets the check, the database still refuses.
10. **Why poll the dashboard instead of live push?** A 10-second refresh looks live enough and is much simpler.
11. **Why three categories on one flow?** Potholes and garbage need the same steps as footpath encroachment (photo, location, fix, before/after check). Each one is a database row and a label, with no new screens. One officer per ward handles all three to keep the pilot simple.

---

## 17. Decisions

Every question from earlier versions is now decided. These are defaults chosen to keep the pilot simple. If you disagree with one, change it here, in `PRD.md` section 13, and tell me.

| # | Question | Decision |
|---|----------|----------|
| S1 | Supabase Auth or your own login? | **Supabase Auth** for staff. |
| S2 | Hosting and database connection? | **Session pooler** connection string by default (works on IPv4-only hosts). Direct string only if the host supports IPv6. The host is picked in the last phase, before the demo. |
| S3 | JavaScript or TypeScript? | **Plain JavaScript** for server and frontend. |
| S4 | Role checks per group or per route? | **Per route.** Each route checks its own role (section 8). |
| T2 | Report outside the sample wards? | **Refused** with 422 and a clear message. |
| T3 | "Mark as invalid" action for the verifier? | **No.** `REJECTED` stays reserved and unused. |
| T4 | Anonymous citizens? | **Yes**, anonymous with rate limits. |
| T5 | Which categories? | **Three**, all reportable: footpath encroachment, potholes / road damage, garbage dumping. Same 50 m duplicate distance for all. One officer per ward handles all three. |
| T6 | Where do the docs and env files live? | Docs in the **project root**. Env files are **`server/.env` and `frontend/.env`**, each with a `.env.example`. |

---

### Sources (Supabase docs and pricing, checked 29 Sept 2026)

- [PostGIS on Supabase](https://supabase.com/docs/guides/database/extensions/postgis)
- [Storage file limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Serving files from private buckets (signed URLs)](https://supabase.com/docs/guides/storage/serving/downloads)
- [Verifying Auth JWTs in your own backend](https://supabase.com/docs/guides/auth/jwts)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Connecting to Postgres (direct vs pooler)](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase pricing](https://supabase.com/pricing)
