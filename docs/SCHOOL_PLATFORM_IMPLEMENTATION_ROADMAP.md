# EduConnect — School Platform Implementation Roadmap

**Companion to:** `PRODUCT_REVIEW_AND_MODERNIZATION_PLAN.md` (the audit).
**Purpose of this document:** the audit says *what is missing and why*; this document says *what to build, in what order, with what data, pages, workflows, and permissions*. It is the master execution blueprint.

---

## How To Read This Document

- The platform is built in **5 phases (0–4)**. Every phase is independently deployable and delivers real operating value to schools — no phase ends with invisible half-features.
- Each phase contains **Work Packages (WP)** numbered `<phase>.<n>`. A work package is a shippable unit: backend + UI + notifications + permissions together.
- Each WP follows the same specification template:
  - **Purpose** — why it exists, what problem it solves
  - **Consumes / Produces** — what information it requires and what it outputs for other modules
  - **Setup Requirements** — what must be configured before it can function
  - **Data Collection** — fields/entities captured
  - **Workflow** — the full lifecycle, end to end
  - **Pages** — every screen required
  - **Reports** — every report it must emit
  - **Notifications** — every alert it must emit
  - **Permissions** — who can View / Create / Edit / Delete / Approve / Export
  - **Depends on** — WPs that must exist first
- **Release mapping:** Phase 0 + Phase 1 = **MVP** · Phase 2 = **Version 1.0** · Phase 3 = **Version 2.0** · Phase 4 = **Enterprise**. Full release definitions are in §7.

### Role Codes (used in every permissions matrix)

| Code | Role | Notes |
|---|---|---|
| SA | School Administrator | Owner-level; full configuration rights |
| PR | Principal | Approvals, oversight, KPIs; not day-to-day data entry |
| BU | Bursar / Finance Officer | All money operations; no academic-structure rights |
| EO | Exam Officer | Results processing, moderation, report card pipeline |
| HOS | Head of Section | Scoped SA-lite over one section (e.g., JSS) |
| CT | Class Teacher (capability) | A teacher flagged as form master of an arm |
| TE | Teacher | Scoped to own subject × arm assignments |
| FD | Front Desk / Records | Student records, admissions, documents; no finance/academics |
| PA | Parent / Guardian | Scoped to own linked children |
| ST | Student | Scoped to self (Phase 3) |
| SYS | System | Automated jobs (invoice generation, reminders, term close) |

Permissions are written as `Action: roles`. "Own" means scoped to the user's own assignments/children/self. All matrices are **defaults** — the RBAC framework (WP 0.2) lets schools adjust them.

### Platform-Wide Conventions (apply to every WP without restating)

1. **Every record carries the canonical key set** `{schoolId, academicYearId, termId, classId, armId, subjectId, studentId}` where applicable (WP 0.1). Names are display-only.
2. **Every list page** has: server-side pagination, search, filters, empty state that names missing prerequisites and links to fix them, and Export (CSV/PDF) gated by the Export permission.
3. **Every destructive or financial action** writes to the Audit Log (WP 0.2) with actor, timestamp, before/after, and reason.
4. **Every state machine** (draft→published, pending→paid, open→closed) is enforced server-side; the UI only renders the allowed transitions.
5. **Every module emits domain events** (e.g., `ATTENDANCE_SUBMITTED`, `PAYMENT_CONFIRMED`) onto the event bus (WP 0.5); notifications are *subscribers*, never inline calls.
6. **Scope bar everywhere:** all operational pages respect the global Year/Term selector (`AcademicContext` + `ScopeBar` already exist — mount them universally).

---

# PHASE 0 — Platform Spine

> **Goal:** make the platform structurally capable of being a school system. Mostly invisible to end users; entirely load-bearing.
> **Deployable value:** existing features stop lying (attendance persists, mocks removed), data becomes durable and joinable, and the first real roles (bursar, principal) can be issued safely.
> **Exit criteria:** all writes go to real endpoints; all academic records are ID-keyed; permissions enforced server-side; Settings hub exists with branding + locale live.

---

## WP 0.1 — Unified Academic Data Model

**Purpose.** Eliminate the dual addressing scheme (name strings in `authAPIs.js` vs ObjectIds in academic APIs). Every downstream deliverable — report cards, promotion, analytics, fee carry-forward — requires that a grade, attendance record, or invoice recorded today can be joined to the academic structure years later. This WP is the foundation of the entire roadmap; nothing in Phase 1 starts before it.

**Consumes:** existing classes, arms, subjects, years, terms (already ID-based); existing students/grades/teacher-assignments (name-based — to be migrated).
**Produces:** a single canonical record contract used by every later WP: `{schoolId, academicYearId, termId, classId, armId, subjectId, studentId, teacherId}`.

**Setup Requirements.** None for schools (transparent migration). For engineering: a migration plan per collection (students, grades, teacher assignments), with a name→ID resolution pass and a quarantine list for unresolvable records.

**Data Collection (schema changes).**
- `Student`: replace `class`/`section` strings with `classId`/`armId`; add `enrollments[]` history `{academicYearId, classId, armId, status, from, to}` (one row per year — this is what makes promotion and historical report cards possible).
- `Grade`: replace `class/section/term/academicYear` strings with IDs; add `gradingSchemeId` (forward-compatible with WP 1.3).
- `TeacherAssignment`: explicit entity `{teacherId, subjectId, classId, armId, academicYearId, termId?}` replacing direct student↔teacher links; teacher's students are *derived* from assignments + arm rosters.

**Workflow.**
```
Inventory name-based records
↓
Build name→ID resolver (class name + arm name + year → IDs)
↓
Dual-write window (new writes carry IDs; legacy fields kept read-only)
↓
Backfill migration with quarantine report for ambiguous records
↓
Admin resolves quarantined records via a one-time migration screen
↓
Cut reads over to ID-based queries
↓
Delete legacy name fields from write paths
```

**Pages.** One internal/admin "Data Migration Review" screen (list of unresolved records, pick-the-right-class fixer). Update `StudentManagement`, `ClassStudents` (grade entry), and attendance APIs to stop fetching all-classes/all-arms for display names — replace the N+1 lookups with populated responses from the server.

**Reports.** Migration completeness report (records migrated / quarantined / resolved).
**Notifications.** None (internal); admin sees a setup-checklist warning while quarantine is non-empty.
**Permissions.** Migration screen: View/Edit SA only.
**Depends on:** nothing. **Blocks:** everything.

---

## WP 0.2 — Roles, Permissions & Audit Log (RBAC)

**Purpose.** Three flat roles cannot represent a school. The bursar currently needs the full admin account to record a payment — meaning the accountant can delete students. RBAC turns "role" into a configuration object and makes every later permissions matrix in this document enforceable rather than aspirational.

**Consumes:** user accounts, invitation system (exists).
**Produces:** role definitions, permission grants, audit trail — consumed by literally every WP.

**Setup Requirements.** Ship with **system role templates** (SA, PR, BU, EO, HOS, CT, TE, FD, PA, ST) pre-seeded; schools never start from a blank matrix.

**Data Collection.**
- `Role`: name, description, isSystem, permission grants.
- `Permission` grant: `{module, action}` where action ∈ {view, create, edit, delete, approve, export} and optional scope ∈ {all, section, own}.
- `UserRole`: user → role(s) + optional scope (e.g., HOS scoped to "Junior Secondary").
- `AuditEntry`: actor, timestamp, module, action, entityRef, before/after snapshot, reason, IP.

**Workflow.**
```
School registers → system roles seeded
↓
SA invites user, selects role at invitation time (extend existing invite flow)
↓
User accepts → role grants resolved on every API call (server-side middleware)
↓
SA edits role / creates custom role in Settings → Roles & Permissions
↓
Sensitive actions require reason → written to Audit Log
↓
SA/PR browse & export audit history
```

**Pages.**
1. Settings → **Roles & Permissions** (role list, matrix editor module × action, member assignment).
2. Settings → **Audit Log** (filterable by user/module/date/action; entry detail drawer with before/after).
3. Invitation modal upgrade: role picker (replaces hardcoded teacher/parent invite split).
4. `ProtectedRoute` upgrade: permission-aware (`requiredPermission="fees.view"`), not just role string; sidebar items render by permission.

**Reports.** Audit export (date range, module); "who can do what" matrix export; dormant-accounts list.
**Notifications.** New role assigned (to the user); high-sensitivity audit alerts to SA (e.g., role matrix changed, bulk delete performed).
**Permissions.** Roles — View: SA, PR · Create/Edit/Delete: SA · Assign: SA. Audit — View: SA, PR (BU sees finance module entries) · Export: SA, PR. (Roles/audit permissions themselves are *not* school-editable.)
**Depends on:** nothing. **Blocks:** WP 0.3, all Phase 1+ permission enforcement.

---

## WP 0.3 — Settings Hub, School Identity & Locale

**Purpose.** Create the configuration surface the audit found entirely absent. The hub ships in Phase 0 with two live sections (Identity, Locale) and an extensible frame; every later WP installs its settings panel here instead of inventing one-off pages.

**Consumes:** school profile (exists). **Produces:** branding assets and locale rules consumed by receipts (WP 1.7), report cards (WP 1.5), exports, notifications, and all money/date formatting.

**Setup Requirements.** File storage infrastructure for the logo (first upload capability in the product — deliberately built here so WP 2.11 Documents inherits it).

