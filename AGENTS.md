# CLAUDE.md

> Implementation status: Phase 12 complete; Phase 13 deployment pending.

Rules for working on this project. Read this at the start of every session.

## 1. Project

GBA Civic Issue Tracker (pilot): a small, separate web portal with one shared flow for three issue types:
footpath encroachment (main demo), potholes / road damage, and garbage dumping.
A citizen reports with a photo and automatic location. A ward officer fixes it and uploads an Action
Taken Report. A verifier compares before/after photos, and only then can the ticket close.
A public dashboard shows demo data. This is a prototype for a presentation: no real data, no real users.

## 2. Docs to read

Before starting ANY task, read these in full:

- [PRD.md](PRD.md): what to build (requirements R1 to R37, out of scope, demo script)
- [TRD.md](TRD.md): how to build it. **TRD.md is the source of truth for the stack, data model and API routes.**
- [PHASES.md](PHASES.md): the phase plan and which phase is current

Decisions in PRD section 13 and TRD section 17 are final. Do not reopen them without asking me.
If any of these files is missing or unclear, stop and tell me. Do not guess what it says.

## 3. Stack and folders (summary of TRD sections 3 and 4)

- Backend: Node.js + Express (JavaScript, ES modules) in `server/`. Plain SQL with `pg`. No ORM.
- Frontend: React + Vite (JavaScript) with Tailwind, Leaflet and Recharts, in `frontend/`.
- Supabase: Postgres + PostGIS, Auth (staff login only), Storage (private bucket `ticket-media`).
- Express serves `/api` and the built frontend. The browser talks to Supabase only to sign in.
- Server code is grouped by feature in `server/src/modules/` (tickets, media, wards, geo, dashboard).
- Database changes are SQL files in `supabase/migrations/`. Mock GBA site is in `mock-gba-site/`.
- The three categories are rows in the `categories` table. One officer per ward handles all three.
- Docs sit in the project root. Env files: `server/.env` and `frontend/.env`, each with a `.env.example`.
- Libraries named in the TRD are approved: zod, multer, sharp, express-rate-limit, helmet, Vitest, Supertest.

## 4. Commands

Commands below come from the TRD. Check that each one exists in `package.json` before running it.
Never invent a command. If one is missing, write TODO.

- Install: `npm install` in `server/` and `frontend/`
- Run in development: `npm run dev` in `server/` and in `frontend/`
- Build frontend: `npm run build` in `frontend/`
- Start (production): `node server/src/index.js`
- Apply database migrations: `supabase link`, then `supabase db push`
- Seed demo data: `npm run seed` in `server/`
- Test: `npm test` in `server/`
- Lint: skipped for the pilot (no linter chosen)

## 5. Coding rules

- Keep functions small, with one job each. Use clear names.
- Validate all inputs on the server (zod), including uploads.
- Handle errors properly. Use the one error shape from the TRD (`errorHandler`) and correct HTTP codes.
- No unused code, no dead files, no commented-out code.
- No hardcoded secrets, URLs or magic numbers. Use settings from `.env` (see TRD section 12).

## 6. Security rules

- Secrets live in `server/.env` and `frontend/.env` only. Both must be in `.gitignore` before the first commit.
- Never print, log or commit keys, tokens or passwords.
- Server-only keys (`SUPABASE_SECRET_KEY`, `DATABASE_URL`) never go in frontend code.
  Frontend gets only public `VITE_` values.
- Every new table gets `ENABLE ROW LEVEL SECURITY` with no policies (TRD section 8).
- Closing a ticket is enforced on the server. Never add a route that sets a ticket status directly.

## 7. Working rules

- Work on the current phase only. Do not build ahead.
- Do not add new libraries or change the stack without asking me.
- Do not build anything listed as out of scope in the PRD.
- If the code needs to differ from the TRD, stop and ask me first, then update the TRD.
- Before writing code for a phase, give me a plan and wait for my approval.
- After each phase, tell me what to test manually, and what you skipped or are unsure about.
- If the PRD or TRD is unclear or contradicts itself, do not guess. List your questions and ask me.
- Use simple words. Briefly explain the "why" behind non-obvious choices.
