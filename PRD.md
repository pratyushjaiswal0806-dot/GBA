# PRD: GBA Civic Issue Tracker (Pilot)

| | |
|---|---|
| **Product** | Verified Civic Issue Tracker, a pilot of the GBA "digital governance platform" |
| **Use cases** | Footpath encroachment, potholes / road damage, garbage dumping (one shared flow) |
| **Version** | 0.3 (draft) |
| **Date** | 2 October 2026 |
| **Source** | "GBA Website & Digital Governance Initiative" Minutes of Meeting (MoM). Section numbers below (§) point to that document. |
| **Status** | Draft for review |
| **Implementation status** | Phase 13 complete (deployed). Phases 14 to 19 approved, not started. |

---

## 1. Summary

GBA wants to move from a static website to a **dynamic, interactive digital governance platform** (§1, §21). The MoM says the project should start small, with **one or two prioritized use cases** (§16), and grow step by step.

This pilot is that first use case: a single grievance flow for **three issue types**. **Footpath encroachment** is the main demo. **Potholes / road damage** and **garbage dumping** use exactly the same flow. The flow follows **one issue, from the moment a citizen reports it to the moment it is verified as actually fixed**, and then shows the results to the public.

The three types differ only by their category label. The report, ticket, Action Taken Report and dashboard work the same way for all of them.

The pilot has three main parts:

1. **Citizen report**: photo + short description + automatic location (§3, §8).
2. **Officer ticket and Action Taken Report (ATR)**: the officer fixes the issue, uploads proof, and the ticket closes only after a before/after check (§5).
3. **Public dashboard**: ward-wise counts, categories and resolution numbers (§9).

Two supporting ideas are shown lightly:

- A simple **duplicate check** at report time (§12, moderation).
- A **separate portal** that can be linked from the GBA website (§16, §17).

Everything else in the MoM is shown as **later phases on a roadmap slide**, not built.

**Extension (Phases 14 to 19):** after the pilot was deployed, the scope was widened to cover the backend items in MoM §6 that the pilot left out: an **Admin role** (staff, categories, assignment), **in-app notifications**, **staff analytics with CSV export**, an **audit log**, and, last and optional, **video evidence**. See requirements R38 to R49 and decisions Q15 to Q21.

**Note on scope:** the MoM suggests one or two prioritized use cases (§16). Adding potholes and garbage makes three issue types. This was a deliberate choice because they need no new screens or rules, only a category label. See the risks table (section 12).

---

## 2. Problem

From the MoM:

- The current GBA website is mostly static and does not support interactive public services (§1).
- Normal complaint forms give no proof and no exact location, so officers cannot easily see or verify the issue (§3).
- A key worry raised in the meeting: **complaints get closed as a formality, without the problem actually being solved** (§5).
- Citizens cannot see what is actually happening on the ground (§9).
- When a platform opens to the public, it attracts duplicates, junk uploads and misuse (§12).

---

## 3. Goals and Out of Scope

### Goals

| # | Goal | Where it comes from |
|---|------|---------------------|
| G1 | Turn a plain complaint into a **location-aware, evidence-based** report | §3, §8 |
| G2 | Make sure a ticket **cannot be closed without proof of action** that is checked against the original photo | §5 |
| G3 | Let citizens **see what is happening** through a public dashboard | §9 |
| G4 | Show that basic **moderation** (duplicate check) is possible | §12 |
| G5 | Prove the idea works as a **separate portal** that GBA's site can link to | §16, §17 |
| G6 | Show that the same flow works for **more than one issue type** without extra screens | §13, §16 |

### Out of scope (not in the pilot)