**Data Collection.**
- Identity: logo/crest, school motto, brand color, official letterhead text, head-of-school name & signature image (used on report cards/receipts).
- Locale: currency (replaces hardcoded NGN/kobo helpers), timezone, date format, first day of week, academic locale defaults.
- Contact/legal: registration number, email/SMS sender names.

**Workflow.**
```
SA opens Settings hub (new sidebar root item)
↓
Completes Identity (logo upload → stored → propagates to receipts/report headers)
↓
Sets Locale (currency/timezone) → all formatters read school config, not constants
↓
Each later WP registers its panel (Academic, Attendance, Fees, Communication, Notifications, Roles, Data)
```

**Pages.** Settings hub shell (left-nav sections); Identity panel; Locale panel. Refactor: `formatNaira`/`toKobo` → `formatMoney(school)` reading school currency; date renderers read school timezone/format.
**Reports.** Settings change history (via Audit Log).
**Notifications.** None.
**Permissions.** View: SA, PR · Edit: SA · (later panels declare their own — e.g., Fees panel editable by BU).
**Depends on:** WP 0.2 (permission gating). **Blocks:** every later "Settings → …" panel.

---

## WP 0.4 — Attendance Persistence Backend

**Purpose.** The teacher attendance UI is complete but writes to a `console.log` stub — registers vanish. This WP makes the existing flow real. (Policy configuration, admin dashboards, and parent alerts are Phase 1, WP 1.8 — this WP is strictly "stop losing data.")

**Consumes:** published timetable (exists, live), arm rosters, teacher assignments.
**Produces:** persistent `AttendanceRecord`s — the raw material for WP 1.8 (operations), WP 1.5 (report card attendance summary), WP 1.9 (student profile).

