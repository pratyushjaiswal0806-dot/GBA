# TRD: GBA Civic Issue Tracker (Pilot)

| | |
|---|---|
| **Product** | Verified Civic Issue Tracker (pilot of the GBA digital governance platform) |
| **Builds on** | `PRD.md` v0.3. Requirement IDs (R1 to R49) and decisions (Q1 to Q22) point to that file. |
| **Version** | 0.4 (proposal, for review) |
| **Date** | 2 October 2026 |
| **Status** | Draft. Every choice has a "why" so you can push back on anything unclear. |
| **Implementation status** | Phase 13 complete (deployed). Phases 14 to 19 approved, not started. |

### What changed from v0.3 to v0.4 (Phases 14 to 19)

| Area | v0.3 | v0.4 (this version) |
|------|------|---------------------|
| Roles | `OFFICER`, `VERIFIER` | Adds **`ADMIN`** (manages staff, categories, assignment; cannot close) |
| Tables | 7 tables | Adds `audit_log` and `notifications`; new columns `categories.sla_days`, `tickets.due_at`, and (optional) `media.kind` |
| Status rules | No `SUBMITTED` exit | **`SUBMITTED` to `OPEN`** through admin assign only. Reassignment is not a status change |
| Officer actions | Checked by ward | Start and Action Taken Report need the **assigned** officer (viewing stays ward-wide) |
| API | Public, officer, verifier, shared | Adds Admin (7.7), Notifications (7.8) and Staff analytics (7.9) |
| Staff accounts | Seed script or dashboard only | Admin creates officers and verifiers through the Auth admin API (section 8) |
| Categories | `reportable` hides a category from the form | Same flag is the on/off switch; the public dashboard keeps showing categories that have tickets |
| Video | Out | Optional Phase 17 (section 10) |

The v0.2 to v0.3 changes (kept for history):

### What changed from v0.2 to v0.3

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
     │ Vercel web │ sign-in only (email + password)
     ▼            ▼