- Voice input, speech-to-text and local-language complaints (§11)
- AI analysis of photos, or vehicle-mounted camera video (§4)
- Field-staff mobile app with attendance and inspections (§7)
- Volunteer registration and volunteer notifications (§2, §10)
- Email, SMS or push notifications (in-app notifications are built, R44 and R45)
- Real GBA data, real officers, real citizens
- Integration with the live GBA website (only a link is shown; technical integration is a later step, §17)
- Categories beyond the three in the pilot, such as pollution, lakes, traffic, hanging wires and basement misuse (listed as future use cases, §4, §13)
- Different departments or officer teams per category (one officer per ward handles all three types)

**Moved into scope in Phases 14 to 19** (no longer out of scope): admin controls (R38 to R43, R48), in-app notifications (R44, R45), staff analytics and CSV export (R46, R47) and, as an optional last step, video evidence (R49).

---

## 4. Users

| User | What they do in the pilot |
|------|---------------------------|
| **Citizen** | Reports an issue (footpath encroachment, potholes / road damage, or garbage dumping) with a photo and a short description. No account needed. Can look up the status of their report. |
| **Ward Officer** | Logs in, sees tickets for their ward (all three issue types), attends to the issue, uploads the Action Taken Report with a photo. |
| **Verifier** (supervisor) | Compares the original photo with the action photo and approves closure, or sends the ticket back. Sees all wards. A separate role, not the citizen (Decision Q1). |
| **Admin** | Manages staff accounts and categories, assigns and reassigns tickets, sees all wards and the staff analytics. **Cannot close tickets and cannot approve or reject Action Taken Reports** (Decision Q15). |
| **Public visitor** | Views the dashboard. No login needed. |

The MoM names role-based access as a backend need (§6). The system keeps it to these roles only.

---

## 5. Main Flow (End to End)

```
Citizen reports  →  Ticket created  →  Assigned to ward officer
      →  Officer attends and uploads ATR + photo
      →  Verifier checks before/after photos side by side
      →  Closed (or Reopened)  →  Counts show up on public dashboard
```

This is the MoM workflow (§5): *Issue Identification → Ticket Creation → Officer Assignment → Action → Action Taken Report → Verification/Closure*.

### Ticket statuses

| Status | Meaning |
|--------|---------|
| Submitted | Report received, but no officer is assigned yet (for example, no active officer for that ward). An admin can assign one, which moves it to Open (Decision Q16) |
| Open | Ticket created and assigned to the ward officer |
| In Progress | Officer has started work |
| Action Taken, Pending Verification | Officer uploaded the ATR; waiting for the check |
| Closed | Verifier confirmed the issue is really fixed |
| Reopened | Verifier rejected the ATR; goes back to the officer |
| Rejected | **Reserved for later. Not used in the pilot.** A duplicate report adds support to the original ticket instead of creating a new one (Decision Q9) |

A ticket can only move to **Closed** from *Action Taken, Pending Verification*. There is no shortcut.

---

## 6. Features and Requirements

Priority: **Must** = needed for the demo. **Should** = adds value, do if time allows. **Could** = nice to have.

### 6.1 Citizen Report (§3, §8)

| ID | Requirement | Priority |
|----|-------------|----------|
| R1 | Citizen can upload **one photo** (JPG/PNG) from camera or gallery | Must |
| R2 | Citizen can add a **short text description** (limit, e.g. 300 characters) | Must |
| R3 | The system captures **location automatically** using the phone or browser location | Must |
| R4 | If location is blocked or fails, citizen can **drop a pin on a map** instead | Must |
| R5 | The location is mapped to **street, area and ward** and shown to the citizen before submitting | Must |
| R6 | Citizen sees a **confirmation** with a ticket ID after submitting | Must |
| R7 | Citizen can **check status** of a ticket using the ticket ID | Should |
| R8 | Citizen **must pick one of three categories** before submitting: *Footpath Encroachment*, *Potholes / Road Damage* or *Garbage Dumping*. The list comes from the database, so more categories can be added later | Must |
| R9 | Basic checks on upload: file type, file size limit, image must not be empty or corrupted | Must |