**Setup Requirements.** Published timetable for the term (already enforced by the Today's Classes board).

**Data Collection.** `AttendanceSession` `{schoolId, academicYearId, termId, classId, armId, subjectId, periodId, teacherId, date, status: draft|submitted, submittedAt}` + `AttendanceEntry[]` `{studentId, status: present|absent|late, reason, lateArrivalTime}` + edit history `{editedBy, editedAt, reason}`.

**Workflow.**
```
Teacher opens Today's Classes (existing)
↓
Opens register → entries load (or resume saved draft from server, not memory)
↓
Marks statuses → Save Draft (persists server-side)
↓
Submit → session locked, summary computed server-side
↓
Edit-after-submit → allowed within configurable window (hardcode 24h until WP 1.8) → audit entry
↓
ATTENDANCE_SUBMITTED event emitted (consumed by Phase 1 notifications)
```

**Pages.** No new pages — replace stubs in `attendanceAPIs.js` (`saveDraftAttendance`, `submitAttendance`, `updateAttendance`) with real calls; delete `PERIOD_SLOTS` synthetic fallback and the `TIMETABLE_BACKEND_LIVE` flag branch; surface server errors honestly (no fake success).
**Reports.** None yet (Phase 1.8). **Notifications.** None yet (event emitted, no subscribers).
**Permissions.** Create/Edit: TE (own sessions) · View: TE own, SA/PR all · Delete: nobody (void with reason: SA) · Export: SA, PR.
**Depends on:** WP 0.1 (ID-keyed records). **Blocks:** WP 1.5, 1.8, 1.9.

---

## WP 0.5 — Production Hygiene: Mock Removal, Feature Flags, Event Bus, Pagination

**Purpose.** Remove the credibility leaks the audit flagged: mock stores inside production API clients, `localStorage` as a source of truth, `window.authContext`, and all-records-then-filter-client-side data loading.

**Workflow / scope (checklist-style — this WP is engineering debt, not a feature):**
1. Extract the mock layer from `feeAPIs.js` (≈600 of 1,001 lines) into dev-only fixtures (MSW or equivalent); delete `FEE_BACKEND_LIVE` branching from production code.
2. Replace `localStorage` graded-status in `ClassStudents.jsx` with server-derived state (grade records exist → student is graded).
3. Replace `window.authContext` bridge with a proper axios interceptor wired through module scope.
4. Introduce a **server-driven feature flag config** (`GET /api/platform/features`): any module whose backend is not live is hidden or labeled "Coming soon" — never silently fake-succeeding.
5. Stand up the **domain event bus** (backend): standard envelope `{event, schoolId, entityRef, actorId, payload, occurredAt}`; fees module's documented `FEE_EVENTS` become the first emitters; attendance (WP 0.4) second.
6. Convert `StudentManagement`, invoices, payments lists to **server-side pagination/filter/search** (contract already supports it for students).

**Pages.** None new. **Reports.** None. **Notifications.** None.
**Permissions.** Feature flag config: platform-internal (not school-editable).
**Depends on:** none. **Blocks:** WP 1.10 (event bus), all scalability claims.

---

# PHASE 1 — Run a Term (MVP)

> **Goal:** a school can operate one full term end-to-end: set up → enroll → teach → attend → assess → bill & collect → produce report cards → close the term.
> **Deployable value:** the two artifacts schools buy software for — **reliable fee collection** and **report cards** — work end to end, plus the operational glue (onboarding, imports, notifications) that makes them usable.
> **Exit criteria:** a pilot school completes a real term with no spreadsheet side-channel for attendance, results, or fees.

---

## WP 1.1 — Setup Checklist & Onboarding Tracker

**Purpose.** After registration an admin currently lands on an invitation-metrics dashboard with no guidance; features fail silently when prerequisites are missing. The checklist makes the platform's dependency graph visible and walkable — the single biggest "feels professional" lever per the audit.

**Consumes:** completion state of every other module's setup. **Produces:** a school-level `setupState` consumed by the dashboard, empty states, and feature gates.

**Setup Requirements.** None — it *is* the setup surface.

**Data Collection.** Per-school checklist state: step → {not_started, in_progress, complete, skipped}, computed from real data (e.g., "Classes" is complete when ≥1 class with ≥1 arm exists — never a manual checkbox).

**Workflow.**
```
School registers
↓
First login → Welcome screen + checklist (replaces empty dashboard)
   ① Academic year & terms → ② School structure (sections, classes, arms)
   → ③ Subjects (+ per-arm assignment) → ④ Staff invited → ⑤ Students & parents
   (import or manual) → ⑥ Periods & timetable → ⑦ Grading scheme
   → ⑧ Fee structures → ⑨ Gateway connected → ⑩ Publish & go live
↓
Each step: status chip + "what this unlocks" + deep link
↓
Dependent features check setupState → contextual empty states
   ("No fee structures can be created — you haven't created classes yet. [Set up classes]")
↓
Checklist collapses to a dismissible progress widget once ≥80% complete
```

**Pages.** Onboarding checklist page (admin home until complete); empty-state component library (prerequisite-aware, reused by every module); "what's blocked and why" panel.
**Reports.** Setup completeness (also visible to platform operators for support).
**Notifications.** Nudge after N days of incomplete setup (email, configurable off).
**Permissions.** View: SA, PR · Act: SA (each step's own permissions apply).
**Depends on:** WP 0.3. **Blocks:** nothing technically; everything experientially.

---

## WP 1.2 — Bulk Data Import (CSV)

**Purpose.** Schools migrate with spreadsheets. Without import, onboarding a 600-student school means 600 modal forms — the #1 adoption killer. Import is also how sibling links and parent contacts arrive in bulk.

**Consumes:** classes/arms (rows reference them), CSV files. **Produces:** student, parent, staff records; parent↔student links.

**Setup Requirements.** Classes & arms created (rows are rejected otherwise — with a friendly "create these classes first" preflight); roles seeded (staff import assigns roles).

**Data Collection.** Import templates (downloadable): Students (name, DOB, gender, class, arm, admission no., parent email/phone, address…), Parents/Guardians (with relationship + linked student admission no.), Staff (role, subjects). Import job record: file, mapping, row results, committed-by.

**Workflow.**
```
SA downloads template → fills → uploads
↓
Column mapping screen (auto-detected, adjustable)
↓
Validation pass → preview: N valid / M errors (row-level messages: "row 41: class 'JS1' not found — did you mean JSS1?")
↓
Fix-in-place or re-upload → Commit valid rows (partial commit allowed, errors exported)
↓
Students created with enrollments; parents created/matched by email/phone; links established
↓
Optional: queue invitation emails to imported parents/staff (explicit toggle, not automatic)
```

**Pages.** Settings → Data → Import (wizard: upload → map → validate → preview → commit → results); import history list with per-job results download.
**Reports.** Import results (per job); duplicate-detection report (matched existing records).
**Notifications.** Import completed (to initiator); invitations sent summary.
**Permissions.** Create (run import): SA, FD · View history: SA, PR, FD · Export results: SA, FD.
**Depends on:** WP 0.1, classes/arms setup. **Blocks:** realistic pilot onboarding.

---

## WP 1.3 — Grading Scheme Configuration

**Purpose.** Today every teacher invents assessment components and weights per student; two teachers in one school grade incompatibly, making report cards mathematically impossible. The grading scheme is **admin configuration that constrains teacher entry** — the canonical example of the audit's "configurability over features" philosophy.

**Consumes:** sections/classes (schemes are scoped per section: Primary vs JSS vs SSS differ). **Produces:** the computation contract used by grade entry (WP 1.4), broadsheets, and report cards (WP 1.5).

**Setup Requirements.** Academic structure complete; Settings hub.

**Data Collection.**
- `GradingScheme` `{name, scope: school|section|classIds[], academicYearId}`.
- Components: ordered list `{name (CA1, Assignment, Exam…), maxScore, weight%}` — weights must total 100.
- Grade boundaries: `{symbol A–F (school-defined), minTotal, maxTotal, remark ("Excellent"), passes: bool}`.
- Policy flags: show class position? show class average? rounding rule; pass mark.

**Workflow.**
```
SA/EO creates scheme (template offered: CA1 10 / CA2 10 / Assignment 10 / Exam 70, A–F)
↓
Scopes it (whole school or per section) → activates for year/term
↓
Scheme locks once any grades reference it (edits require new version; old grades keep theirs)
↓
Grade entry UI (WP 1.4) renders exactly these components — no free-form assessments
↓
Totals, grades, remarks, positions computed server-side from the scheme
```

**Pages.** Settings → Academic → Grading Schemes (list, builder with live preview of a sample report row, version history).
**Reports.** Scheme definition export (schools print this for staff handbooks).
**Notifications.** Scheme activated/changed → all teachers.
**Permissions.** View: SA, PR, EO, HOS, TE · Create/Edit: SA, EO · Approve activation: PR (configurable) · Delete: SA (only if unused).
**Depends on:** WP 0.1, 0.3. **Blocks:** WP 1.4, 1.5.

---

## WP 1.4 — Grade Entry, Broadsheet & Moderation

**Purpose.** Replace the per-student modal + free-form assessments with scheme-constrained, class-at-once entry, plus the moderation pipeline (entry → review → approval → publish) that real exam offices run. The broadsheet (students × subjects grid) is *the* artifact of Nigerian results processing.

**Consumes:** grading scheme (1.3), teacher assignments, arm rosters. **Produces:** approved, locked grade records → report cards (1.5), student profile (1.9), analytics.

**Setup Requirements.** Active grading scheme; subjects assigned to arms; students assigned to arms; current term set.

**Data Collection.** `GradeRecord` `{canonical keys, gradingSchemeId, componentScores{}, computedTotal, computedGrade, position, teacherRemark, status: draft|submitted|approved|published|locked}`; moderation actions with actor + comment.

**Workflow.**
```
EO opens grade-entry window for the term (start/deadline dates)
↓
Teacher opens "Enter Scores" for subject × arm → spreadsheet-style grid
   (rows = students, columns = scheme components; keyboard-first; CSV score import)
↓
Validation: score ≤ component max; missing scores flagged
↓
Teacher submits subject × arm sheet → status: submitted (locked for teacher)
↓
EO/HOS monitor: submission matrix (subject × arm grid: pending/submitted/approved)
↓
Moderation: EO reviews distribution, queries outliers → return-to-teacher (with comment) or approve
↓
PR final sign-off (configurable) → grades locked
↓
GRADES_APPROVED event → feeds report card generation (1.5)
```

**Pages.**
1. Teacher: score-entry grid per subject × arm (replaces per-student modal); my-submissions status list.
2. EO/admin: **Grade Entry Monitor** (submission matrix + chase list); moderation review screen (distribution chart, per-student drill-in).
3. **Class Broadsheet** (all students × all subjects, totals, averages, positions; print/export).
**Reports.** Broadsheet per arm; subject performance (mean, distribution, pass rate, top/bottom); teacher submission compliance; grade-change audit.
**Notifications.** Entry window opened / deadline T-3 days / overdue (→ TE); sheet returned with comments (→ TE); all sheets approved (→ EO, PR).
**Permissions.** Create/Edit scores: TE (own subject × arm, while draft) · Submit: TE · Return/Approve: EO, HOS · Final approve: PR · View broadsheet: SA, PR, EO, HOS, CT (own arm) · Export: SA, PR, EO · Delete: nobody (void w/ reason: EO + audit).
**Depends on:** WP 1.3, 0.1, 0.2. **Blocks:** WP 1.5.

---

## WP 1.5 — Report Cards

**Purpose.** The product's most consequential absence (audit score 0/10) and the contractual deliverable of a school term in this market. Everything in Phases 0–1 exists so this WP can work.

**Consumes:** approved grades (1.4), grading scheme (1.3), attendance summaries (0.4/1.8), school identity (0.3), traits & comments (below), academic calendar (next-term date). **Produces:** published report card records + PDFs → parent portal, student profile, documents archive.

**Setup Requirements.** Grading scheme active; grades approved for the arm; attendance data for the term; report card template configured; school logo/signature uploaded.

**Data Collection.**
- `ReportCardTemplate` (per section): which blocks appear — scores table, grade/remark, position, class average, attendance summary, affective traits, psychomotor traits, class-teacher comment, principal comment, next-term date, fees-due note (school's choice), branding header.
- `TraitDefinition[]` (admin-defined: punctuality, neatness, leadership…; rating scale).
- Per-student term data: trait ratings (CT enters), CT comment (free + comment bank), PR comment.
- `ReportCard` record: snapshot of all computed data at generation time (immutable once published).

**Workflow.**
```
SA/EO configures template per section (one-time, editable between terms)
↓
Term-end: EO triggers generation for arm(s) → prerequisite check
   (grades approved? attendance present? traits/comments entered?) → gap list
↓
CT enters trait ratings + comments per student (worklist UI)
↓
Generate → compute snapshot (scores, totals, position, attendance %, comments)
↓
CT review pass → PR sign-off (batch approve with spot-check view)
↓
Publish → parents notified; report visible in parent portal; PDF archived
↓
Optional school policy: withhold release per student until fees cleared (configurable, default OFF)
↓
Lock — corrections post-publish require PR-approved regeneration (audited, v2 supersedes)
```

**Pages.** Settings → Academic → Report Card Template (builder + live preview); CT comments & traits worklist; generation console (per arm: prerequisites, progress, gaps); PR approval queue; parent-facing report card view + PDF download; batch print view (whole arm sequentially, for paper distribution).
**Reports.** Generation status per arm; withheld-reports list (with reason); historical archive per student (feeds 1.9).
**Notifications.** Comments/traits missing (→ CT, before deadline); reports awaiting sign-off (→ PR); **report card published (→ PA)**; regeneration occurred (→ EO, PR).
**Permissions.** Template: Edit SA, EO · Traits/comments: CT (own arm) · Generate: EO · Approve: PR · Publish: EO after PR approval · View: PA (own child, published only), SA/PR/EO all, CT own arm · Export/Print: SA, EO, CT (own arm) · Withhold toggle: SA policy + BU per-student flag.
**Depends on:** WP 1.3, 1.4, 0.3, 0.4; enhanced by 1.8 (attendance %) and 1.7 (fees-due note). **Blocks:** the MVP release definition.

---

## WP 1.6 — Term Lifecycle: Close, Carry-Forward, Rollover & Promotion

**Purpose.** Give the platform its heartbeat. Today years/terms are passive labels — nothing opens, closes, locks, or carries forward, so every term starts with amnesia (especially unpaid fees) and every September means manual re-setup.

**Consumes:** everything term-scoped (attendance, grades, invoices, timetables). **Produces:** locked historical snapshots, opening balances, next-year structure, promotion records.

**Setup Requirements.** Promotion mapping on classes (JSS1 → JSS2 — added to class setup); term dates accurate; (for close) grades published and fees reconciled or explicitly acknowledged.

**Data Collection.** Class `promotesToClassId`; `TermCloseRecord` (who, when, checklist results, exceptions acknowledged); `PromotionDecision` per student `{promote | repeat | transfer | graduate, decidedBy, reason}`; carried-forward balance line items.

**Workflow — Term Close.**
```
SA/PR opens Term Close wizard
↓
Readiness checklist: attendance sessions complete? grades published?
   report cards released? unpaid invoices listed?
↓
Exceptions acknowledged explicitly (logged)
↓
Close → attendance & grades locked read-only; outstanding invoice balances
   flagged for carry-forward; TERM_CLOSED event
↓
Next term activated (or year-end path below)
```
**Workflow — Year Rollover & Promotion.**
```
Year-end close (after final term)
↓
Rollover wizard: clone structure (classes/arms/subjects/period config) into new year
↓
Promotion board: per arm, default = promote per mapping;
   CT/HOS mark exceptions (repeat/transfer/graduate) with reasons
↓
PR approves promotion sheet
↓
Execute: new enrollments created for new year; SS3/Primary-6 → graduated (alumni state)
↓
Fee carry-forward: unpaid balances become opening-balance line on first new invoice (WP 1.7)
↓
New year set current; old year switchable read-only via ScopeBar
```

**Pages.** Term Close wizard; Year Rollover wizard; Promotion board (per arm grid with decision toggles + bulk actions); historical (read-only) mode banner when ScopeBar is on a closed term.
**Reports.** Term close summary; promotion outcome report (promoted/repeated/graduated counts per class); carry-forward balance schedule.
**Notifications.** Term close completed (→ SA, PR, BU, EO); promotion executed → PA ("Ada has been promoted to JSS2"); carry-forward applied (→ BU).
**Permissions.** Run close/rollover: SA · Approve promotion: PR · Mark exceptions: CT (own arm), HOS · View: SA, PR, HOS · Nothing is deletable; close reversal is a platform-support operation only.
**Depends on:** WP 0.1, 1.4, 1.5, 1.7. **Blocks:** any school's *second* term on the platform.

---

## WP 1.7 — Payment Gateway & Bank Configuration + Real Online Payments

**Purpose.** The parent "Pay with Paystack" sheet is theatre — no school can connect an account. This WP closes the loop from the well-designed fee contract (`feeImplementation.md`, initialize/verify already specified) to money actually arriving, with receipts issued automatically.

**Consumes:** published fee structures & invoices (exist); school identity (0.3). **Produces:** confirmed payments, receipts, ledger entries, `PAYMENT_CONFIRMED` events → dashboards, notifications, defaulter logic (2.4).

**Setup Requirements.** Settings → Fees → Payments panel completed: gateway (Paystack/Flutterwave) keys connected + webhook verified; settlement bank account(s); charge-bearer policy (school absorbs vs parent pays fee); enabled manual methods; receipt numbering format.

**Data Collection.** `GatewayConfig` (provider, keys [encrypted], webhook secret, status: connected/error); `BankAccount[]`; `Payment` extended with gateway refs `{provider, reference, channel, verifiedAt}`; `Receipt` `{number (school format), pdfRef, sentTo, sentAt}`.

**Workflow.**
```
SA/BU connects gateway in Settings (test transaction validates keys + webhook)
↓
Parent opens Fees → invoice → Pay Now → amount (full / installment per plan)
↓
POST initialize → gateway checkout (card/transfer/USSD)
↓
Gateway webhook + client verify → POST verify → Payment confirmed (idempotent)
↓
Ledger credited → invoice status recomputed (partial/paid)
↓
Receipt auto-generated (school branding) → emailed/in-app to parent
↓
PAYMENT_CONFIRMED event → parent + bursar notifications, dashboard counters
↓
Manual payments (cash/transfer/POS/cheque): BU records via existing modal
   → same ledger/receipt path; BU "verify" step for claimed bank transfers
↓
Failures: PAYMENT_FAILED → parent sees actionable error; BU sees failed-payments list
```

**Pages.** Settings → Fees → Payment Setup (gateway connect, banks, charge policy, receipt format); parent payment flow rebuilt on real initialize/verify (replace mock `GATEWAYS` UI); BU verification queue (unconfirmed transfers); receipt view/print (exists — wire to real data + branding); reconciliation screen (gateway settlements vs ledger — endpoint contract exists).
**Reports.** Daily cash report (today's takings by method — the bursar's end-of-day artifact); gateway settlement vs ledger reconciliation; failed/abandoned payments.
**Notifications.** Payment received (→ PA receipt, → BU); payment failed (→ PA); gateway disconnected/webhook failing (→ SA, BU); large payment threshold alert (→ PR, configurable).
**Permissions.** Gateway/bank config: SA, BU (View: PR) · Record manual payment: BU, FD (configurable) · Verify transfers: BU · Void payment: BU + PR approval · View ledger: BU, SA, PR; PA own family · Export: BU, SA, PR.
**Depends on:** WP 0.3, 0.5 (mock removal); fee structures (exist). **Blocks:** WP 1.6 carry-forward, 2.3–2.5, MVP.

---

## WP 1.8 — Attendance Operations: Policy, Admin Dashboard & Parent Alerts

**Purpose.** WP 0.4 made attendance persist; this WP makes it *useful*: school-defined policy, the principal's "who hasn't marked attendance" view, and the single highest-value notification in any school product — the parent absence alert.

**Consumes:** attendance records (0.4), timetable, calendar/events (school-closed days). **Produces:** attendance rates & summaries → report cards (1.5), student profile (1.9), principal dashboard (2.6).

**Setup Requirements.** Settings → Attendance panel: mode (per-period vs once-daily form-teacher attendance — most Nigerian schools use the latter; the school chooses), grace minutes for "late", custom statuses (excused, medical, suspended…), edit-window hours, alert thresholds (e.g., flag < 80%), parent-alert toggle + timing.

**Data Collection.** `AttendancePolicy` (above); extended status set on entries; `ExcuseRequest` `{studentId, dates, reason, attachmentRef?, status: pending|approved|rejected, decidedBy}`.

**Workflow — daily operations.**
```
Policy defines who marks: subject teacher per period OR class teacher once daily
↓
Registers submitted (0.4 flow)
↓
ATTENDANCE_SUBMITTED → absence alert to parent of each absent student
   ("Ada was marked absent at 8:15", channel per parent preference)
↓
Mid-morning: unmarked-register reminder → teachers; escalation list → SA/PR
↓
Parent submits excuse (reason + optional document) → CT or SA approves
   → status flips to excused (audited)
↓
Calendar holidays/closures auto-skip expected sessions
```

**Pages.** Settings → Attendance (policy); **Admin Attendance Dashboard** (today's school-wide %, per-class grid, unmarked registers list, absent-today roster); student attendance history view (powers 1.9 tab); parent child-attendance view (calendar heat strip + summary); excuse request flow (parent submit, CT/SA approve queue).
**Reports.** Daily absence list; chronic absentee report (threshold from policy); lateness report; per-student term summary (% — consumed by report cards); class comparison; attendance-marking compliance by teacher.
**Notifications.** **Absence alert → PA**; unmarked register → TE then SA/PR; chronic-absence digest (weekly → SA, PR, CT); excuse decision → PA.
**Permissions.** Policy: SA · Mark: TE/CT per policy · Edit submitted: TE within window, then SA with reason · Approve excuses: CT (own arm), SA · View dashboard: SA, PR, HOS · View child: PA · Export: SA, PR.
**Depends on:** WP 0.4, 1.10 (delivery), 0.3. **Blocks:** report card attendance block (1.5), principal dashboard (2.6).

---

## WP 1.9 — Student 360° Profile

**Purpose.** The single biggest missing page in the product (audit §3.3). Today a student is a disconnected row in four modules; this page is what makes the platform feel like an ecosystem — and it's mostly *assembly* of data that Phases 0–1 already produce.

**Consumes:** bio + guardians (exist), enrollments (0.1), attendance (0.4/1.8), grades & report cards (1.4/1.5), fee ledger (exists — `getStudentLedger` already implemented), timeline events. **Produces:** the canonical "open the student" destination linked from every roster, register, invoice, and search result platform-wide.

**Setup Requirements.** None beyond its sources; degrades gracefully (tabs show prerequisite-aware empty states).

**Data Collection (extends Student — the audit's missing fields).** Admission number (auto-generated per school format — add format to Settings → Academic), admission date, passport photo, nationality/state of origin, religion (optional per school), blood group/genotype, allergies/medical notes, emergency contacts, previous school. `TimelineNote` `{authorId, visibility: staff|admin-only, text, pinned}`.

**Workflow.**
```
Any student name anywhere → profile
↓
Header: photo, admission no., class/arm, status, guardians, quick actions
↓
Tabs: Overview · Attendance (term strip + history) · Results (per term,
   published report cards) · Fees (ledger, balance, receipts) · Documents
   (placeholder until 2.11) · Timeline (enrollment events, promotions,
   incidents [2.13], staff notes)
↓
Edit bio (permission-gated) → audited
↓
Lifecycle actions surface here: change arm, mark withdrawn, etc. (full state machine in 2.9)
```

**Pages.** The profile page (tabbed); admission-number format panel (Settings → Academic); photo upload (uses 0.3 storage).
**Reports.** Printable student summary sheet (bio + current term snapshot — schools use this for files/transfers).
**Notifications.** None of its own (it surfaces others').
**Permissions.** View: SA, PR, FD full; CT own arm; TE own students (bio + academics only, no fees by default); BU fees tab; PA own child (no staff notes) · Edit bio: SA, FD · Notes: any staff (visibility-scoped) · Export: SA, FD.
**Depends on:** WP 0.1; tabs light up as 0.4, 1.4, 1.5 land. **Blocks:** nothing, but multiplies the perceived value of everything.

---

## WP 1.10 — Notification Engine & Notification Center

**Purpose.** Generalize the event-notification engine currently trapped inside Events Planner (targets/scheduling/logs already work there) into the platform service every WP above references. Without it, each module would grow its own ad-hoc alerts — the exact "disconnected features" disease the audit diagnosed.

**Consumes:** domain events (0.5 bus). **Produces:** delivered notifications (in-app + email now; SMS/WhatsApp channel slots filled in 2.2; push in 2.14).

**Setup Requirements.** Settings → Notifications: per-event-type toggle + default channel + audience template; per-user preferences (channel, instant vs daily digest, quiet hours). Sender identity from 0.3.

**Data Collection.** `NotificationRule` `{eventType, enabled, channels[], audienceTemplate, templateId}`; `NotificationTemplate` (subject/body with variables: {{student.firstName}}, {{invoice.balance}}…, admin-editable, per-language later); `Delivery` `{userId, channel, status: queued|sent|delivered|failed|read, readAt}`; `UserNotificationPrefs`.

**Workflow.**
```
Module emits event → engine matches rules → resolves audience
   (roles/relationships: "parents of student X", "teachers of arm Y")
↓
Renders template per recipient → respects user prefs (channel, digest, quiet hours)
↓
Queues → delivers → logs status (retry on transient failure)
↓
In-app: bell icon + unread badge on every layout (admin/teacher/parent)
↓
User opens Notification Center → list, filters, mark-read, deep links
↓
SA reviews delivery logs (reuse Events Planner log UI, generalized)
```

**Launch catalog (rules shipped enabled):** absence alert (1.8) · payment received / failed (1.7) · invoice issued / due-in-N / overdue (1.7, 2.4) · results published (1.5) · report card published (1.5) · timetable published (exists → emit event) · announcement (2.1) · invitation accepted · grade-entry deadline (1.4) · term closed (1.6).

**Pages.** Notification Center (all roles); Settings → Notifications (rules + templates editor with variable picker + test-send); user preference panel (in each role's profile page); delivery log explorer.
**Reports.** Delivery success/failure by channel; unread/engagement rates; per-event volume (cost forecasting for paid channels).
**Notifications.** (meta) channel failing persistently → SA.
**Permissions.** Rules/templates: SA · View logs: SA, PR · Per-user prefs: each user, self · Manual broadcast lives in 2.1, not here.
**Depends on:** WP 0.5, 0.3. **Blocks:** the notification lists of every other WP.

---

# PHASE 2 — Professional Operations (Version 1.0)

> **Goal:** from "can run a term" to "runs the school better than the paper system": communication, money policy & recovery, role-grade dashboards, complete student lifecycle, documents, discipline, and a hardened mobile experience.
> **Deployable value:** the school's daily operators (bursar, principal, class teachers, front desk) each get their own working surface; parents get a reason to open the app weekly.
> **Exit criteria:** ready for paid multi-school onboarding (see §7 V1.0 definition).

---

## WP 2.1 — Announcements & Circulars

**Purpose.** The school's broadcast voice — highest-value, lowest-complexity communication feature; reuses the event-notification targeting engine wholesale.

**Consumes:** audience structures (roles, sections, classes, arms), notification engine (1.10). **Produces:** announcement feed items + deliveries; read receipts.

**Setup Requirements.** Notification engine live; sender identity configured.

**Data Collection.** `Announcement` `{title, body (rich text), attachments?, audience (everyone | roles | sections | classes | arms | individuals), channels, publishAt (now/scheduled), expiresAt?, requiresAcknowledgement?, status: draft|scheduled|published|archived}`.

**Workflow.**
```
SA/PR composes → selects audience (same picker as event notifications) → preview recipient count
↓
Publish now or schedule
↓
Engine delivers (in-app + email; SMS/WhatsApp once 2.2 lands)
↓
Recipients see feed item + notification; optional "Acknowledge" button
↓
Author tracks delivery + read/ack rates → resend-to-unread option
↓
Expiry/archive removes from active feeds (history retained)
```

**Pages.** Announcements manager (list, composer, audience picker, schedule); announcement feed (parent/teacher dashboards + dedicated page); read/ack tracking detail.
**Reports.** Reach & read-rate per announcement; acknowledgement compliance list (who hasn't confirmed).
**Notifications.** New announcement (→ audience); scheduled-publish confirmation (→ author).
**Permissions.** Create/Edit drafts: SA, PR, HOS (section-scoped) · Publish school-wide: SA, PR · Publish section: HOS · Delete/Archive: SA · View: audience · Export read report: SA, PR.
**Depends on:** WP 1.10.

---

## WP 2.2 — Communication Channels & Message Templates (Email/SMS/WhatsApp)

**Purpose.** Email open rates among Nigerian parents are poor; SMS/WhatsApp are the channels that actually get read. This WP adds configurable paid channels with cost awareness, and makes every system message template admin-editable.

**Consumes:** notification engine deliveries (1.10). **Produces:** multi-channel delivery capability used by all notification rules and announcements.

**Setup Requirements.** Settings → Communication: SMS provider (e.g., Termii/Twilio) keys + sender ID; WhatsApp Business API config; per-channel enablement per event type; monthly budget cap / low-balance alert.

**Data Collection.** `ChannelConfig` per provider (keys encrypted, sender identity, status); per-message cost log; template variants per channel (SMS = short form).

**Workflow.**
```
SA connects SMS/WhatsApp provider → test message validates
↓
Engine routes per rule + user preference + channel availability
   (fallback chain: WhatsApp → SMS → email, configurable)
↓
Cost logged per send → budget tracking → cap pauses non-critical sends
   (absence alerts and payment receipts marked critical, never paused silently — SA alerted)
```

**Pages.** Settings → Communication (providers, sender IDs, fallback chain, budget); template editor gains per-channel variants; channel cost dashboard.
**Reports.** Spend by channel/event-type/month; delivery rates by channel.
**Notifications.** Low balance / budget threshold (→ SA, BU); provider failing (→ SA).
**Permissions.** Config: SA · View costs: SA, PR, BU · Templates: SA.
**Depends on:** WP 1.10.

---

## WP 2.3 — Fee Policy Layer: Categories, Late Fees, Discounts & Scholarships

**Purpose.** Move fee logic from hardcoded constants and manual one-off adjustments to school-defined policy — the audit's core criticism of the fees module. Scholarships become managed programs, not adjustment labels.

**Consumes:** fee structures/invoices/ledger (exist + 1.7). **Produces:** auto-applied policy adjustments; category registry consumed by structures; scholarship rosters.

**Setup Requirements.** Settings → Fees panels (below); fee structures migrate from `FEE_TYPES` constant to the category registry (migration maps the 9 hardcoded types into editable records).

**Data Collection.**
- `FeeCategory` `{name, code, defaultOptional, glCode?, active}` (replaces hardcoded list).
- `LateFeePolicy` `{scope: structure|class|school, type: flat|percent, amount, graceDays, recurrence: once|per-period, cap}`.
- `DiscountRule` `{type: sibling|early-payment|custom, qualifier (e.g., 2nd child 10%, 3rd+ 25%; paid-in-full by date X → Y%), autoApply}`.
- `ScholarshipProgram` `{name, sponsor, coverage (percent | fixed | specific categories), budget?, academicYearId}` + `ScholarshipAward` `{programId, studentId, approvedBy, status}`.

**Workflow.**
```
BU/SA defines categories, late-fee policy, discount rules, scholarship programs (one-time per year)
↓
Invoice generation (existing) consults rules:
   sibling discount auto-lines; scholarship coverage auto-lines (negative items, labeled)
↓
Nightly job: invoices past due + grace → late fee line appended (idempotent, capped)
   → INVOICE_LATE_FEE_APPLIED event → parent notified
↓
Early-payment discount: verified at payment time, auto-credit if qualified
↓
Manual adjustments remain for true exceptions — now requiring approval above threshold
   (waiver > ₦X → PR sign-off, configurable)
↓
Scholarship awards reviewed each rollover (renew / lapse per program rules)
```

**Pages.** Settings → Fees → Categories; → Policies (late fees, discounts); Scholarship programs page (program list, award roster, budget burn); adjustment-approval queue (PR).
**Reports.** Discounts granted by rule; scholarship spend vs budget by program; late fees assessed vs collected; adjustment audit by staff member.
**Notifications.** Late fee applied (→ PA); waiver pending approval (→ PR); scholarship awarded (→ PA); program budget 80% consumed (→ SA, BU).
**Permissions.** Categories/policies: SA, BU (View: PR) · Award scholarship: BU propose, PR approve · Manual adjustment: BU (auto-approve below threshold, PR above) · View: SA, PR, BU · Export: BU, SA, PR.
**Depends on:** WP 1.7, 0.3.

---

## WP 2.4 — Defaulter Management & Dunning

**Purpose.** Schools lose money to silence. This WP gives the bursar a daily worklist and automates the reminder ladder (due-soon → overdue → escalation) so collection stops depending on someone remembering to send texts.

**Consumes:** invoices, balances, carry-forwards (1.6/1.7), channels (2.2). **Produces:** reminder histories, promise-to-pay records, restriction flags (consumed by report card withhold policy, 1.5).

**Setup Requirements.** Settings → Fees → Dunning: ladder steps (e.g., T-7 reminder, T+1 overdue, T+14 firm notice, T+30 escalation), channel + template per step, auto vs manual-approval per step, restriction policy (what overdue families lose — e.g., report card visibility — explicit school choice, default none).

**Data Collection.** `DunningPolicy` (ladder); `ReminderLog` per invoice/step; `PromiseToPay` `{familyId, amount, byDate, agreedWith, status: open|kept|broken}`; `RestrictionFlag` per student `{type, reason, setBy, clearedAt}`.

**Workflow.**
```
Nightly job evaluates invoices vs ladder → queues reminders
↓
Auto steps send via engine; manual steps land in BU approval queue
↓
BU opens Defaulters worklist (sorted by amount/age) → actions per family:
   call-logged note · send reminder now · record promise-to-pay · propose waiver (→2.3)
   · apply restriction (per policy)
↓
Promise-to-pay date passes unpaid → flagged broken → next ladder step
↓
Payment received → flags auto-clear → restriction lifted → ladder resets
```

**Pages.** **Defaulters worklist** (the bursar's daily page: filters, bulk remind, per-family drawer with ledger + contact log); dunning policy settings; promise-to-pay log.
**Reports.** Aging buckets (exists — wire to worklist); recovery rate after each ladder step; broken promises; restrictions in force.
**Notifications.** Each ladder step (→ PA, channel per policy); promise-to-pay broken (→ BU); escalation digest (→ PR weekly).
**Permissions.** Worklist: BU, SA (View: PR) · Configure ladder: SA, BU · Apply/clear restriction: BU (PR approval if tied to report cards) · Export: BU, SA, PR.
**Depends on:** WP 1.7, 2.2, 2.3, 1.10.

---

## WP 2.5 — Family / Household Billing

**Purpose.** Parents with three enrolled children currently see three disconnected invoice stacks. Households unify billing: one statement, sibling-aware, with a single payer experience — and they're the natural home of the sibling-discount rule (2.3).

**Consumes:** parent↔student links, invoices, payments. **Produces:** `Household` entity consumed by statements, dunning (2.4 works per family), discounts.

**Setup Requirements.** Household auto-derivation pass (students sharing a financially-responsible guardian → proposed household; FD/BU confirms); financial-responsibility flag on guardian links (2.10 formalizes).

**Data Collection.** `Household` `{name, guardianIds (with primary payer), studentIds}`; statement preferences (consolidated vs per-child).

**Workflow.**
```
System proposes households from guardian links → BU/FD confirms/edits
↓
Invoice generation tags household → consolidated statement available
↓
Parent fee portal gains "Family view": all children, total balance, one Pay action
   (payment allocated across children per allocation rule: oldest-due first, configurable)
↓
Dunning (2.4) addresses the household once, not per child
```

**Pages.** Households admin page; parent family statement view; allocation-rule setting.
**Reports.** Statement of account per household (the printable artifact parents request); balances by household.
**Notifications.** Consolidated monthly statement (optional, → PA).
**Permissions.** Manage households: BU, FD · View: BU, SA, PR; PA own · Export statement: BU; PA own.
**Depends on:** WP 1.7, 2.3.

---

## WP 2.6 — Role Dashboards (Admin Ops, Principal, Bursar, Teacher, Parent)

**Purpose.** Replace the invitation console and generic widgets with role-true home pages. Almost no new data is created here — this WP is the *payoff surface* for everything in Phases 0–2, and the moment the product stops feeling like disconnected pages.

**Consumes:** attendance ops (1.8), fees (1.7/2.4), grades pipeline (1.4), timetable, announcements (2.1), setup state (1.1). **Produces:** nothing new — pure assembly.

**Per-role definition.**
- **SA (Admin Ops):** today's attendance %, unmarked registers, fees collected this week vs outstanding, pending approvals across modules, upcoming events, setup warnings, recent audit highlights. (Invitation widgets demoted to User Management.)
- **PR (Principal):** KPI strip (enrollment, attendance trend, collection rate, results progress), approval queue (results sign-off, waivers, promotions, report cards), chronic-absence and defaulter digests, announcements composer shortcut.
- **BU (Bursar):** today's takings by method, verification queue, defaulters summary, gateway status, daily cash report shortcut.
- **TE (Teacher):** today's periods (timetable — data exists), unmarked registers, grade-entry deadlines with progress, my announcements; CT extras: my arm's attendance snapshot, comments/traits worklist.
- **PA (Parent):** per child — balance due (+ Pay Now), attendance today/this week, latest published results/report card, announcements feed, upcoming events.

**Workflow.** Each card deep-links into its module; all respect ScopeBar; all degrade with prerequisite-aware empty states (1.1).
**Pages.** Five dashboard rebuilds (replace `DashboardPage`, `TeacherDashboard`, `ParentDashboard` widget sets; add PR and BU homes routed by role).
**Reports.** None of their own. **Notifications.** None of their own.
**Permissions.** Each dashboard renders only cards the user's permissions allow (RBAC-driven card registry).
**Depends on:** WP 1.7, 1.8, 1.4, 2.1, 2.4 (cards appear as sources land — ship incrementally).

---

## WP 2.7 — Timetable Consumer Views, Export & Constraints

**Purpose.** The timetable's *production* side is excellent; its *consumption* side barely exists. Teachers see only "today" inside attendance; parents/students see nothing; nothing prints.

**Consumes:** published timetables (exist). **Produces:** week views, PDFs, workload data (→ 3.4 leave planning).

**Setup Requirements.** None new for views. For constraints: teacher availability windows + max-periods/day (added to teacher profile), room registry (optional).

**Workflow.**
```
Teacher: My Timetable page (full week, current term, print)
↓
Parent/Student: class timetable view (per child) + publish notification
↓
Print/PDF: per class, per teacher, master grid (timetables live on walls)
↓
Builder upgrades: availability + room constraints feed the existing conflict engine
   (new conflict types: teacher-unavailable, room-double-booked, exceeds-max-periods)
```

**Pages.** Teacher week view; parent/child timetable tab; print/export views (class, teacher, master); room registry (Settings → Academic); availability editor on teacher profile.
**Reports.** Teacher workload summary (periods/week, free-period matrix); room utilization.
**Notifications.** Timetable published/updated → affected TE + PA (rule exists in 1.10 catalog — this WP supplies the consumer surface it links to).
**Permissions.** Views: each role own scope; SA/PR all · Constraints config: SA · Export: SA, TE (own), PR.
**Depends on:** timetable module (exists), WP 1.10.

---

## WP 2.8 — Substitution & Cover Management

**Purpose.** A teacher is absent *today* — who covers period 3? This is a daily operation in every school and the bridge between timetable, attendance, and (later) leave management.

**Consumes:** timetable (who teaches what/when), teacher availability/free periods (2.7), absence info (manual now; auto from 3.4 leave later). **Produces:** cover assignments → today's-classes boards (covering teacher sees the period and can take attendance for it).

**Setup Requirements.** Published timetable; WP 2.7 constraint data improves suggestions but isn't required.

**Data Collection.** `TeacherAbsence` `{teacherId, date(s), reason, reportedBy}`; `CoverAssignment` `{absenceId, periodRef, coveringTeacherId, status: proposed|confirmed|declined}`.

**Workflow.**
```
SA/HOS records teacher absent today (or teacher self-reports)
↓
System lists affected periods → suggests covers (free + qualified-for-subject first)
↓
SA assigns → covering teacher notified → confirms/declines
↓
Confirmed cover appears on covering teacher's Today board → they mark attendance for it
↓
Cover history logged per teacher (fairness/load report)
```

**Pages.** Daily cover board (absences + affected periods + assignment UI); my-cover-requests (teacher).
**Reports.** Covers by teacher (load fairness); absence frequency; uncovered periods log.
**Notifications.** Cover request (→ TE); confirmed/declined (→ SA); "your child's class is covered today" optional (→ PA, default off).
**Permissions.** Record absence: SA, HOS, TE (self) · Assign cover: SA, HOS · Confirm: TE · View board: SA, PR, HOS · Export: SA.
**Depends on:** timetable, WP 0.4, 2.7.

---

## WP 2.9 — Student Lifecycle & Admissions

**Purpose.** Replace active/inactive with the real state machine (applicant → admitted → enrolled → … → graduated/withdrawn/transferred/alumni) and give the front desk an admissions queue. Promotion (1.6) created the year-to-year transitions; this WP covers entry and exit.

**Consumes:** student records (0.1/1.9), import (1.2). **Produces:** lifecycle states consumed by rosters (only `enrolled` appears), billing (no invoices for withdrawn), reporting, alumni (4.4).

**Setup Requirements.** Settings → Academic → Admissions: admission-number format (from 1.9), required-document checklist definition (full docs in 2.11; checklist names them now), applicant form fields.

**Data Collection.** `Application` `{applicant bio, desired class, source, status: pending|offered|accepted|rejected|waitlisted}`; `LifecycleEvent` per student `{from, to, date, reason, actor}` (withdrawal reason categories admin-defined); transfer-out destination school.

**Workflow.**
```
FD records application (or parent submits via public link — stretch)
↓
Review → offer → acceptance → admission number issued → student created as admitted
↓
Fees: admission invoice optional (policy) → on first payment/resumption → enrolled
↓
Mid-term exits: withdraw/transfer with reason + exit checklist
   (fees settled? documents returned? final report issued?)
↓
States drive everything: rosters/registers show enrolled only;
   invoice generation skips non-enrolled; profile timeline records each transition
```

**Pages.** Admissions queue (pipeline board); application detail/review; lifecycle action dialogs on student profile (withdraw/transfer/graduate with checklist); exit checklist config.
**Reports.** Admissions funnel (applied→enrolled conversion); withdrawals by reason; enrollment movement (joins/exits per term).
**Notifications.** Application received (→ FD/SA); offer made (→ applicant contact); enrollment confirmed (→ PA); withdrawal processed (→ SA, BU — stop billing).
**Permissions.** Applications: FD, SA · Offer/reject: SA, PR · Lifecycle transitions: SA, FD (graduate: via 1.6 promotion flow) · View: SA, PR, FD; BU (billing-relevant states) · Export: SA, FD.
**Depends on:** WP 0.1, 1.9; ties into 1.6, 2.11.

---

## WP 2.10 — Guardian Relationships, Permissions & Custody Semantics

**Purpose.** "Parent" is currently a flat link. Real families need relationship types, a financial-responsibility flag (who gets invoices — feeds 2.5), pickup authorization, and per-guardian visibility control (separated-parent scenarios are frequent and sensitive).

**Consumes:** parent↔student links. **Produces:** guardian semantics consumed by billing (2.5), notifications (1.10 audience resolution: "financially-responsible guardian of X"), and early-years pickup workflows.

**Data Collection.** Per link: relationship (father/mother/guardian/sponsor — extensible), primaryContact flag, financiallyResponsible flag, pickupAuthorized flag + authorized-pickup list (non-account persons w/ name, phone, photo optional), visibility profile `{grades, attendance, fees, contactInfo}` per guardian; communication preferences (channel, language) move here from §3.4's wishlist.

**Workflow.**
```
FD/SA edits guardian panel on student profile (1.9)
↓
Flags propagate: invoices → financially-responsible; absence alerts → primary contact
   (configurable to all); report cards → per visibility profile
↓
Custody-sensitive change (visibility restriction) requires SA + reason (audited)
↓
Parent self-service: update own contact info → FD approval queue
```

**Pages.** Guardian panel upgrade on student profile; authorized-pickup list; parent-side "my details" edit-with-approval; FD approval queue.
**Reports.** Students missing a financially-responsible guardian (billing gap list); contact-data completeness.
**Notifications.** Guardian details changed (→ other guardians, configurable); approval result (→ PA).
**Permissions.** Edit links/flags: SA, FD · Visibility restrictions: SA only · View: staff per scope; PA sees own links only · Export: SA, FD.
**Depends on:** WP 1.9; feeds 2.4, 2.5, 1.10.

---

## WP 2.11 — Documents & Records

**Purpose.** No file handling exists (logo in 0.3 was the seed). Schools are document machines: admission papers, immunization records, staff credentials, and the generated artifacts (report cards, receipts) that must be retrievable years later.

**Consumes:** storage infra (0.3), student/staff profiles, generated PDFs (1.5, 1.7). **Produces:** document store consumed by profiles, admissions checklist (2.9), transcripts (4.4).

**Setup Requirements.** Settings → Documents: document type registry `{name, appliesTo: student|staff|school, requiredAtAdmission?, retentionYears, visibleToParent?}`; storage quota awareness.

**Data Collection.** `Document` `{ownerRef (student/staff/school), typeId, file, uploadedBy, verifiedBy?, expiresAt? (e.g., first-aid certs), version}`.

**Workflow.**
```
Admin defines document types + admission requirements
↓
Upload from profile tabs (student Documents tab from 1.9 goes live; staff equivalent)
↓
Admissions (2.9) shows required-document checklist → completeness gate (warn or block, policy)
↓
Generated artifacts auto-file: published report cards + receipts attach to the student
↓
Expiring documents (staff certs) → renewal reminders
↓
Retention job flags documents past policy for SA review
```

**Pages.** Document type settings; student/staff Documents tabs (upload, verify, version history); school documents library; expiring-documents worklist.
**Reports.** Document completeness by class (admission compliance); expiring within N days; storage usage.
**Notifications.** Required document missing (→ PA at admission); document verified (→ uploader); expiry reminder (→ staff member + SA).
**Permissions.** Define types: SA · Upload: FD, SA; PA (own child, types marked parent-uploadable) · Verify: FD, SA · Delete: SA (audited) · View: per type visibility; PA own child's parent-visible docs · Export/download: per same scope.
**Depends on:** WP 0.3 (storage), 1.9, 2.9.

---

## WP 2.12 — Reports Hub & Universal Export

**Purpose.** Reports currently exist only inside the fee module. The hub consolidates every report named in this roadmap behind one permission-aware surface with consistent export — and retires per-module one-off export code.

**Consumes:** every module's data. **Produces:** the shared `<ExportButton>`/report-renderer components reused platform-wide; scheduled report deliveries.

**Setup Requirements.** None; reports register themselves with metadata `{module, name, params, requiredPermission}`.

**Workflow.**
```
User opens Reports hub → sees only permitted reports, grouped by module
↓
Sets parameters (always: year/term scope; per-report: class, date range…)
↓
Renders on screen → Export (CSV/PDF/print) → logged to audit
↓
Optional: schedule (e.g., bursar daily cash report auto-emailed 6pm; principal Monday digest)
```

**Launch catalog (consolidating prior WPs):** attendance (daily absence, chronic, compliance, per-student summary) · academic (broadsheet, subject performance, submission compliance) · finance (daily cash, outstanding, aging, collections, reconciliation, discounts, scholarships, household statements) · enrollment (by class/gender, movement, admissions funnel, withdrawals) · staff (workload, covers, absence) · platform (audit, imports, notification delivery).

**Pages.** Reports hub; per-report parameter+render view; schedules manager.
**Reports.** (it *is* the reports) — plus report-usage analytics.
**Notifications.** Scheduled report delivered (→ subscriber).
**Permissions.** Per report, inherited from source module's View/Export; schedule: SA, PR, BU for own-permitted reports.
**Depends on:** the WPs whose reports it surfaces (ship incrementally as they land).

---

## WP 2.13 — Discipline & Behaviour

**Purpose.** Audit score 0/10. Conduct records feed the report card's affective section, the student timeline, and parent communication — and suspensions must interact with attendance.

**Consumes:** students, staff, attendance statuses (1.8). **Produces:** incidents + merit/demerit balances → report cards (1.5 conduct block), student profile timeline (1.9).

**Setup Requirements.** Settings → Discipline: incident categories + severity levels (admin-defined); merit/demerit point values; escalation matrix (severity → who's notified/approves); sanction types (detention, suspension — suspension auto-creates attendance status).

**Data Collection.** `Incident` `{studentId(s), categoryId, severity, description, occurredAt, location, reportedBy, witnesses?, status: open|under-review|resolved, sanction?, parentNotifiedAt}`; `MeritAward` `{studentId, points, reason, awardedBy}`.

**Workflow.**
```
TE/CT logs incident (or merit)
↓
Severity routes: minor → CT resolves; major → SA/PR review queue
↓
Sanction decided (per configured types) → suspension dates → attendance auto-marked 'suspended'
↓
Parent notified per escalation matrix (template per severity)
↓
Resolution recorded → timeline entry → term conduct summary feeds report card
```

**Pages.** Incident log (school-wide, filterable); report-incident form (fast, mobile-friendly — teachers log from the corridor); review queue (SA/PR); student conduct tab (on 1.9); discipline settings.
**Reports.** Incidents by category/class/time; repeat-offender list; merit leaderboard (optional, school choice); sanctions in force.
**Notifications.** Incident logged (→ per escalation matrix); sanction applied (→ PA); suspension ending tomorrow (→ CT, SA).
**Permissions.** Log: TE, CT, SA · Review/sanction: SA, PR (HOS section-scoped) · View student conduct: staff per scope; PA own child (resolved incidents only, policy) · Edit/Delete: SA (audited) · Export: SA, PR.
**Depends on:** WP 1.8 (status interplay), 1.9, 1.10; feeds 1.5.

---

## WP 2.14 — Mobile / PWA Hardening: Offline Attendance & Push

**Purpose.** The PWA shell exists (install, offline banner, update flow). This WP makes the two interactions that happen away from a desk actually work: a teacher marking attendance standing in a classroom with bad signal, and a parent receiving push alerts.

**Consumes:** attendance flow (0.4/1.8), notification engine (1.10). **Produces:** offline-capable register, web-push channel for the engine.

**Workflow.**
```
Attendance offline: register + roster cached per teacher per day (service worker)
↓
Marks stored locally → sync queue → background sync on reconnect
   → conflict rule: server submitted-state wins; teacher alerted if session was already submitted elsewhere
↓
Push: user opts in (per-role prompt) → subscription stored → engine gains 'push' channel
   → absence alerts, payment receipts, announcements delivered as push
↓
Mobile audit pass: parent fee flow, register, dashboards at 360px;
   replace ad-hoc navigator.onLine checks with cached-data strategy + stale badges
```

**Pages.** None new — quality pass + offline indicators on register; push opt-in prompts.
**Reports.** Sync failure log (support); push opt-in rates.
**Notifications.** (channel work) push becomes available to all 1.10 rules.
**Permissions.** N/A (user-level opt-in).
**Depends on:** WP 0.4, 1.8, 1.10.

---

# PHASE 3 — Ecosystem Depth (Version 2.0)

> **Goal:** the student becomes a first-class user; academics deepen (assignments, exam logistics); staff operations mature (leave/HR); finance gets forward-looking.
> Specs below are intentionally one notch less granular — they should be re-detailed against real V1.0 usage data before build.

---

## WP 3.1 — Student Role & Portal

**Purpose.** The "soon to support students" commitment. Older students (upper primary+, per school policy) get their own login.
**Setup:** Settings → Academic → Student access: enablement by section/class; what students may see (fees visibility is a school choice, default off); credential issuance (school-generated usernames vs email).
**Workflow:** SA enables per section → accounts generated/invited → student logs in → dashboard: my timetable, my published results/report cards, announcements, upcoming events, (3.2) assignments. ProtectedRoute gains `student`; all data scoped to self.
**Pages:** student dashboard, timetable, results, announcements feed, profile.
**Notifications:** results published, announcement, assignment due (3.2).
**Permissions:** ST: view-own only across the board; no create/edit anywhere initially.
**Depends on:** WP 0.2, 1.5, 2.1, 2.7.

## WP 3.2 — Assignments & Homework

**Purpose.** Teacher↔student work loop; the first feature that makes the student portal daily-use.
**Data:** `Assignment` {subject×arm, title, instructions, attachments, dueAt, maxScore?, countsTowardComponent? (links to grading scheme component — powerful: homework feeds CA)}; `Submission` {studentId, files/text, submittedAt, score, feedback}.
**Workflow:** TE creates → students (3.1) + parents notified → submit online or marked-as-collected offline → TE grades → optionally flows into a scheme component's score (1.4) → feedback visible.
**Pages:** TE assignment manager + grading view; ST list/detail/submit; PA visibility view.
**Reports:** submission rates per class; missing-work list.
**Notifications:** assigned, due T-1, graded (→ ST, PA).
**Permissions:** TE own subject×arm; EO view-all; PA/ST view-own.
**Depends on:** WP 3.1 (full value), 1.3/1.4 (score flow), 2.11 (files).

## WP 3.3 — Exam Timetabling

**Purpose.** Exam week is a different timetable: venues, invigilators, seating capacity. Reuse the timetable engine (grids, conflict detection, publish) with exam semantics — the audit explicitly flags this reuse.
**Workflow:** EO creates exam timetable per term from assessment calendar → conflict checks (student can't sit two papers at once via arm subjects; invigilator availability; venue capacity) → publish → consumed by 2.7-style views + attendance-for-exams.
**Pages:** exam timetable builder; invigilation roster; student/parent exam schedule view.
**Reports:** invigilation load; venue utilization.
**Notifications:** exam timetable published; invigilation assignment.
**Depends on:** timetable engine, WP 2.7; pairs with 1.4's entry windows.

## WP 3.4 — Staff Leave & HR Depth

**Purpose.** Formalize the absence side of substitution (2.8) and complete staff records (qualifications, employment data flagged missing in audit §3.5).
**Data:** leave types + balances (configurable), leave requests with approval chain; staff employment record (staff ID, qualifications, employment type, date employed, department).
**Workflow:** TE requests leave → HOS/SA approve → approved leave auto-feeds cover board (2.8) for affected days → balances tracked → year-end report.
**Pages:** leave request/approval; staff HR profile; leave calendar.
**Reports:** leave balances, absence patterns, department headcount.
**Notifications:** request submitted/decided; balance low.
**Permissions:** TE self-request; HOS/SA approve; SA HR-edit.
**Depends on:** WP 2.8, 0.2.

## WP 3.5 — Parent Self-Service Payment Plans

**Purpose.** Families negotiate custom installment agreements today in the bursar's office; let them request, and the bursar approve, inside the system — reducing 2.4's manual promise-to-pay traffic.
**Workflow:** PA proposes plan against outstanding balance (within school-configured bounds: min deposit %, max installments) → BU/PR approves → plan supersedes invoice due dates → auto-reminders per installment → broken plan re-enters dunning.
**Pages:** PA plan request flow; BU approval queue; plan tracker.
**Reports:** active plans, performance (kept vs broken).
**Notifications:** plan approved; installment due; plan broken.
**Depends on:** WP 1.7, 2.3, 2.4.

## WP 3.6 — Revenue Forecasting & Accounting Export

**Purpose.** Forward-looking finance: expected vs billed vs collected per term, scenario projection on enrollment; clean handoff to external accountants.
**Workflow:** structures × projected enrollment → forecast; actuals tracked against it; period-close export (CSV/standard formats; GL codes from 2.3 categories) for the school's accounting system.
**Pages:** forecast dashboard; export console.
**Reports:** forecast vs actual; revenue by category; cohort collection curves.
**Permissions:** BU, PR, SA.
**Depends on:** WP 2.3, 1.6 (closed-term actuals).

## WP 3.7 — Lesson Plans & Scheme of Work (light)

**Purpose.** Curriculum coverage tracking: HOS sees whether SS2 Physics is on schedule.
**Workflow:** TE uploads/builds weekly scheme per subject×arm → marks topics covered → HOS/PR coverage view.
**Pages:** scheme editor; coverage dashboard. **Reports:** coverage %. **Depends on:** WP 2.11 (files), subjects/terms.

---

# PHASE 4 — Enterprise

> **Goal:** large schools, school groups, and integration ecosystems.

## WP 4.1 — Multi-Campus / School Groups
Campus as a first-class scope between school and section: shared identity + group-level reporting, per-campus structure/staff/fees. Group-admin role; cross-campus transfers (extends 2.9); consolidated finance (extends 3.6). **Depends on:** clean scoping discipline from WP 0.1 onward — this is why the canonical key set matters from day one.

## WP 4.2 — Custom Fields & Form Builder
Admin-defined fields on student/staff/application records (type, validation, required-at, visibility); custom forms (admission forms, consent forms) built on the same engine. Surfaces in profiles (1.9), imports (1.2), admissions (2.9), exports. **Permissions:** SA defines; field-level visibility per role.

## WP 4.3 — Public API & Webhooks
Authenticated API surface + webhook subscriptions on the domain event bus (0.5) for third parties (accounting tools, LMS, government EMIS reporting). API keys per school, scoped by the RBAC permission model; delivery logs + replay. **Depends on:** WP 0.5, 0.2.

## WP 4.4 — Alumni & Transcripts
Graduated students (from 1.6) enter alumni registry; transcript service compiles multi-year results from locked grade history into school-branded transcripts (request → fee (optional, via 1.7) → generate → verify with QR/code). **Depends on:** WP 1.4–1.6, 2.11.

## WP 4.5 — Compliance, SSO & Advanced Analytics
Data-retention policies (extends 2.11), parent data-export/erasure requests, SSO (Google Workspace for staff), IP/device session controls, anomaly alerts on audit stream; warehouse-grade analytics (cohort academic progression, teacher value-add, multi-year trends) on top of the closed-term snapshots from 1.6.

---

# §5 Dependency Spine (build order at a glance)

```
0.1 Data Model ──┬─→ 0.4 Attendance Persist ──→ 1.8 Attendance Ops ──┐
                 ├─→ 1.3 Grading Scheme ──→ 1.4 Entry/Broadsheet ──┐ │
0.2 RBAC ────────┤                                                 ├─┼─→ 1.5 REPORT CARDS
0.3 Settings ────┤            0.3 Identity ────────────────────────┘ │
                 ├─→ 1.7 Gateway/Payments ──→ 2.3 Fee Policy ──→ 2.4 Dunning ──→ 2.5 Households
0.5 Hygiene/Bus ─┴─→ 1.10 Notification Engine ──→ 2.1 Announcements ──→ 2.2 Channels
1.5 + 1.7 ──→ 1.6 TERM LIFECYCLE (close → carry-forward → rollover → promotion)
1.x outputs ──→ 1.9 Student 360° ──→ 2.9 Lifecycle/Admissions ──→ 2.10 Guardians ──→ 2.11 Documents
everything ──→ 2.6 Role Dashboards · 2.12 Reports Hub  (assembly layers, ship incrementally)
```

Two deliberate rules embedded above:
1. **Report cards (1.5) and term lifecycle (1.6) are the convergence points** — almost every Phase 0–1 WP exists to feed them. Protect their dependency chains when re-planning.
2. **Assembly layers (1.9, 2.6, 2.12) never block other work** — they grow a tab/card/report at a time as sources land, and they're where users *feel* the ecosystem forming. Start them early, finish them never.

---

# §6 Suggested Delivery Slices (within-phase sequencing)

Each phase is deployable, but within phases, ship in these working slices:

- **Slice 0-A:** 0.2 RBAC + 0.3 Settings shell (unblocks everything; bursar/principal accounts issued).
- **Slice 0-B:** 0.1 migration + 0.4 attendance persistence + 0.5 hygiene (data becomes real).
- **Slice 1-A "Money":** 1.7 gateway + payments → first school collects fees online.
- **Slice 1-B "Results":** 1.3 + 1.4 + 1.5 → first term's report cards generated.
- **Slice 1-C "Operations":** 1.1 checklist + 1.2 import + 1.8 attendance ops + 1.10 notifications + 1.9 profile.
- **Slice 1-D "Continuity":** 1.6 term close/rollover — must land before the pilot school's term ends.
- **Phase 2:** pair one revenue WP (2.3→2.4→2.5) with one experience WP (2.1, 2.6, 2.7) per cycle; 2.9–2.11 as a records trilogy; 2.13–2.14 close the phase.

---

# §7 Release Definitions

## MVP Release — "A school can run one term"
**= Phase 0 + Phase 1 complete.** Gate checklist:
- All academic records ID-keyed; zero name-string writes (0.1)
- RBAC live with PR/BU/EO roles enforced server-side; audit log capturing financial + grade actions (0.2)
- Settings hub with identity, locale, grading schemes, attendance policy, payment setup (0.3, 1.3, 1.8, 1.7)
- No mock writes anywhere; feature flags honest (0.4, 0.5)
- Onboarding checklist + CSV import → a 600-student school onboards in a day (1.1, 1.2)
- Grades: scheme-constrained entry → broadsheet → moderation → publish (1.4)
- **Report cards generated, approved, published to parents, archived as PDF (1.5)**
- **Parents pay online; receipts auto-issued; bursar daily cash report (1.7)**
- Absence alerts reach parents; principal sees unmarked registers (1.8)
- Student 360° profile live (1.9); notification center for all roles (1.10)
- Term close with grade/attendance locking + fee carry-forward executed at the pilot school (1.6)

## Version 1.0 — "Ready to onboard schools at scale"
**= MVP + Phase 2.** Adds: announcements + SMS/WhatsApp channels (2.1, 2.2) · fee policy automation: categories, late fees, discounts, scholarships, dunning ladder, defaulter worklist, household statements (2.3–2.5) · true role dashboards (2.6) · timetable consumption + substitution (2.7, 2.8) · admissions + lifecycle states + guardian semantics + documents (2.9–2.11) · reports hub with universal export (2.12) · discipline module feeding report cards (2.13) · offline attendance + push (2.14).
**Gate:** three schools running concurrently with no support intervention in daily operations; every audit-module score ≥ 6.

## Version 2.0 — "The ecosystem deepens"
**= V1.0 + Phase 3.** Student portal (3.1), assignments feeding CA scores (3.2), exam timetabling (3.3), staff leave→cover integration (3.4), parent payment plans (3.5), revenue forecasting + accounting export (3.6), curriculum coverage (3.7).
**Gate:** student daily-active usage in pilot sections; bursar closes a term without spreadsheets.

## Enterprise — "Groups, integration, compliance"
**= Phase 4.** Multi-campus groups (4.1), custom fields/forms (4.2), public API + webhooks (4.3), alumni + verified transcripts (4.4), SSO/retention/advanced analytics (4.5).
**Gate:** first school group (≥2 campuses) on consolidated reporting; first third-party integration via public API.

---

*This roadmap supersedes the priority lists in `PRODUCT_REVIEW_AND_MODERNIZATION_PLAN.md` §5; the audit remains the source for module-level rationale and current-state detail. Re-validate Phase 2+ scope against pilot-school feedback after the MVP gate.*