┌──────────────────────┐  HTTPS/API   ┌─────────────────────────────────┐
│  Vercel Vite site    │ ───────────► │  Vercel Express Function        │
│  - React screens     │              │  - ticket rules                  │
│  - maps and charts   │              │  - photo handling                 │
└──────────────────────┘              │  - dashboard numbers              │
                                      └──────────────┬──────────────────┘
                                                     │ SQL + server key
                                                     ▼
                                      ┌─────────────────────────────────┐
                                      │  Supabase                       │
                                      │   • Postgres + PostGIS (tables) │
                                      │   • Auth (staff logins)         │
                                      │   • Storage (photos, private)   │
                                      └─────────────────────────────────┘

                                      Street / area lookup → Nominatim
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
| **Hosting** | **Two Vercel projects** from this repository: a static Vite frontend and an Express API Function | Vercel serves the Vite build from its CDN and runs the API through its supported Express Function entrypoint. The frontend uses a configured API origin and the API allows only configured frontend origins. Both projects provide HTTPS. | A persistent Node host can be used later if the pilot outgrows Function limits. |
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
│       ├── 0003_seed_categories.sql   the three categories
│       ├── 0004_admin_audit.sql       Phase 14: ADMIN role, audit_log
│       ├── 0005_sla_due_date.sql      Phase 15: categories.sla_days, tickets.due_at
│       ├── 0006_notifications.sql     Phase 16: notifications
│       └── 0007_media_kind.sql        Phase 17 (optional): media.kind, video constraints
│
├── server/                      Node + Express
│   ├── package.json
│   ├── .env.example             server settings (real .env is git-ignored)
│   ├── src/
│   │   ├── index.js             starts the server
│   │   ├── application.js       builds the app: middleware, routes, serves frontend
│   │   ├── config.js            reads and checks settings
│   │   ├── db.js                pg Pool + withTransaction() helper
│   │   ├── supabase.js          admin client (Auth check + Storage)
│   │   ├── middleware/
│   │   │   ├── requireAuth.js   token → staff member
│   │   │   ├── requireRole.js   OFFICER / VERIFIER / ADMIN gate
│   │   │   ├── requireAdmin.js  ADMIN-only gate for /api/admin/** (Phase 14)
│   │   │   ├── rateLimit.js
│   │   │   ├── upload.js        multer setup
│   │   │   └── errorHandler.js  one error shape for everything
│   │   ├── modules/
│   │   │   ├── auth/            auth.routes.js            (GET /me)
│   │   │   ├── tickets/         ticket.routes.js, ticket.service.js,
│   │   │   │                    ticket.stateMachine.js, ticket.queries.js
│   │   │   ├── actionReports/   actionReport.service.js
│   │   │   ├── officer/         officer.routes.js, officer.service.js     (own-ward list, counts)
│   │   │   ├── verifier/        verifier.routes.js, verifier.service.js,
│   │   │   │                    verifier.queries.js                       (queue, compare, approve, reject)
│   │   │   ├── media/           media.service.js  (sharp + Storage + signed links)
│   │   │   ├── wards/           ward.service.js   (which ward is this point in?)
│   │   │   ├── geo/             geocoding.js, geoUtils.js
│   │   │   ├── dashboard/       dashboard.routes.js, dashboard.queries.js (public, aggregate only)
│   │   │   ├── admin/           admin.routes.js, staff.service.js, category.service.js,
│   │   │   │                    assignment.service.js, adminTickets.queries.js, csv.js   (Phases 14, 15, 18)
│   │   │   ├── audit/           audit.service.js  (one helper: writeAudit(client, entry))
│   │   │   ├── notifications/   notification.routes.js, notification.service.js          (Phase 16)
│   │   │   └── analytics/       analytics.routes.js, analytics.queries.js  (staff only; separate from dashboard)
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
│       ├── dashboard.test.js
│       ├── adminStaff.test.js         Phase 14
│       ├── adminCategories.test.js    Phase 14
│       ├── adminAssignment.test.js    Phase 15
│       ├── notifications.test.js      Phase 16
│       ├── analytics.test.js          Phase 18
│       ├── csvExport.test.js          Phase 18
│       └── roleMatrix.test.js         Phase 19
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
│       ├── components/          MapPicker, PhotoPicker, StatusBadge, SideBySide, StatCard, charts/,
│       │                        NotificationBell (Phase 16)
│       └── pages/
│           ├── AdminPage.jsx            staff tab, categories tab (Phase 14)
│           ├── AdminTicketsPage.jsx     all-ward list, assign / reassign, overdue (Phase 15)
│           ├── NotificationsPage.jsx    inbox (Phase 16)
│           ├── AnalyticsPage.jsx        staff analytics (Phase 18)
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

### 5.1 Changes for Phases 14 to 19 (migrations 0004 onward)

Each migration is a new SQL file applied with `supabase db push`. Existing files are never edited. **Every new table gets `ENABLE ROW LEVEL SECURITY` with no policies** in the same file. The test harness runs all files in order, and `schema.test.js` checks that RLS is on for every table (Phase 19 makes this check cover all tables).

| Migration | Phase | Contents |
|-----------|-------|----------|
| `0004_admin_audit.sql` | 14 | `ADMIN` added to the staff role CHECK (`officer_has_ward` stays); `audit_log` table |
| `0005_sla_due_date.sql` | 15 | `categories.sla_days`, `tickets.due_at`, index on `due_at` |
| `0006_notifications.sql` | 16 | `notifications` table and index |
| `0007_media_kind.sql` | 17 (optional) | `media.kind` and video constraints |

**0004 (Phase 14):**

```sql
ALTER TABLE staff DROP CONSTRAINT staff_role_check;
ALTER TABLE staff ADD CONSTRAINT staff_role_check
    CHECK (role IN ('OFFICER', 'VERIFIER', 'ADMIN'));
-- officer_has_ward is unchanged: only OFFICER needs a ward.

CREATE TABLE audit_log (
    id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id     UUID         NOT NULL REFERENCES staff(id),
    action       VARCHAR(50)  NOT NULL,          -- e.g. STAFF_CREATED, CATEGORY_DISABLED, TICKET_REASSIGNED
    entity_type  VARCHAR(30)  NOT NULL,          -- STAFF, CATEGORY, TICKET
    entity_id    VARCHAR(40)  NOT NULL,          -- text, so it fits a UUID or an integer
    before_data  JSONB,
    after_data   JSONB,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_entity  ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log (created_at);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
```

**0005 (Phase 15):**

```sql
ALTER TABLE categories ADD COLUMN sla_days INT CHECK (sla_days IS NULL OR sla_days > 0);
ALTER TABLE tickets    ADD COLUMN due_at   TIMESTAMPTZ;       -- null for tickets made before this phase
CREATE INDEX idx_tickets_due_at ON tickets (due_at) WHERE status <> 'CLOSED';
```

**0006 (Phase 16):**

```sql
CREATE TABLE notifications (
    id            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipient_id  UUID         NOT NULL REFERENCES staff(id),
    ticket_id     INT REFERENCES tickets(id) ON DELETE CASCADE,
    type          VARCHAR(40)  NOT NULL,   -- TICKET_ASSIGNED, TICKET_REASSIGNED, NEW_TICKET_IN_WARD,
                                           -- ACTION_REPORT_SUBMITTED, TICKET_REOPENED, TICKET_CLOSED,
                                           -- UNASSIGNED_TICKET
    message       VARCHAR(300) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    read_at       TIMESTAMPTZ
);
CREATE INDEX idx_notifications_recipient ON notifications (recipient_id, read_at);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
```

**0007 (Phase 17, optional):** adds `media.kind VARCHAR(10) NOT NULL DEFAULT 'PHOTO' CHECK (kind IN ('PHOTO', 'VIDEO'))`. The existing `media_type_matches_report` check is unchanged, so a video is still `ORIGINAL` or `ACTION`. New checks: a `VIDEO` row must have a `content_type` starting with `video/`, and a ticket or action report can have at most one `VIDEO` (partial unique indexes). Exact limits are confirmed before Phase 17.

**Notes on these choices**
- **No `categories.active` column.** The existing `reportable` flag already means "shown on the citizen form". A second flag would say the same thing twice. Disabling a category sets `reportable = false`.
- **Public dashboard and disabled categories.** `dashboard.queries.js` by-category currently lists only `reportable = TRUE` categories, so a disabled category's old tickets would vanish and the totals would not add up. In Phase 14 the query changes to list every category that is reportable **or** has at least one ticket. This is the only public-dashboard change.
- **`due_at` is fixed at creation:** `created_at + (category.sla_days or SLA_DEFAULT_DAYS)`. Changing a category's SLA later does not move existing due dates. Tickets made before Phase 15 have `due_at = NULL` and are never overdue. It is stored (not computed from the SLA) so history stays honest.
- **Overdue is worked out on read:** `due_at < now() AND status <> 'CLOSED'`. No cron or background job (Decision Q19).
- **`audit_log.actor_id` is `NOT NULL`:** only logged-in admins write to it. `entity_id` is text so one column fits both staff (UUID) and tickets or categories (integer).
- **Audit rows never hold passwords.** Staff-create audit data stores name, email, role and ward only.
- **`notifications` are only deleted with their ticket** (cascade). There is no clean-up job. This is fine for a pilot (known limit, section 8).
- **Seed data:** `npm run seed` adds one demo admin (`admin@demo.example`, password from `SEED_DEMO_PASSWORD`) and a second Ward A officer (`officer.a2@demo.example`) so reassignment can be shown. The second officer slightly stretches PRD Q11 (one officer per ward); it exists only in demo data.

---

## 6. Ticket Status Rules

All status changes go through one file, `ticket.stateMachine.js`. It holds this table and rejects everything else with **HTTP 409**.

| From | To | Who | Route | Notes |
|------|----|-----|-------|-------|
| (new) | `OPEN` | System | `POST /api/reports` | Ward found and an active officer exists for it |
| (new) | `SUBMITTED` | System | `POST /api/reports` | Ward found but no active officer yet (PRD Q8) |
| `SUBMITTED` | `OPEN` | **Admin only** | `POST /api/admin/tickets/:id/assign` | R42, Decision Q16. The only exit from `SUBMITTED`. Target officer must be active and in the ticket's ward |
| `OPEN` / `REOPENED` | `IN_PROGRESS` | The **assigned** officer | `POST /api/tickets/:id/start` | R17 |
| `OPEN` / `IN_PROGRESS` / `REOPENED` | `PENDING_VERIFICATION` | The **assigned** officer | `POST /api/tickets/:id/action-report` | Needs at least one photo (R18, R19). Starting first is optional |
| `PENDING_VERIFICATION` | `CLOSED` | Verifier | `POST /api/tickets/:id/approve` | The **only** code path that sets `CLOSED` (R22) |
| `PENDING_VERIFICATION` | `REOPENED` | Verifier | `POST /api/tickets/:id/reject` | Reason is required (R21) |
| `CLOSED` | nothing | | | Final in the pilot |
| any | `REJECTED` | | | **Reserved and unused** in the pilot (Decision T3, PRD Q9) |

**Reassignment is not a status change.** `POST /api/admin/tickets/:id/reassign` only changes `assigned_officer_id`. It is allowed for `OPEN`, `IN_PROGRESS` and `REOPENED` tickets. `SUBMITTED` must use assign, and `PENDING_VERIFICATION` and `CLOSED` get **409** (a reject sends the ticket back to the assigned officer, so changing officer mid-check would be confusing). It is not in the state machine table above, because no status moves. It writes a `status_history` row with `from_status = to_status` and a reason such as "Reassigned from A to B", so the timeline shows it (R23, R42).

**Admin cannot close.** No admin route, and no admin role check, touches `approve`, `reject` or `CLOSED`. `approve` and `reject` stay `requireRole('VERIFIER')` only (Decision Q15).

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

`GET /api/reports/nearby` returns `{ "tickets": [...] }` with up to 3 tickets, nearest first. Each one has `publicCode`, `categoryName`, `status`, `street`, `area`, `wardName`, `createdAt`, `supportCount` and `distanceMeters`. It has no photo, description or names. A missing or invalid `lat`, `lng` or `category` gives 400 (`INVALID_NEARBY_QUERY`).

`POST /api/reports/:publicCode/support` returns `{ "publicCode": "K7M2QX9A", "supportCount": 2 }`. An unknown code gives 404, and a `CLOSED` or `REJECTED` ticket gives 409 (`TICKET_NOT_OPEN`). The nearby route uses the location rate limit and the support route uses the report rate limit, so no new settings are needed.

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
| `GET` | `/api/auth/me` | Logged in staff | Returns `{id, name, role, wardId}` from the `staff` table (used when the page reloads). `role` is `OFFICER`, `VERIFIER` or `ADMIN`; `wardId` is `null` for verifiers and admins |

Logging out is `supabase.auth.signOut()` in the browser.

### 7.3 Officer (role `OFFICER`)

| Method | Route | What it does | PRD |
|--------|-------|--------------|-----|
| `GET` | `/api/officer/tickets?status=&page=` | Tickets of **the officer's own ward only** (all three categories) | R15 |
| `GET` | `/api/officer/tickets/counts` | Counts for badges: new, reopened | R25 |
| `POST` | `/api/tickets/:id/start` | Move to `IN_PROGRESS`. Only the **assigned** officer (403 for another officer, even in the same ward) | R17 |
| `POST` | `/api/tickets/:id/action-report` | Form fields: `remarks`, `photos` (1 to 3 files), `lat`, `lng`. Moves to `PENDING_VERIFICATION`. Only the **assigned** officer | R18, R19 |

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

### 7.5 Shared staff route (officer, verifier or admin)

| Method | Route | What it does | PRD |
|--------|-------|--------------|-----|
| `GET` | `/api/tickets/:id` | Ticket detail: photo links, description, map position, ward, status timeline, `dueAt`, `isOverdue`, assigned officer. **Officers get 403 for tickets of another ward.** Verifiers and admins can read any ticket (admin is read-only here) | R16 |

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

Phases 14 to 16 add these error codes, all in the same shape: `409 STAFF_HAS_ACTIVE_TICKETS` (deactivate or ward change without a replacement), `409 LAST_ADMIN`, `409 CANNOT_DEACTIVATE_SELF`, `409 EMAIL_EXISTS`, `409 CATEGORY_EXISTS`, `409 TICKET_NOT_ASSIGNABLE` (assign on a ticket that is not `SUBMITTED`), `409 TICKET_NOT_REASSIGNABLE` (status is `SUBMITTED`, `PENDING_VERIFICATION` or `CLOSED`), and `409 OFFICER_NOT_ELIGIBLE` (officer is inactive, not an officer, or not in the ticket's ward). An officer who is not the assigned officer gets `403 FORBIDDEN` on start and action-report.

**Why one route per action** (`/start`, `/approve`, `/reject`) and not a single "change status" route? Each route allows exactly one move and one role. There is no way to send `{"status": "CLOSED"}` and skip a step.

**Express note:** on Express 4, wrap async route functions so a thrown error reaches `errorHandler` (Express 5 does this for you). Check which version `npm install express` gives you.

### 7.7 Admin (role `ADMIN`, Phases 14, 15 and 18)

Every route under `/api/admin` uses `requireAuth` then `requireAdmin`, and the admin rate limit. **Every write below runs in one transaction with an `audit_log` row** (`writeAudit(client, {...})`). None of these routes sets a ticket status except `assign` (the one `SUBMITTED` to `OPEN` move). Lists use `?page=` (from 1) and `?pageSize=` (default and maximum from settings in code, 20 and 100).

**Staff (Phase 14)**

| Method | Route | Body | Response | PRD |
|--------|-------|------|----------|-----|
| `GET` | `/api/admin/staff?role=&active=&wardId=&page=` | | `{ "staff": [{ id, fullName, email, role, wardId, wardName, active, unfinishedTickets, createdAt }], "page", "total" }`. `unfinishedTickets` counts assigned tickets not `CLOSED` | R39 |
| `POST` | `/api/admin/staff` | `{ fullName, email, password, role: "OFFICER" or "VERIFIER", wardId }` (`wardId` required for `OFFICER`, must be empty for `VERIFIER`) | `201` `{ id, fullName, email, role, wardId, active }`. **No password in the response.** `ADMIN` as a role gives 400 | R39 |
| `PATCH` | `/api/admin/staff/:id` | `{ fullName?, wardId?, replacementOfficerId? }`. Role and email cannot be changed. `wardId` only for officers. Changing the ward of an officer with unfinished tickets needs `replacementOfficerId` (same rule as deactivate) | The updated staff row | R39 |
| `POST` | `/api/admin/staff/:id/deactivate` | `{ replacementOfficerId? }`. If the person has unfinished tickets and no replacement is sent: `409 STAFF_HAS_ACTIVE_TICKETS` with the count. With a replacement (an **active officer of the same ward**): all their unfinished tickets move to the replacement in the same transaction, each with a `status_history` reassignment row, a notification (Phase 16) and an audit row | The updated staff row. `409 CANNOT_DEACTIVATE_SELF` and `409 LAST_ADMIN` apply | R39 |
| `POST` | `/api/admin/staff/:id/activate` | none | The updated staff row | R39 |
| `GET` | `/api/admin/audit-log?entityType=&entityId=&page=` | | `{ "entries": [{ id, actorId, actorName, action, entityType, entityId, before, after, createdAt }], "page", "total" }` | R48 |

**Categories (Phase 14, SLA field from Phase 15)**

| Method | Route | Body | Response | PRD |
|--------|-------|------|----------|-----|
| `GET` | `/api/admin/categories` | | `{ "categories": [{ id, code, name, reportable, slaDays, ticketCount }] }` (all, including disabled) | R40 |
| `POST` | `/api/admin/categories` | `{ name, slaDays? }`. The `code` is made from the name (upper case, underscores) and cannot be edited later. Starts enabled. Duplicate: `409 CATEGORY_EXISTS` | `201` the category | R40 |
| `PATCH` | `/api/admin/categories/:id` | `{ name?, slaDays? }` (`slaDays: null` clears it). `code` never changes | The category | R40 |
| `POST` | `/api/admin/categories/:id/enable` | none | The category (`reportable = true`) | R40 |
| `POST` | `/api/admin/categories/:id/disable` | none | The category (`reportable = false`). Old tickets keep it. It leaves `GET /api/categories` and the report form | R40 |

**Tickets (Phase 15, export in Phase 18)**

| Method | Route | Body | Response | PRD |
|--------|-------|------|----------|-----|
| `GET` | `/api/admin/tickets?wardId=&categoryId=&status=&officerId=&unassigned=&overdue=&from=&to=&sort=&order=&page=&pageSize=` | | `{ "tickets": [{ id, publicCode, categoryName, status, wardName, street, area, assignedOfficerId, assignedOfficerName, createdAt, dueAt, isOverdue }], "page", "pageSize", "total" }`. `unassigned=true` means `assigned_officer_id IS NULL`. `overdue=true` means `due_at < now() AND status <> 'CLOSED'`. `from` and `to` filter `created_at`. `sort` is one of `createdAt`, `dueAt`, `status` and `order` is `asc` or `desc`. Unknown values give 400 | R41, R43 |
| `POST` | `/api/admin/tickets/:id/assign` | `{ officerId }` | `{ ticketId, status: "OPEN", assignedOfficerId }`. Row lock, ticket must be `SUBMITTED` (else `409 TICKET_NOT_ASSIGNABLE`), officer must be active and in the ticket's ward (else `409 OFFICER_NOT_ELIGIBLE`). Writes history `SUBMITTED` to `OPEN`, audit, notification | R42 |
| `POST` | `/api/admin/tickets/:id/reassign` | `{ officerId, reason? }` | `{ ticketId, status, assignedOfficerId }` with the **same status as before**. Row lock. Allowed for `OPEN`, `IN_PROGRESS`, `REOPENED`; otherwise `409 TICKET_NOT_REASSIGNABLE`. Same officer check as assign. Writes history (from = to status, with reason), audit, notification | R42 |
| `GET` | `/api/admin/tickets/export.csv` | same filters as the list, no paging | `text/csv`, at most `CSV_EXPORT_MAX_ROWS` rows, sorted as asked. Cells starting with `=`, `+`, `-` or `@` get a leading apostrophe; quotes, commas and new lines are escaped | R47 |

### 7.8 Notifications (roles `OFFICER`, `VERIFIER`, `ADMIN`, Phase 16)

All routes use `requireAuth` and the notification rate limit. Each query includes `WHERE recipient_id = $userId`, so a user only ever sees their own. Another person's notification id gives **404** (not 403, so ids are not confirmed to exist).

| Method | Route | Response | PRD |
|--------|-------|----------|-----|
| `GET` | `/api/notifications?unread=&page=` | `{ "notifications": [{ id, ticketId, type, message, createdAt, readAt }], "page", "total" }`, newest first | R45 |
| `GET` | `/api/notifications/unread-count` | `{ "unread": 3 }` | R45 |
| `POST` | `/api/notifications/:id/read` | `{ "id": 7, "readAt": "..." }`. Reading twice is fine (keeps the first time) | R45 |
| `POST` | `/api/notifications/read-all` | `{ "updated": 4 }` | R45 |

**When rows are created** (inside the same transaction as the change, so a failed change creates none):

| Trigger | Recipient | Type |
|---------|-----------|------|
| Report created and auto-assigned | The ward's officer | `NEW_TICKET_IN_WARD` |
| Report created with no officer (`SUBMITTED`) | All active admins | `UNASSIGNED_TICKET` |
| Admin assigns | The new officer | `TICKET_ASSIGNED` |
| Admin reassigns (or deactivate with replacement) | The new officer | `TICKET_REASSIGNED` |
| Action Taken Report submitted | All active verifiers | `ACTION_REPORT_SUBMITTED` |
| Verifier rejects | The assigned officer | `TICKET_REOPENED` |
| Verifier approves | The assigned officer | `TICKET_CLOSED` |

The page polls `unread-count` every `VITE_NOTIFICATION_POLL_SECONDS` seconds (no realtime, no new library). Phase 16's plan decides whether the bell replaces the R25 badge (`/api/officer/tickets/counts`).

### 7.9 Staff analytics (roles `OFFICER`, `VERIFIER`, `ADMIN`, Phase 18)

Separate from the public dashboard, which stays aggregate-only and unchanged. Every route takes optional `?wardId=&from=&to=` (`from` and `to` filter `created_at`). **Scoping:** verifiers and admins see all wards. An officer is always limited to their own ward: omitting `wardId` means their ward, and asking for another ward gives `403 FORBIDDEN`. Counts are cast to `::int` and averages are rounded in SQL.

| Method | Route | Response | PRD |
|--------|-------|----------|-----|
| `GET` | `/api/analytics/resolution-time` | `{ "byWard": [{ ward, closed, avgHours, medianHours }], "byCategory": [{ category, closed, avgHours, medianHours }] }`. Time = `closed_at - created_at` for `CLOSED` tickets. Median uses `percentile_cont(0.5)` | R46 |
| `GET` | `/api/analytics/reopen-rate` | `{ "ticketsChecked": 40, "reopened": 6, "rate": 15.0 }`. Of tickets that ever reached `PENDING_VERIFICATION`, the share that were ever `REOPENED` (from `status_history`) | R46 |
| `GET` | `/api/analytics/rejection-rate` | `{ "decided": 50, "rejected": 8, "rate": 16.0 }`. Of decided action reports, the share with decision `REJECTED` | R46 |
| `GET` | `/api/analytics/workload` | `{ "officers": [{ officerId, officerName, wardName, open, inProgress, pendingVerification, reopened, overdue }] }` | R46 |
| `GET` | `/api/analytics/overdue` | `{ "overdue": 12, "totalUnfinished": 80 }` | R46, R43 |
| `GET` | `/api/analytics/age-buckets` | `{ "buckets": [{ label: "0-2 days", count }, { "3-7 days" }, { "8-14 days" }, { "15+ days" }] }` for unfinished tickets, by `now() - created_at`. Bucket edges are named constants in `analytics.queries.js` | R46 |

---

## 8. Login and Access (Auth)

### Who needs to log in

| User | Login? | How they're limited |
|------|--------|---------------------|
| Public visitor | No | Dashboard and status page only |
| Citizen | No (pilot) | Can create a report, add support, check status by code. Rate-limited |
| Ward Officer | Yes | Sees tickets **of their own ward only**. Changes only tickets **assigned to them** |
| Verifier | Yes | Sees tickets in all wards, approves or rejects |
| Admin | Yes | Sees all wards. Manages staff, categories and assignment. **Cannot** approve, reject, close, start work or submit Action Taken Reports |

### How it works

1. Staff type email and password. The React app sends them **to Supabase Auth** and gets back a **session**: a signed token (JWT) that the `supabase-js` library keeps fresh automatically.
2. For every request to Express, `api/client.js` adds the header `Authorization: Bearer <token>`.
3. `requireAuth` in Express asks Supabase "who is this token?" using `supabaseAdmin.auth.getUser(token)`. Invalid or expired → **401**.
4. Express then reads that person's row: `SELECT role, ward_id FROM staff WHERE id = $1 AND active`. No row, or `active = false` → **403**. Sets `req.user = { id, role, wardId }`.
5. `requireRole('OFFICER')`, `requireRole('VERIFIER')` or `requireAdmin` guards **each route separately** (Decision S4):
   - Officer only: `/api/officer/**`, `POST /api/tickets/:id/start`, `POST /api/tickets/:id/action-report`
   - Verifier only: `/api/verifier/**`, `GET /api/tickets/:id/compare`, `POST /api/tickets/:id/approve`, `POST /api/tickets/:id/reject`
   - Admin only (`requireAdmin`): `/api/admin/**`
   - Any active staff member: `GET /api/tickets/:id`, `GET /api/auth/me`, `/api/notifications/**`, `/api/analytics/**` (officers are limited to their own ward)
   - Public routes from 7.1 need nothing
6. **Ward check happens inside the SQL,** not just in the route: every officer query includes `WHERE ward_id = $wardId`. An officer who guesses another ticket's ID gets 403. For `start` and `action-report`, the SQL also checks `assigned_officer_id = $userId`.

### Admin-created staff accounts (Phase 14)

The first admin comes from the seed script (or the Supabase dashboard). After that, admins create officers and verifiers from the screen, with no public sign-up.

1. The admin form sends `{ fullName, email, password, role, wardId }` to `POST /api/admin/staff` over HTTPS. The password is at least 12 characters.
2. Express calls `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })` with the **existing server key**. This runs only on the server. The demo email domain cannot receive mail, so there is no email invite in the pilot.
3. Then, in **one database transaction**, Express inserts the `staff` row (same id as the new Auth user) and the `audit_log` row. If that transaction fails, Express deletes the new Auth user again. This is the same upload-then-clean-up pattern as photos (section 10), because Auth and the database are separate systems and cannot share a transaction.
4. **The password is never stored by us, logged, put in the audit log, or sent back.** The request body is not logged anywhere, the zod error messages never echo it, and the response has no password field. The admin tells the person their password outside the system. Tests check that no response or audit row contains it.
5. Deactivation sets `staff.active = false`. `requireAuth` reads `active` on every request, so it works at once and the Auth user does not need to be banned. Staff and Auth users are **never deleted**.
6. **Known limit:** there is no change-password or forgot-password screen in the pilot. A shared initial password stays in use until someone resets it in the Supabase dashboard.

### Details and the reasons

| Decision | Why |
|----------|-----|
| **Supabase Auth for passwords** | No hashing code to write or get wrong. Users are created in Supabase (by the seed script or the dashboard), so there is no public sign-up. |
| **Role and ward stored in our `staff` table**, not inside the token | Easy to change. And since Express reads it on every request, **deactivating someone takes effect immediately.** |
| **`getUser(token)` on every request** | Works for any Supabase key setup and is easy to understand. Cost: one extra web call per request. Fine for a pilot. **Faster option later:** verify the token locally with the `jose` library and Supabase's public keys (a JWKS address). That works with Supabase's newer signing keys only. |
| **Server key stays on the server** | Express uses the Supabase **server key** (called the *service role* or *secret* key in the dashboard). It can do anything, so it is never sent to the browser and never committed. The browser only gets the public **anon** key, which can only do sign-in because the tables have no open policies. |
| **Email as the username** | Supabase Auth logs in with email. The login screen says "Email". Demo emails like `officer.a@demo.example` are fine if Supabase accepts them. If it rejects the domain, use an address you own. (I haven't tested this part.) |
| **Token kept by `supabase-js` in the browser** | Simple. Downside: script injection on the page could read it, so the React app must never show untrusted HTML. |
| **CORS is narrow and explicit** | Vercel hosts the frontend and API as separate projects. The frontend reads `VITE_API_BASE_URL`; Express allows only the comma-separated `FRONTEND_ORIGINS` values. In development, Vite's proxy keeps both apps on the local flow. |
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
- No change-password screen. Initial passwords for admin-created staff are chosen by the admin (see above).
- Notifications are never cleaned up, and polling means a delay of up to the poll interval.
- Uploaded videos (if Phase 17 is built) are not cleaned of hidden data, and a signed upload URL that is never registered leaves an unused file (section 10).

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

### Additions to these flows (Phases 14 to 19)

- **Report creation (Phase 15, 16):** the same transaction also sets `due_at` (`created_at + sla_days`, or `SLA_DEFAULT_DAYS`) and writes the notification row (the ward's officer, or all admins if the ticket is `SUBMITTED`).
- **Assign and reassign (Phase 15):** `SELECT ... FOR UPDATE` on the ticket, check status, check the officer (active, role `OFFICER`, same ward), update `assigned_officer_id` (and status for assign), then `status_history`, `audit_log` and the notification, all in one `withTransaction`.
- **Approve, reject, action report (Phase 16):** the existing transaction gets one more insert for the notification. Nothing else changes, and closing is still verifier-only.

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

### Video evidence (Phase 17, optional: only if the owner says yes)

Proposed limits, confirmed before Phase 17 starts (Decision Q20): MP4, MOV or WebM; **20 MB**; **20 seconds**; one video per report and per Action Taken Report; a photo is still required.

| Step | Rule |
|------|------|
| **Why not through Express** | Vercel Functions accept at most 4.5 MB per request body (section 13). A video cannot pass through Express, so the browser uploads **straight to Supabase Storage** with a signed upload URL. |
| **Bucket** | A second **private** bucket, `ticket-videos` (`SUPABASE_VIDEO_BUCKET`), with the size limit and allowed types set on the bucket. `ticket-media` keeps its 5 MB limit. The bucket is the real server-side limit on size and type. |
| **1. Ask** | `POST /api/tickets/:id/video-upload` (officer for an Action Taken Report) or `POST /api/reports/video-upload` (citizen, before the report exists). Body: `{ contentType, sizeBytes }`. Express checks type and size, rate limits, and returns `{ path, token }` from `createSignedUploadUrl`. Path is `tickets/<uuid>.<ext>`, never a user file name. |
| **2. Upload** | The browser sends the file to Storage with that token. |
| **3. Register** | The report or action-report request includes the `videoPath`. Express asks Storage for the object's real size and type, rejects it if it is missing or over the limit, then inserts the `media` row (`kind = 'VIDEO'`) in the same transaction as the report. |
| **Duration** | The browser reads the video length and refuses over 20 seconds, but **the server cannot verify duration** without a new library (ffprobe or similar). Size and type are the hard limits. This is a known limit. |
| **Cleaning** | `sharp` cannot clean video. Hidden data (GPS, device) stays in the file. The privacy notice must say so. |
| **Unused files** | A signed URL that is never registered leaves a file in the bucket. There are no background jobs, so it stays until someone clears it. Known limit. The upload-ask routes are rate limited to slow abuse. |
| **Showing a video** | A signed link (`createSignedUrl`, 5 minutes), shown in a plain `<video controls>` player. No poster frame is generated. |

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
| `FRONTEND_ORIGINS` | Comma-separated HTTPS origins allowed to call the API | `https://<web-project>.vercel.app` |
| `SUPABASE_BUCKET` | Photo bucket name | `ticket-media` |
| `SIGNED_URL_SECONDS` | Life of a photo link | `300` |
| `MAX_UPLOAD_MB` | Photo size limit | `5` |
| `DUP_RADIUS_METERS` | Duplicate search distance (same for all three categories) | `50` |
| `DUP_WINDOW_DAYS` | Duplicate search time window | `30` |
| `FAR_WARNING_METERS` | Before/after distance warning | `50` |
| `NOMINATIM_USER_AGENT` | Name sent to the address service | `gba-civic-tracker-pilot` |
| `NOMINATIM_BASE_URL` | Address-lookup provider endpoint; keeping it configurable lets the server switch providers without a browser update | `https://nominatim.openstreetmap.org` |
| `RATE_LIMIT_REPORTS_PER_HOUR` | Spam limit per IP | `20` |
| `SEED_DEMO_PASSWORD` | Password used only when creating the demo staff logins (from Phase 14: two more, the demo admin and a second Ward A officer) | (throwaway demo password) |
| `RATE_LIMIT_ADMIN_PER_MINUTE` | Rate limit per user for `/api/admin/**` (Phase 14) | `60` |
| `SLA_DEFAULT_DAYS` | Days until a ticket is due when its category has no `sla_days` (Phase 15) | `7` |
| `RATE_LIMIT_NOTIFICATIONS_PER_MINUTE` | Rate limit per user for `/api/notifications/**`; must be above the polling rate (Phase 16) | `60` |
| `CSV_EXPORT_MAX_ROWS` | Most rows one CSV export can contain (Phase 18) | `5000` |
| `SUPABASE_VIDEO_BUCKET` | Private bucket for videos (Phase 17, optional) | `ticket-videos` |
| `MAX_VIDEO_MB` | Video size limit (Phase 17, optional) | `20` |
| `MAX_VIDEO_SECONDS` | Video length limit, checked in the browser only (Phase 17, optional) | `20` |

**Frontend (`frontend/.env`, never committed. Template: `frontend/.env.example`. These end up in the browser, so only public values):**

| Setting | Purpose |
|---------|---------|
| `VITE_SUPABASE_URL` | Your project address |
| `VITE_SUPABASE_ANON_KEY` | The public *anon* / *publishable* key. Safe in the browser **only because row-level security is on** |
| `VITE_MAP_TILE_URL` | Public OpenStreetMap tile template used by the Leaflet map | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` |
| `VITE_API_BASE_URL` | Public origin of the deployed Express API project | `https://<api-project>.vercel.app` |
| `VITE_MAX_UPLOAD_MB` | Client-side source-file limit, matching `MAX_UPLOAD_MB` | `5` |
| `VITE_NOTIFICATION_POLL_SECONDS` | How often the staff header asks for the unread count (Phase 16) | `30` |
| `VITE_MAX_VIDEO_MB`, `VITE_MAX_VIDEO_SECONDS` | Client-side video limits, matching the server (Phase 17, optional) | `20`, `20` |

**Test-only setting:** `TEST_DATABASE_URL` points Vitest at a local PostGIS database. It must use
`localhost`, `127.0.0.1` or `::1`; it is not used by the deployed server.

---

## 13. Running and Deploying

| Where | How |
|-------|-----|
| **One-time Supabase setup** | Create a project. Apply the SQL files (`supabase link`, then `supabase db push`, or paste them into the SQL editor). Create a **private** bucket named `ticket-media` with a 5 MB limit. Then run `npm run seed` in `server/`. |
| **Development** | `npm run dev` in `server/` (Express on port 3000) and `npm run dev` in `frontend/` (Vite forwards `/api` to Express). |
| **Demo hosting** | Two Vercel projects connected to this repository. Set the frontend project's root directory to `frontend` (build `npm run build`, output `dist`) and the API project's root directory to `server` (Express entrypoint `src/index.js`). Add the public `VITE_` settings to the frontend project and the server settings, including `FRONTEND_ORIGINS`, to the API project. |
| **Reset between rehearsals** | Run `server/scripts/reset-demo.sql` (deletes tickets where `is_demo = false`, and their photo records, history, reports and notifications; from Phase 19 it also clears `audit_log` rows. Staff and category changes made by an admin are not undone). It does **not** delete files in Storage. Delete the matching files from the bucket too, or ignore them. |
| **Backup plan** | A screen recording of the full demo, as the PRD says. |

### Things that can bite you before the demo

| Risk | What to do |
|------|------------|
| **Supabase pauses free projects after 1 week of low activity.** (Docs: you get a warning email about a week before, and can restore from the dashboard within 1 year.) | Open the app or run a query every few days. **Check the project the day before the demo.** If paused, click *Resume project* in the dashboard. |
| **Vercel Functions can receive at most 4.5 MB per request body.** | The browser resizes accepted images before upload so one report or three action photos stay below the platform limit. The original-file check still rejects files over the configured 5 MB limit. |
| **Direct database connections use IPv6.** Some hosts only support IPv4. | **Decision S2: use the session pooler connection string by default.** It works on IPv4 hosts. Use the direct string only if you know your host supports IPv6. (Docs recommend a direct connection for long-running servers and the session pooler as the IPv4 fallback. Avoid the *transaction* pooler because we use `SET search_path`.) |
| **Nominatim slow or blocking** | Results are cached and failures fall back to ward-only. Do a few lookups before the demo so common spots are cached. |
| **Demo email rejected by Supabase Auth** | Use an email address you own. |

---

## 14. Testing Plan

Tests need a database with PostGIS. Use a local container (the `postgis/postgis` image) and run the same SQL files. Supabase's `auth.users` table doesn't exist there, so `tests/setup/` creates a tiny stand-in table with just an `id`. For the login step, `createApp({ authenticate })` takes a fake "who is this token?" function in tests, so tests never call Supabase Auth. From Phase 14 the stand-in `auth.users` table also has an `email` column (the staff list reads it), and `createApp` takes a fake admin client so tests can "create" and "delete" Auth users without calling Supabase.

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
| `adminStaff.test.js` (Phase 14) | Integration | Officer and verifier get 403 and anonymous gets 401 on `/api/admin/*`. Create staff makes an Auth user (fake) and a `staff` row. No password in the response or audit row. Deactivate works, refuses self, last admin, and active tickets without a replacement; with a replacement the tickets move. Every write creates an `audit_log` row |
| `adminCategories.test.js` (Phase 14) | Integration | Disabling a category removes it from `GET /api/categories`; old tickets keep it and still show on the dashboard by-category. Duplicate name gives 409. Audit rows written |
| `schema.test.js` | Integration | Updated each migration: new tables exist, `ADMIN` is accepted by the role check, `officer_has_ward` still holds, RLS is on for every table (all tables in Phase 19) |
| `adminAssignment.test.js` (Phase 15) | Integration | Assign moves `SUBMITTED` to `OPEN`. Reassign keeps the status. Inactive or other-ward officer gets 409. Closed and pending tickets get 409. Non-admin gets 403. Filters, paging and overdue work. A non-assigned officer gets 403 on start and action-report |
| `ticketStateMachine.test.js` (Phase 15) | Unit | `SUBMITTED` to `OPEN` allowed, and nothing else leaves `SUBMITTED` |
| `notifications.test.js` (Phase 16) | Integration | Each trigger creates the right rows for the right people. A user cannot list, read or mark another user's notifications (404). Unread count and mark-all work |
| `analytics.test.js` (Phase 18) | Integration | Metrics match a known seeded set. Officer is limited to own ward (403 for another). Verifier and admin see all wards |
| `csvExport.test.js` (Phase 18) | Unit and integration | Cells starting with `=`, `+`, `-`, `@` are prefixed. Commas, quotes and new lines are escaped. Only admin can export. Row cap holds |
| `roleMatrix.test.js` (Phase 19) | Integration | Every route called as anonymous, officer (own and other ward), verifier and admin returns the expected status |
| Video tests (Phase 17, optional) | Integration | Wrong type, over-size and wrong role are refused; a registered video creates a `VIDEO` media row |
| Row-level security check | Manual, once | With the anon key, reading `tickets` through the Supabase API returns nothing. Repeat for `audit_log` and `notifications` after their migrations |
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
| R38 (admin role) | `staff.role = 'ADMIN'`, `requireAdmin`, sections 6 and 8 |
| R39 (staff management) | 7.7 staff routes, section 8 (admin-created accounts) |
| R40 (category management) | 7.7 category routes, `categories.reportable`, `sla_days` |
| R41, R42 (admin list, assign, reassign) | 7.7 ticket routes, section 6 |
| R43 (overdue) | `tickets.due_at`, computed on read |
| R44, R45 (notifications) | `notifications` table, 7.8 |
| R46, R47 (staff analytics, CSV) | 7.9, `GET /api/admin/tickets/export.csv` |
| R48 (audit log) | `audit_log`, `writeAudit` in the same transaction, `GET /api/admin/audit-log` |
| R49 (video, optional) | Section 10 video flow, `media.kind` |
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
12. **Why can the Admin not close tickets?** The "no closing without a check" rule is the point of the whole pilot. If the person who assigns tickets could also close them, the rule would have a back door. Admin and Verifier stay separate roles.
13. **Why write the audit row in the same transaction?** If the change succeeds, the log row exists; if the change fails, no log row is left behind. There is no case where something changed without a record.
14. **Why compute overdue on read, with a stored `due_at`?** No cron or background job is needed on Vercel. Storing `due_at` at creation keeps old tickets honest if the SLA is edited later.
15. **Why reuse `reportable` and not add `active`?** It already means "shown on the form". Two flags for one idea would drift apart.
16. **Why check the assigned officer, not only the ward?** Otherwise a reassignment would only change a name on screen: the old officer could still start work or submit the report.
17. **Why in-app notifications with polling?** No mail service, no realtime server, no new library. A 30-second poll is enough for a pilot. Same reasoning as the dashboard refresh (point 10).
18. **Why upload video straight to Supabase?** Vercel limits request bodies to 4.5 MB, so a video cannot go through Express. Express still decides who may upload, checks the result and writes the database row.
19. **Why does the admin set the initial password?** The demo emails cannot receive mail, so an invite link cannot work, and returning a generated password would put a secret in a response. The admin types it, Express passes it on, and nothing keeps it.

---

## 17. Decisions

Every question from earlier versions is now decided. These are defaults chosen to keep the pilot simple. If you disagree with one, change it here, in `PRD.md` section 13, and tell me.

| # | Question | Decision |
|---|----------|----------|
| S1 | Supabase Auth or your own login? | **Supabase Auth** for staff. |
| S2 | Hosting and database connection? | **Vercel** with separate frontend and Express API projects. Use the **session pooler** connection string by default (works on IPv4-only hosts); direct string only if the host supports IPv6. |
| S3 | JavaScript or TypeScript? | **Plain JavaScript** for server and frontend. |
| S4 | Role checks per group or per route? | **Per route.** Each route checks its own role (section 8). |
| T2 | Report outside the sample wards? | **Refused** with 422 and a clear message. |
| T3 | "Mark as invalid" action for the verifier? | **No.** `REJECTED` stays reserved and unused. |
| T4 | Anonymous citizens? | **Yes**, anonymous with rate limits. |
| T5 | Which categories? | **Three**, all reportable: footpath encroachment, potholes / road damage, garbage dumping. Same 50 m duplicate distance for all. One officer per ward handles all three. |
| T6 | Where do the docs and env files live? | Docs in the **project root**. Env files are **`server/.env` and `frontend/.env`**, each with a `.env.example`. |
| T7 | Admin role (PRD Q15) | **`ADMIN`** in the staff role CHECK. `requireAdmin` guards `/api/admin/**`. Admin can never approve, reject or close. |
| T8 | Assign and reassign (PRD Q16, Q17) | `SUBMITTED` to `OPEN` through admin assign only. Reassign changes the officer, not the status. Same ward only. Only `OPEN`, `IN_PROGRESS`, `REOPENED` can be reassigned. Writes a `status_history` row (from = to) and an audit row. |
| T9 | Who may act on a ticket | Start and Action Taken Report need the **assigned** officer. Viewing stays ward-wide for officers. (Changes Phase 6 and 7 behaviour.) |
| T10 | Category switch-off | Reuse **`categories.reportable`**. No `active` column. The public by-category chart lists categories that are reportable or have tickets. |
| T11 | Staff accounts (PRD Q22) | Admin creates **officers and verifiers** through the Auth admin API, with an initial password typed by the admin and never stored, logged or returned. Staff are only deactivated, never deleted. Deactivation or ward change with unfinished tickets needs a same-ward replacement officer. An admin cannot deactivate themselves; the last active admin cannot be deactivated. |
| T12 | Overdue (PRD Q19) | `tickets.due_at` set at creation from `sla_days` or `SLA_DEFAULT_DAYS`. Overdue is worked out on read. Old tickets have no due date. |
| T13 | Notifications (PRD Q18) | In-app table, polled by the browser. No email, SMS or push. Created inside the existing transactions. |
| T14 | Audit log | `audit_log` written by `writeAudit(client, entry)` in the same transaction as every admin write. Never holds passwords. |
| T15 | CSV export | Hand-written, admin only, capped by `CSV_EXPORT_MAX_ROWS`, with formula-injection protection. No new library. |
| T16 | Video (PRD Q20) | Optional Phase 17. Signed upload straight to a separate private bucket. Duration is checked in the browser only. Confirm limits before starting. |

---

### Sources (Supabase docs and pricing, checked 29 Sept 2026; not re-checked for v0.4)

- [PostGIS on Supabase](https://supabase.com/docs/guides/database/extensions/postgis)
- [Storage file limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Serving files from private buckets (signed URLs)](https://supabase.com/docs/guides/storage/serving/downloads)
- [Verifying Auth JWTs in your own backend](https://supabase.com/docs/guides/auth/jwts)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Connecting to Postgres (direct vs pooler)](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase pricing](https://supabase.com/pricing)