**Notes**
- Browser location needs a secure (HTTPS) page, so the demo should be hosted with HTTPS.
- For the pilot, ward mapping can use a **small set of sample ward boundaries** (a few wards drawn as map polygons). Real GBA ward boundaries can replace them later.

### 6.2 Duplicate Check (§12)

| ID | Requirement | Priority |
|----|-------------|----------|
| R10 | When a report is submitted, check for an **existing open ticket** in the same category, within a small distance (e.g. 50 m) and recent time window (e.g. 30 days) | Should |
| R11 | If a match is found, show the citizen the existing report and let them choose: **"Same issue, add my support"** or **"This is different, submit anyway"** | Should |
| R12 | Duplicates that are merged still count as **support** on the original ticket (so the dashboard can show how many people reported it) | Could |

The distance and time values are just starting points and can be changed.

### 6.3 Officer Ticket and Action Taken Report (§5, §6)

This is the **main part of the demo**.

| ID | Requirement | Priority |
|----|-------------|----------|
| R13 | New tickets are **auto-assigned to the officer of that ward** | Must |
| R14 | Officers and verifiers **log in** with email and password (Decision Q10) | Must |
| R15 | Officer sees a **list of tickets for their ward only** (role-based access), with status and date | Must |
| R16 | Ticket detail page shows original photo, description, location on a map, ward, and history | Must |
| R17 | Officer can change status to **In Progress** | Must |
| R18 | Officer submits an **Action Taken Report**: short remarks + **at least one action photo** (required) | Must |
| R19 | After the ATR is submitted, status becomes **Action Taken, Pending Verification** | Must |
| R20 | The verification screen shows the **original photo and the action photo side by side**, with location and time for both | Must |
| R21 | Verifier can **Approve** (ticket → Closed) or **Reject with a reason** (ticket → Reopened, officer is told why) | Must |
| R22 | The system **blocks closing** without an ATR photo and a verifier approval. This must be enforced on the server, not just hidden in the screen | Must |
| R23 | Every status change is saved with **who, when and what** (audit trail) | Must |
| R24 | Show a simple **location check**: distance between the original photo location and the action photo location, with a warning if it is far (e.g. over 50 m) | Should |
| R25 | Officer sees a **notification or highlighted badge** for new and reopened tickets | Could |

**Why side by side?** The MoM asked the system to "explore mechanisms for comparing the original evidence with the action-taken evidence" (§5). In the pilot, a **person does the comparison** using the side-by-side screen. Automatic AI comparison is a later phase (§4).

### 6.4 Public Dashboard (§9)

Uses **dummy data** (a seed dataset) plus any tickets created live during the demo.

| ID | Requirement | Priority |
|----|-------------|----------|
| R26 | Public page, **no login** | Must |
| R27 | Summary numbers: total complaints, open, resolved, resolution rate | Must |
| R28 | **Ward-wise complaint counts** (chart or table) | Must |
| R29 | **Category-wise** breakdown across the three categories | Must |
| R30 | **Resolved vs pending** per ward | Must |
| R31 | **Map** showing complaint locations (pins coloured by status) | Should |
| R32 | **Trend over time** (complaints per week or month) | Should |
| R33 | A clear label such as **"Demo data"** so nobody mistakes it for real GBA numbers | Must |
| R34 | Numbers update when a ticket is created or closed during the demo | Should |

**Category note:** The dummy data covers **all three categories**, so the category chart is meaningful. No other categories appear on the dashboard (Decision Q3).

### 6.5 Portal Framing (§16, §17)

| ID | Requirement | Priority |
|----|-------------|----------|
| R35 | Built as a **standalone web portal** with its own address | Must |
| R36 | A mock **"GBA Website → GBA Portal" link** (a simple mock page or screenshot) shows how it would be reached from the GBA site | Should |
| R37 | Works on **mobile browsers** (citizens will mostly report from a phone) | Must |

### 6.6 Roadmap Slide (§4, §7, §11 and others)

Items marked "Not built" are shown as slides only:

| Phase | What is added | MoM section |
|-------|---------------|-------------|
| **Pilot (this PRD)** | Report → ticket → ATR → verified closure → public dashboard, for three issue types | §3, §5, §8, §9, §13 |
| **Backend extension (Phases 14 to 19)** | Admin role, staff and category management, assignment, overdue flag, in-app notifications, staff analytics, CSV export, audit log, optional video evidence (section 6.7) | §3, §6, §9, §10, §12 |
| **Next** | Field-staff mobile app (login, attendance, inspections, photo upload). Not built | §7 |
| **Next** | Volunteer registration and volunteer notifications. Not built. Staff notifications are now in-app (R44, R45); email, SMS and push are not built | §2, §10 |
| **Next** | Voice input, speech-to-text, local languages | §11 |
| **Later** | AI photo analysis to classify issues and compare before/after | §4, §5 |
| **Later** | Vehicle-mounted camera video analysis | §4 |
| **Later** | More use cases (lakes, pollution, traffic, hanging wires, basement misuse) | §4, §13 |
| **Later** | Real GBA data and integration with the GBA website | §17 |

### 6.7 Admin, Notifications, Analytics and Video (Phases 14 to 19) (§3, §6, §9, §10, §12)

Added after the pilot was deployed (Decisions Q15 to Q21).

| ID | Requirement | Priority |
|----|-------------|----------|
| R38 | A new **Admin** role. Admin logs in like other staff, sees all wards, and manages the system. Admin **cannot** approve, reject or close tickets, and cannot submit Action Taken Reports. Enforced on the server | Must |
| R39 | **Staff management:** admin lists staff, creates officers and verifiers (login created through the login service), changes name or ward, and activates or deactivates. Staff are never deleted. Deactivating an officer (or moving them to another ward) who still has unfinished tickets needs a replacement officer from the same ward, who takes over those tickets. An admin cannot deactivate themselves, and the last active admin cannot be deactivated | Must |
| R40 | **Category management:** admin lists, creates, renames and enables or disables categories. A disabled category disappears from the citizen report form, but old tickets keep it and still show on the public dashboard. A category can have an optional SLA in days | Must |
| R41 | **Admin ticket list:** all wards, with filters (ward, category, status, officer, unassigned, overdue, date range), sorting and pages | Must |
| R42 | **Assign and reassign:** admin assigns an unassigned (Submitted) ticket to an active officer of that ward, which moves it to Open. Admin can reassign an Open, In Progress or Reopened ticket to another active officer of the same ward, which does not change the status. Pending Verification and Closed tickets cannot be reassigned. Each change records who, when and why | Must |
| R43 | **Overdue flag:** a ticket is overdue when its due date has passed and it is not Closed. Worked out when the list is read; no background jobs. Shown as a badge and a filter | Should |
| R44 | **In-app notifications are created** for: ticket assigned or reassigned (officer), new ticket in the ward (officer), Action Taken Report submitted (verifiers), ticket reopened (officer), ticket closed (assigned officer), new unassigned ticket (admins) | Should |
| R45 | **Notification inbox:** each staff member sees only their own notifications, with an unread count in the header, and can mark one or all as read. The page checks for new ones at a set interval. No email, SMS or push | Should |
| R46 | **Staff analytics** (separate from the public dashboard): resolution time (average and median) by ward and category, reopen rate, verifier rejection rate, officer workload, overdue count, open tickets by age. Optional ward and date filters. Admin and verifier see all wards; an officer sees only their own ward | Should |
| R47 | **CSV export** of the admin ticket list, with protection against spreadsheet formula injection | Could |
| R48 | **Audit log:** every admin change (staff, categories, assignment) is saved with who, when, what and the before and after values, in the same transaction as the change | Must |
| R49 | **Video evidence (optional, last):** a short video can be added to a report or an Action Taken Report, with limits on type, size and length. A photo is still required | Could |

**Notes**
- Assignment of a Submitted ticket and the overdue flag change how the PRD section 5 flow reads, but closing is unchanged: only a verifier can close, only from Pending Verification.
- R49 reopens Decision Q6 (photo only). It is built last and only if the owner says yes.

---

## 7. Data the System Stores

| Entity | Main fields |
|--------|-------------|
| **Staff** | id, name, role (officer / verifier / admin), ward (for officers), active flag. Email and password login is handled by the login service. Citizens have no account (Decision Q2) |
| **Ward** | id, name, boundary (map polygon) |
| **Category** | id, code, name, reportable flag (shown on the report form), optional SLA days. Three rows to start; admin can add more |
| **Ticket** | id, category, description, latitude, longitude, street, area, ward, status, created time, due date, assigned officer, support count |
| **Media** | id, ticket id, type (original / action), kind (photo / video, video only if R49 is built), file path, capture time, latitude, longitude |
| **Notification** | id, recipient (staff), ticket (optional), type, message, created time, read time |
| **Audit Log** | id, actor (staff), action, entity type, entity id, before and after values, time |
| **Action Taken Report** | id, ticket id, officer, remarks, submitted time |
| **Status History** | ticket id, old status, new status, changed by, time, reason (if rejected) |

---

## 8. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| **Security** | Passwords stored hashed. Officer, verifier and admin screens need login. Role checks done on the server. Uploads are checked for type and size. Every admin change is written to the audit log. (MoM §6 stresses security and role-based access.) |
| **Privacy** | Photos of public places can accidentally show faces or vehicle number plates. Show a short notice at upload. Blurring is a later improvement. If video is built (R49), the notice also says that videos are stored as uploaded and hidden data is not removed. |
| **Performance** | Report submit and page loads should feel quick on a normal mobile connection. Images are compressed on upload. |
| **Accessibility** | Simple wording, large tap targets, readable colours. English only in the pilot, but text is kept separate so other languages can be added later (§11). |
| **Reliability** | Demo must work with a **prepared seed dataset** and a **backup plan** (screen recording) if the network or location fails. |
| **Data safety** | No real personal data. Demo users and dummy officers only. |

---

## 9. Suggested Technical Approach

This was the original high-level idea. **The stack is now decided in `TRD.md`, which is the source of truth.** It follows the MoM's note that web, backend, database, hosting, storage and location services all need study (§18).

| Layer | Suggestion |
|-------|-----------|
| **Front end** | Responsive web app (works on phone and desktop) |
| **Back end** | REST API with login and role checks |
| **Database** | Relational database (tickets, users, history). Point-in-polygon check for ward mapping, using stored ward polygons |
| **File storage** | Local folder or cloud bucket for photos |
| **Maps and geocoding** | A free map library with a reverse-geocoding service to get street and area from coordinates |
| **Charts** | Any standard chart library for the dashboard |
| **Hosting** | Any host with HTTPS (needed for browser location) |

Before choosing tools, follow the MoM's own advice: **evaluate existing applications first** and only build what is missing (§14, §19C).

---

## 10. Demo Script

A suggested walk-through, about 5 to 7 minutes:

1. **Open the mock GBA website** and click the link to the portal (R36).
2. **As a citizen**, open the report page on a phone. Pick the category **Footpath Encroachment** (mention that Potholes / Road Damage and Garbage Dumping are also there). Upload a photo, add a description. Show the location filling in automatically and the street, area and ward appearing (R1 to R6).
3. **Report the same spot again** to show the duplicate check catching it (R10, R11).
4. **Log in as the ward officer.** Show the new ticket in the ward list. Open it, mark it In Progress (R13 to R17).
5. **Submit the Action Taken Report** with an action photo (R18, R19).
6. **Log in as the verifier.** Show the original and action photos side by side. First **reject** one with a reason to show the ticket reopening, then **approve** to close it (R20 to R22).
7. **Open the public dashboard.** Show the counts and charts updating, including the category chart with all three categories (R26 to R34).
8. **Show the roadmap slide** for what comes after the pilot.

The key message to land at step 6: **a ticket cannot be closed until the fix is shown and checked.**

---

## 11. Success Criteria for the Demo

This is a pilot, so success means the idea is proven, not that it has real-world numbers.

| # | Criteria |
|---|----------|
| 1 | The full flow (report → ticket → ATR → verified closure → dashboard) works from start to finish without manual fixes |
| 2 | A ticket **cannot** be closed without an ATR photo and a verifier approval. Tested by trying to skip the steps |
| 3 | Location is captured and mapped to a ward in the report flow, with a manual pin as backup |
| 4 | A duplicate report is caught and offered as "add my support" |
| 5 | The dashboard clearly shows it is demo data and updates with live changes |
| 6 | The demo works on a phone browser |
| 7 | A citizen can report each of the three categories, and each one shows up correctly on the dashboard |

---

## 12. Risks and Assumptions

| Risk or assumption | How to handle it |
|--------------------|------------------|
| Browser location can be blocked or inaccurate indoors | Manual map pin as backup (R4) |
| Ward boundaries are not available in a usable form | Use a few sample boundaries for the pilot |
| The side-by-side check is done by a person, so it can still be careless | Show location and time on both photos, add the distance warning (R24), and record who approved (R23) |
| Stakeholders may expect AI or voice in the demo | Say clearly at the start that these are on the roadmap (§4, §11), and that the MoM says to begin with a manageable pilot (§1, §16) |
| Dummy data may be mistaken for real data | Visible "Demo data" label (R33) |
| Photos may show faces or number plates | Privacy notice now, blurring later |
| **Scope:** three issue types go beyond the MoM's "one or two prioritized use cases" (§16) | All three use the same flow and screens. Only the category label differs. Footpath encroachment stays the main demo. Say this openly if asked |
| **Assumption:** one officer per ward handles all three issue types | Simple for the pilot. In real GBA, roads and garbage may go to different departments (later phase) |

---

## 13. Decisions (Previously Open Questions)

Every open question now has a decision. These are defaults chosen to keep the pilot simple. If you disagree with one, change it here and in `TRD.md`.

| # | Question | Decision | Effect |
|---|----------|----------|--------|
| Q1 | Who does the final verification before closing? | A separate **Verifier** role (supervisor). Not the citizen, and not the Admin (Q15). | Verifier login and screens exist (MoM §5 does not say who, so this is our choice) |
| Q2 | Should a citizen register or log in to report? | **No.** Citizens report anonymously, with spam limits. | No citizen accounts |
| Q3 | Should the dashboard dummy data include other categories? | **No.** The dashboard shows the three real categories only. | Simple category chart |
| Q4 | Sample wards or real boundaries? | **Sample wards** (three, drawn as map polygons). Real boundaries later. | Small data-prep job |
| Q5 | Where does a rejected ATR go? | **Back to the same ward officer** (status Reopened), with the reason. | Simple reopen flow |
| Q6 | Video upload in the pilot? | **Photo only.** Reopened for Phase 17 by Q20. | Smaller uploads, simpler storage |
| Q7 | Which language? | **English only.** Screen text is kept in one place for later languages. | Less text work |
| Q8 | What does *Submitted* mean? | Report received but **no officer assigned yet**. *Open* means assigned. | Matches the TRD |
| Q9 | What about *Rejected / Duplicate*? | *Rejected* is **reserved and unused**. No "mark as invalid" action. Duplicates add support to the original ticket. | Fewer moving parts |
| Q10 | Username or email for login? | **Email and password.** | Matches the login service |
| Q11 | Which issue types, and how many officers? | **Three types** (footpath encroachment, potholes / road damage, garbage dumping). **One officer per ward** handles all three. | Category label only, no new flow |
| Q12 | What if the location is outside the sample wards? | The report is **refused with a clear message.** | No unassigned reports from far away |
| Q15 | Can an Admin close tickets? | **No.** Admin manages staff, categories and assignment only. Only a Verifier approves or rejects. | Keeps the "no closing without a check" rule (R22) |
| Q16 | What happens when an Admin assigns a *Submitted* ticket? | It moves to **Open**. This is the only way a Submitted ticket moves. | One new transition, admin path only |
| Q17 | What does reassignment change? | **Only the assigned officer.** The status stays the same. The new officer must be active and in the ticket's ward. Pending Verification and Closed tickets cannot be reassigned. | Reassignment is not a status change |
| Q18 | How are staff notified? | **In-app only.** The page checks for new ones at an interval. No email, SMS or push. Volunteer notifications stay on the roadmap. | No mail service, no realtime |
| Q19 | How is *overdue* worked out? | **On read:** due date has passed and status is not Closed. Due date is set at creation from the category's SLA days, or a default. No background jobs. | Nothing to schedule or host |
| Q20 | Video upload? | **Optional, last (Phase 17), only if the owner says yes.** Proposed limits: MP4, MOV or WebM; 20 MB; 20 seconds; one video per report and per Action Taken Report; a photo is still required. To be confirmed before Phase 17. Reopens Q6. | Reopens Q6 for video only |
| Q21 | Does this change the PRD §6 note "no notifications or admin panel beyond basics"? | **Yes.** Admin controls and in-app notifications are now built (R38 to R48). | Updates sections 3, 6.6, 6.7 and 14 |
| Q22 | How are category switch-off and staff accounts handled? | A disabled category uses the existing **reportable** flag (no new column). Staff are **never deleted**, only deactivated. Admin creates officers and verifiers only; admin accounts come from the seed or the login service dashboard. | Less data change, no privilege escalation |

---

## 14. Traceability to the MoM

| MoM section | Covered in the pilot? | Where |
|-------------|-----------------------|-------|
| §1 Objective | Yes | Summary, Goals |
| §2 Volunteer registration | No, roadmap (a staff Admin role now exists, but not volunteers) | 6.6 |
| §3 Citizen grievance reporting | Yes (photo, text, location; no voice). Video is optional in Phase 17 (R49) | 6.1, 6.7 |
| §4 AI image and video analysis | No, roadmap (plain video evidence upload is separate, R49) | 6.6 |
| §5 Ticketing and Action Taken Report | Yes, main part | 6.3 |
| §6 Officer login and backend | Yes after Phases 14 to 19 (login, roles, admin role, staff and category management, assignment and reassignment, in-app notifications, audit log, storage, status tracking). Not built: email, SMS or push notifications | 6.3, 6.7, 8 |
| §7 Field-staff mobile app | No, roadmap | 6.6 |
| §8 Location and GPS capture | Yes | 6.1 |
| §9 Analytics and public dashboard | Yes (public dashboard with dummy data, plus staff analytics and CSV export) | 6.4, 6.7 |
| §10 Volunteer notifications | Staff in-app notifications: yes (R44, R45). Volunteer notifications: no, roadmap | 6.6, 6.7 |
| §11 Voice and local language | No, roadmap | 6.6 |
| §12 Moderation and controls | Partly (duplicate check, upload checks, admin controls and audit log) | 6.2, 6.1 R9, 6.7 |
| §13 Problems and use cases | Three issue types chosen (footpath encroachment, potholes / road damage, garbage dumping) | Goals, 6.1, 6.6 |
| §16 Project phasing | Yes, pilot first. Three issue types on one shared flow (slightly beyond "one or two use cases") | Summary, 12 |
| §17 Website integration | Shown as a mock link | 6.5 |
| §18 Technical infrastructure | Basic choices only | 9 |
