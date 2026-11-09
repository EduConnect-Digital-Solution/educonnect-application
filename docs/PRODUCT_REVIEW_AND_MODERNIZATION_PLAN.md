# EduConnect — Product Review & Modernization Plan

**Audit date:** June 2026
**Scope:** Entire frontend application (`src/`), API contracts (`newFeatures.md`, `feeImplementation.md`), and the implied backend surface.
**Benchmark lens:** Mature, configuration-driven education platforms (Playground-style ecosystems: deep configurability, complete lifecycles, role-aware workflows).

---

## 1. Executive Summary — The Brutally Honest Version

EduConnect today is **a user-administration tool with academic features bolted on**, not a school operating system. The strongest evidence:

- The **admin dashboard's headline metrics are "Total Invitations" and "Pending Invites"** — invitation plumbing, not school operations. A principal opening this page on a Monday morning learns nothing about attendance, fee collection, or what's happening in their school today.
- There is **no Settings module at all**. Zero. No place to configure grading schemes, attendance policy, currency, branding, payment gateways, notification preferences, or permissions. Everything that should be a school-level decision is either hardcoded in the frontend or doesn't exist.
- There are **exactly three roles** (`admin`, `teacher`, `parent`), enforced as flat route guards. A real school has a principal, a bursar, a head of section, an exam officer, a front-desk admin — none of whom can be represented without giving them the keys to everything.
- **Two entire data models coexist.** The legacy API surface (`authAPIs.js`) identifies students by `class` and `section` *name strings* ("JSS1", "A"), while the academic structure APIs use `classId`/`armId` ObjectIds. Grades are keyed to class *names* and a hand-typed academic year. This is the single biggest structural threat to the product: data recorded today (grades, attendance) cannot be reliably joined to the structured academic model tomorrow.
- Several "working" features are **frontend theatre over stub backends**: attendance submission logs to the console and returns a fake success; "graded" status for students is stored in `localStorage`; the fee module carries a full mock-data fallback layer inside the API client.

What's genuinely good — and worth saying plainly:

- The **Timetable module is the most mature thing in the product**: period setup wizard, drag-and-drop weekly grid, a real conflict engine, draft → publish lifecycle, publish scheduling, duplication wizard, a library page, and it *feeds the attendance module* with the teacher's daily schedule. This is the one place where setup → configuration → operation → downstream consumption actually forms an ecosystem. **It should be the template for every other module.**
- The **Fees module's API contract** (`feeImplementation.md`) is well-designed: structures with lifecycle and versioning, invoice generation, payments with gateway initialize/verify, adjustments, double-entry ledger, receipts, aging/collection reports, reconciliation. The contract is ahead of both the backend and the UI.
- The **event notification system** (targets, scheduling, reminders, delivery logs) is a real notification engine in embryo — but it's trapped inside the Events Planner instead of serving the whole platform.

**Overall production readiness: 3.5 / 10.** The platform can register a school, invite users, structure classes, build a timetable, and bill fees. It cannot yet run a term of school: no report cards, no admin-side attendance, no communication, no settings, no student role, and a data model split down the middle.

---

## 2. Cross-Cutting Problems (fix these before any single module)

These issues appear in *every* module and explain why the product "feels like a collection of pages."

### 2.1 The dual data model (CRITICAL)

| Concern | Legacy surface (`authAPIs.js`) | Academic surface (`classAPIs`, `armAPIs`, etc.) |
|---|---|---|
| Class identity | `class: "JSS1"` (string) | `classId` (ObjectId) |
| Arm identity | `section: "A"` (string) | `armId` (ObjectId) |
| Academic year | hand-typed `"2026-2027"` | `academicYearId` |
| Term | `"First Term"` string | `termId` + enum |

Consequences visible in the code today:
- `ClassStudents.jsx` submits grades with `class`, `section`, `term`, `academicYear` as strings — grades are not durably linked to the academic structure, so renaming a class or arm orphans every grade ever recorded.
- `StudentManagement.jsx` has to fetch **all classes, then all arms per class** (N+1 requests) just to render display names, because the student record carries IDs but the surrounding APIs speak names.
- `attendanceAPIs.js` builds synthetic IDs out of class/subject *names* (`cls_jss1`, `sub_mathematics`) as a bridge.

**Required:** one canonical model — every record that touches academics carries `{schoolId, academicYearId, termId, classId, armId, subjectId, studentId}`. Names are display data only. Migrate the grade and student endpoints first; everything else (report cards, analytics, promotion) depends on it.

### 2.2 No prerequisite/dependency awareness

The Timetable module proves the team knows how to do this (the Period Setup Wizard detects published timetables and walks the admin through setup). Nowhere else does the product know its own dependency graph:

- Fee structures require: academic year → term → classes → students assigned to classes. If any are missing, the admin just sees empty dropdowns with no explanation.
- Attendance requires a published timetable; teachers with no published timetable get a synthetic fallback rather than a "your school hasn't published a timetable for this term" state.
- Grading requires subjects assigned to arms, students assigned to arms, and (should require) an admin-defined assessment scheme — none of which is checked.

**Required:** a platform-level *Setup Checklist / Onboarding Tracker* (see §3.1) plus per-feature empty states that name the missing prerequisite and deep-link to fix it.

### 2.3 Hardcoded things that must be configuration

| Currently hardcoded | Where | Should be |
|---|---|---|
| 3-term structure (`First_Term/Second_Term/Third_Term` enum) | backend contract, term creation | School-defined: terms/semesters/quarters, any count, any names |
| Fee types (9 fixed: tuition, PTA, boarding…) | `feeAPIs.js: FEE_TYPES` | Admin-managed fee category registry |
| Payment methods list | `feeAPIs.js: PAYMENT_METHODS` | Admin-enabled methods + configured gateways with keys |
| Currency (₦ / NGN, kobo math) | `formatNaira`, parent fee page | School-level currency + locale setting |
| Subject categories (`core/elective/optional/religious`) | subject contract | Admin-defined categories |
| Period time slots fallback | `attendanceAPIs.js: PERIOD_SLOTS` | Always derived from the school's period configuration |
| Default grade-publish year `"2026-2027"`, term `"First Term"` | `ClassStudents.jsx` | Always the AcademicContext's current term |
| Grading: assessment types, weights, grade boundaries | nowhere (free-form per teacher) | Admin-defined grading scheme per school/section |
| Attendance statuses (`present/absent/late`) | attendance register | Admin-extensible (excused, medical, suspended…) |
| Roles (3 flat) | `ProtectedRoute` | Role + permission matrix, custom roles |

### 2.4 Mock/stub code shipping inside production paths

- `feeAPIs.js` (1,001 lines) interleaves a full mock store with live calls behind `FEE_BACKEND_LIVE`.
- `attendanceAPIs.js` write-side: `console.log` + `delay()` + fake success. A teacher can "submit" a register that is silently discarded.
- `ClassStudents.jsx` keeps per-student "graded" flags in `localStorage`, keyed by user/class/subject — wrong device, wrong truth.
- `window.authContext` global bridge for axios interceptors.

**Required:** strip mock layers into MSW/dev-only fixtures; any feature whose backend isn't live must be visibly flagged in-product (or hidden), never silently fake-succeeding.

### 2.5 No notion of "term lifecycle" as the product's heartbeat

Real school platforms revolve around the term/session lifecycle: open term → operate (attend, teach, assess, bill, communicate) → close term (lock attendance/grades, generate report cards, carry balances forward) → promote/transfer → open next term. EduConnect has the *data objects* (years, terms) but **no lifecycle operations**: no term close, no locking, no carry-forward, no promotion, no archival. Until this exists, every module is a standalone tool rather than a stage in a school year.

---

## 3. Module-by-Module Audit

Scoring: **0** = doesn't exist, **5** = demo-able but not school-operable, **8+** = a real school could run on it.

---

### 3.1 School Setup & Onboarding — **Score: 3/10**

**Current state**
- 3-step registration wizard (School Info → Location → Account), OTP verification, invitation-based registration completion for staff/parents. School Profile page with edit + activate/deactivate (with reason).

**Missing foundations**
- **Post-registration setup journey.** After registering, an admin lands on an invitation-metrics dashboard with no guidance. There is no "Get your school running" checklist: ① academic year & terms → ② classes & arms → ③ subjects → ④ staff → ⑤ students & parents → ⑥ periods & timetable → ⑦ fee structures → ⑧ publish. Each step should show status, block-or-warn on dependencies, and deep-link.
- School identity: logo/crest upload, motto, colors (these also feed report cards and receipts — a receipt without a school crest is not credible to a Nigerian parent).
- Locale: currency, timezone, date format, language.
- School structure: sections/divisions (Nursery / Primary / JSS / SSS) as first-class objects that group classes — fee policies, grading schemes, and report card templates differ per section in real schools.
- Multi-campus/branch support (even if deferred, the data model should anticipate it).

**Missing pages:** Setup/Onboarding checklist page; Settings hub (see §3.20); Branding page.
**Missing workflows:** data import (CSV of students/parents/staff is how every school migrates — without it, onboarding a 600-student school means 600 manual forms); school year initialization wizard.
**Missing automation:** seed sensible defaults on registration (a default academic year scaffold, standard Nigerian class ladder offered as a template — Creche → SS3 — that the admin can edit).
**Missing notifications:** welcome/orientation emails; setup-incomplete nudges.

---

### 3.2 Academic Structure (Years, Terms, Classes, Arms, Subjects) — **Score: 5/10**

**Current state**
- Academic years + terms CRUD with "current" markers; global `AcademicContext` with year/term switcher; Calendar builder page. Classes with free-form level (1–100); arms per class with optional class teacher; subjects with code/category; per-arm subject lists with copy/replace tooling (genuinely good — handles the JSS-shared vs SSS-stream reality).

**Missing foundations**
- **Term structure is hardcoded to exactly three enum terms.** Schools running semesters, or British-curriculum schools with half-terms, cannot be represented.
- Term update/delete endpoints are documented as *not implemented* — admins cannot fix a typo'd term date.
- No **sections/divisions** grouping classes (see §3.1).
- No **promotion mapping** (JSS1 → JSS2): without it, year-end promotion (§3.3) can never be automated.
- Class metadata: capacity, classroom/location, expected fee tier.
- No archival: what happens to 2025/2026 data when 2026/2027 starts? No read-only historical mode.

**Missing workflows**
- **Year rollover wizard**: clone class/arm/subject structure into a new year, carry student assignments through promotion rules, re-link class teachers.
- Guarded deletes: deleting a class/subject that has students, grades, invoices, or timetable entries should be blocked with an impact summary, not silently cascade or orphan.

**Missing reporting:** structure overview (classes × arms × population × class teacher × subjects count) on one page; population vs capacity.
**Missing permissions:** structure changes are admin-only forever; a head of section should manage their own section.

---

### 3.3 Student Management — **Score: 4/10**

**Current state**
- Admin list with search/status/class filters, grid/table views, pagination (client-side); create/edit/status-toggle/soft-delete modals; class/arm assignment APIs; unassigned-students endpoint; class population stats. Captured: names, email, DOB, gender, address, phone, parent links.

**Missing foundations**
- **No admission number / student ID scheme** (admin-configurable format, e.g. `SUN/2026/001`). Roll number exists in the API contract but isn't surfaced or generated.
- **No enrollment lifecycle.** A student is just active/inactive. Real states: applicant → admitted → enrolled → (promoted | repeated | transferred out | withdrawn | graduated | alumni), each with dates and reasons. "Soft delete with optional reason" is not how schools exit students.
- Missing data: passport photo; nationality/state of origin (standard on Nigerian report cards); religion (many schools record it); blood group/genotype, allergies, medical notes; emergency contacts beyond linked parents; previous school; admission date.
- Students fetched via `getAllStudents()` with **client-side filtering and N+1 arm lookups** — unusable at 1,000+ students. Server-side pagination/filter exists in the contract; the UI doesn't use it.

**Missing pages**
- **Student profile page (the single biggest missing page in the product).** A 360° view: bio + guardians + current class → tabs for Attendance history, Grades/Results, Fee ledger (the API for this exists!), Documents, Timeline/Notes. Today a student is a row in four disconnected modules; this page is what makes the platform feel like an ecosystem.
- Admissions/applications page (even minimal: pending admissions queue).
- Bulk import (CSV upload → validation → preview → commit).

**Missing workflows:** promotion (bulk, rule-driven, with repeat/skip exceptions); transfer between arms mid-term (with history retained); graduation; sibling linking.
**Missing reporting:** enrollment by class/gender/age; admissions vs withdrawals over time; birthdays list (small thing; schools love it).
**Missing automation:** auto-generate admission numbers; auto-assign roll numbers within an arm.
**Missing notifications:** parent notified when their child is enrolled/assigned to a class/promoted.

---

### 3.4 Parent Management — **Score: 3/10**

**Current state**
- Invite-by-email; link/unlink students; parent details view; parent profile self-service.

**Missing foundations**
- **Relationship semantics**: father/mother/guardian/sponsor; primary contact flag; financial responsibility flag (who receives invoices — critical for fees); pickup authorization (the Playground feature that matters most in early-years).
- Multiple guardians per student with differing permissions (separated parents are a real, frequent, sensitive case).
- Communication preferences (email/SMS/WhatsApp/push; language).
- Households: siblings share a household for billing (sibling discounts, single invoice view).

**Missing workflows:** parent-initiated data updates with admin approval; offboarding a parent when the last linked child exits.
**Missing permissions:** per-guardian visibility control (e.g., non-custodial parent sees grades but not address).
**Missing notifications:** invitation lifecycle is decent (resend with count, cancel with reason) — but nothing after acceptance.

---

### 3.5 Teacher & Staff Management — **Score: 3/10**

**Current state**
- Invite teachers; assign subjects, classes, and students; status toggle; delete with reason; teacher self-profile.

**Missing foundations**
- **"Staff" doesn't exist — only "teacher."** No bursar, librarian, nurse, front desk, principal. The moment fees go live, the school's accountant either gets the full admin account (audit nightmare) or can't work.
- Employment data: staff ID, qualifications, date employed, department, employment type.
- The **assign-students-to-teacher model is wrong-shaped**: teachers should derive their students from (subject × arm) teaching assignments and class-teacher roles — the timetable already encodes this. Direct student↔teacher links will drift out of sync with the timetable.
- Class teacher (form master) is an optional field on Arm with no surfaced responsibilities (attendance oversight, report card comments, conduct entries).

**Missing pages:** staff directory (all roles); teacher workload view (periods/week from timetable — data already exists); teacher profile (admin view, mirroring the student 360°).
**Missing workflows:** leave/absence + substitution (ties into timetable cover); offboarding with reassignment of classes/subjects.
**Missing reporting:** workload distribution; subject coverage gaps ("SS2 Physics has no teacher").

---

### 3.6 Attendance — **Score: 4/10** (UI 7, system 2)

**Current state**
- Teacher flow is genuinely well-designed: Today's Classes board driven by the *published timetable*, per-period register with present/absent/late + reason + late-arrival time, draft → submit → edit lifecycle. But: **the write side is a stub** (console.log mock), and `newFeatures.md` confirms no attendance backend exists. Submitted registers vanish.

**Missing foundations**
- **Attendance policy configuration**: per-period vs once-daily (most Nigerian schools take form-teacher attendance at assembly, not per subject); grace period for "late"; statuses beyond P/A/L (excused, medical, suspended); whether teachers can edit after submission and for how long; cutoff time.
- Backend persistence (obviously).

**Missing pages**
- **Admin/principal attendance dashboard**: today's school-wide rate, per-class breakdown, unmarked registers ("3 teachers haven't taken attendance today" — the #1 thing principals ask for), trends.
- Student attendance history (feeds the student profile page and report cards).
- Parent view of their child's attendance.

**Missing workflows:** excused-absence requests from parents (submit reason/document → teacher or admin approves); correction workflow with audit trail.
**Missing reporting:** chronic absentee/lateness reports (already named in the API plan — build them); attendance % per student per term (report cards need this number); class comparison.
**Missing automation:** auto-flag students below a configurable threshold; auto-mark school-closed days from the academic calendar/events.
**Missing notifications:** **parent absence alert** (the single highest-value notification in any school product: "Ada was marked absent at 8:15"); unmarked-register reminder to teachers; chronic-absence digest to admin.

---

### 3.7 Assessments, Grades & Exams — **Score: 3/10**

**Current state**
- Teachers enter flexible assessments per student per subject (type/title/score/max/weight/date/remarks), update, publish. Flexible — and that's the problem.

**Missing foundations**
- **No school-defined grading scheme.** Every Nigerian school runs something like CA1 (10%) + CA2 (10%) + Assignment (10%) + Exam (70%) with A–F boundaries — but here every teacher invents their own assessment list and weights per student. Two teachers in the same school can grade incompatibly; report cards become impossible to compute. The grading scheme (assessment components, weights, max scores, grade boundaries, pass marks — per section) must be **admin configuration that constrains teacher entry**.
- Grades keyed by name-strings + hand-typed year (§2.1) — every grade recorded today is structurally fragile.
- "Graded" status in `localStorage` instead of derived from the server.
- No assessment calendar (when CA1 happens, exam week) and no exam timetable (a sibling of the class timetable — reuse that engine).

**Missing pages:** admin grade-entry monitor ("which teachers have submitted SS1 results?" — exam officers spend weeks chasing this); class broadsheet (all students × all subjects grid — *the* artifact of Nigerian result processing); subject analytics (averages, distribution, top/bottom).
**Missing workflows:** entry → submit → moderation/approval (head of dept / principal) → publish → lock; bulk score entry (column-style entry for a whole class, not one modal per student); CSV score import.
**Missing automation:** auto-compute totals, grades, and class positions from the configured scheme; carry assessment templates per term.
**Missing notifications:** results-published notice to parents; entry-deadline reminders to teachers.
**Missing permissions:** teachers limited to their subject×arm assignments (currently inferred but not enforced as a permission concept); exam-officer role.

---

### 3.8 Report Cards — **Score: 0/10**

Does not exist in any form. No template, no generation, no page, no API. This is **the product's most consequential absence**: terminal report cards are the contractual deliverable of a school term in this market, and the artifact parents judge a school's software by.

**Required foundations (in dependency order):** unified data model (§2.1) → grading scheme config (§3.7) → attendance persistence (§3.6) → then:
- Report card **template configuration**: school branding, which components appear (scores table, grade, position, class average, attendance summary, affective/psychomotor traits, class-teacher comment, principal comment, next-term date, fees-due note), per section.
- Affective/psychomotor trait ratings (punctuality, neatness, leadership…) — admin-defined trait list, teacher-rated.
- Comment banks + free comments; class teacher writes, principal approves.
- **Generation pipeline**: term close → compute → class-teacher review → principal sign-off → publish to parent portal → PDF download/print batch.
- Cumulative records: end-of-year reports aggregating three terms; transcripts.

---

### 3.9 Fees & Payments — **Score: 5/10**

**Current state (the most invested module)**
- Five dedicated admin pages (Overview, Structures, Invoices, Payments & Ledger, Reports). Structures: per class, line items from fixed fee types, optional items, single/installment plans (% + due dates validated to 100%), draft → published lifecycle, publish triggers invoice auto-generation. Payments: manual methods + gateway constants, record-payment modal, receipts, student ledger modal, adjustments (discount/waiver/scholarship/correction). Reports: outstanding, aging, collections, reconciliation. Parent side: pending fees, invoice detail, gateway-selection payment sheet (Paystack/…), receipt/download UI. The backend contract (`feeImplementation.md`) covers versioning, clone, transition, initialize/verify, reconciliation match.

**Why it still doesn't feel professional — missing foundations**
- **No payment gateway configuration.** There is no page where the school connects its Paystack/Flutterwave account, keys, settlement bank account, or chooses who bears transaction charges. A parent-facing "Pay with Paystack" button with no school gateway config behind it is theatre.
- **Fee categories are hardcoded** (§2.3). Schools invent levies constantly; this must be a registry the bursar manages.
- **No policy layer**: late-fee rules (flat/percent, grace days, recurrence), sibling/early-payment discount rules (auto-applied, not manual per-invoice adjustments), scholarship programs as managed entities with budgets and assigned students (currently "scholarship" is just an adjustment label), refund policy/workflow, partial-payment allocation order (oldest invoice first? tuition before levies?).
- **No carry-forward**: unpaid Term 1 balance must roll into Term 2's opening balance at term close. Without it every term starts with amnesia — the #1 way schools lose money.
- Structures are **per class only** — no per-arm overrides (boarding arms), no per-student plans (custom installment agreements signed with a specific family), no new-student vs returning-student variants.
- Invoices are class-batch generated; no mid-term proration for a student admitted in week 6.

**Missing pages:** Gateway & bank settings; Fee categories; Discount/scholarship programs; Defaulters worklist (filtered list + bulk-remind + escalation status — the bursar's daily page); family/household statement (all siblings, one statement).
**Missing workflows:** dunning sequence (due-soon reminder → overdue notice → escalation, all configurable); promise-to-pay/payment-plan renegotiation; refunds with approval; void/credit-note with reason + audit.
**Missing reporting:** revenue forecast (expected vs billed vs collected per term); collection-rate trend; per-class realization; fee-type breakdown; bursar daily-cash report (today's takings by method — what gets reconciled against the cashbox every evening).
**Missing automation:** scheduled invoice generation at term open; auto-apply late fees; auto-send receipts (endpoint exists — wire it); auto-restrict configurable privileges for defaulters (e.g., hide report card until cleared — extremely common policy; must be a school *choice*).
**Missing notifications:** invoice issued, due in N days, overdue, payment received (parent + bursar), gateway payment failed.
**Missing permissions:** **bursar role** (record/verify payments, no structure editing), approval thresholds (waivers above ₦X need principal sign-off), read-only auditor.

---

### 3.10 Communication & Messaging — **Score: 1/10**

**Current state:** none, except event-triggered notifications (§3.11). No announcements, no messaging, no email/SMS sending, no templates.

**Required**
- **Announcements/circulars** first (highest value, lowest complexity): admin composes → targets (whole school / sections / classes / roles — the event-notification targeting engine already does exactly this) → schedule → delivery log → read receipts. Parents see them in a feed.
- Parent ↔ school messaging (even a one-way "contact the school" inbox initially; full teacher↔parent threads later, with admin-configurable policy on whether teachers can be messaged directly).
- Channel infrastructure: email + in-app now; SMS/WhatsApp gateways (configurable per school, with per-message cost awareness) for the Nigerian market where email open rates are poor.
- Message templates with variables (school name, student name, amount due…), admin-editable.

---

### 3.11 Notifications — **Score: 2/10**

**Current state:** a surprisingly complete *event* notification engine (enable per event, target roles/users/everyone, immediate vs scheduled, reminders, manual override send, delivery logs with status) — and a static notifications list on the parent dashboard. Nothing else generates notifications.

**Required**
- **Promote the event-notification engine to a platform service.** Every module emits domain events (the fee module already documents `FEE_EVENTS`: `PAYMENT_CONFIRMED`, `BILL_GENERATED`…); the notification service maps events → templates → channels → audiences.
- Notification center (bell icon, unread counts, history) for **all** roles — currently even the admin has no way to be notified of anything.
- Per-user preferences (channel, digest vs instant, quiet hours) and per-school defaults.
- The catalog to implement first: absence alert, payment received, invoice due/overdue, results published, timetable published, announcement, invitation accepted.

---

### 3.12 Timetable Management — **Score: 6/10** (best module)

**Current state**
- Period Setup Wizard (with published-timetable detection), drag-and-drop weekly grid (dnd-kit), palette/properties panels, **conflict engine + inspector**, draft persistence, publish + publish scheduler, duplicate wizard, Timetable Library page, teacher daily schedule API consumed by attendance. This is what an ecosystem feature looks like.

**Missing to reach 9**
- **Consumer views**: teacher's own full-week timetable page (they only get "today" inside attendance); parent/student view of their class timetable; printable/PDF export (timetables live on classroom walls).
- Constraints: teacher availability (part-time staff), max periods/day per teacher, room assignment + room conflicts, subject placement rules (no double Maths after lunch).
- **Substitution/cover workflow**: teacher absent today → find free qualified teacher → assign cover → notify — this is where timetable meets staff leave (§3.5) and is a daily operation in real schools.
- Notifications: timetable published/changed → affected teachers and parents.
- Reporting: teacher workload summary; free-period matrix; room utilization.

---

### 3.13 Class Management (operational) — **Score: 4/10**

Distinct from structure setup: the *running* of a class. Missing: class dashboard for the class teacher (roster, today's attendance state, fee-defaulter count, results status); capacity tracking; seating/roll order; class-level documents. The class teacher role needs to become a first-class operational concept (it's currently one optional field).

---

### 3.14 Discipline & Behaviour — **Score: 0/10**

Does not exist. Minimum viable: admin-defined incident categories + severity levels and merit/demerit point values; teacher logs incident (student, category, description, witnesses) → configurable escalation (notify class teacher → admin → parent based on severity) → resolution record. Conduct summary feeds the report card's affective section and the student profile timeline. Suspensions should interact with attendance status.

---

### 3.15 Documents & Records — **Score: 0/10**

No file upload exists anywhere (not even a student photo or school logo). Required in priority order: school logo/branding assets → student photos (rosters, registers, and report cards all want them) → student documents (birth certificate, immunization, prior results) with admin-defined required-document checklists per admission → staff credentials → generated-artifact archive (report cards, receipts, transcripts as immutable records). Needs storage infrastructure, per-role access control, and retention rules.

---

### 3.16 Analytics & Reporting — **Score: 2/10**

**Current state:** admin dashboard charts about users/invitations; teacher `StudentAnalytics`; fee analytics endpoints. There is no school-operations analytics anywhere.

**Required:** a Reports hub with the cross-module reports named in §§3.3–3.9, consistent export (PDF/Excel/print) on *every* table in the product (the fee module's export buttons should become a shared component), and a principal-grade KPI layer: enrollment trend, attendance trend, collection rate, academic performance distribution, staff workload. Reports must respect the year/term scope bar (the `ScopeBar` component already exists — mount it everywhere).

---

### 3.17 Dashboard Experiences — **Score: 3/10**

- **Admin dashboard** is an invitation console (§1). It should answer: attendance today, fees collected this week vs outstanding, pending approvals (results, waivers, excuses), upcoming events, setup-incomplete warnings.
- **Principal** has no dashboard (no role). Needs the KPI view of §3.16.
- **Teacher dashboard** is decent scaffolding (stats, responsibilities, quick actions) but shows user-management-flavored "recent activity" instead of: today's periods (timetable data exists!), unmarked registers, grade-entry deadlines.
- **Parent dashboard** shows children + generic notifications, but not the three things parents actually open the app for: **money owed, child's attendance today, latest results/announcements.**
- **Bursar/Student**: no role, no dashboard.

---

### 3.18 Mobile Experience — **Score: 4/10**

PWA foundation is real (install prompt, offline banner, update banner, installed toast) and ahead of most competitors at this stage. But: offline handling is checked ad-hoc per page (`navigator.onLine` in DashboardPage) rather than via cached-data strategy; the attendance register — the one feature teachers will use standing up in a classroom — must work offline and sync; admin tables/timetable builder are desktop-oriented (acceptable), but parent + teacher flows must be audited mobile-first since that's ~80% of their usage. Push notifications (the PWA's killer feature for absence/payment alerts) are absent.

---

### 3.19 Permissions & Roles — **Score: 2/10**

Three hardcoded roles, route-level guards only. Required:
- New first-class roles: **principal, bursar/accountant, head of section, exam officer, class teacher (as a capability), front desk, student.**
- A permission matrix (module × action: view/create/edit/approve/delete) with role templates + per-user overrides; admin UI to manage it; backend enforcement (frontend guards are cosmetic).
- **Audit log** — who did what, when (financial actions and grade changes at minimum). Reasons are already collected on deletes/cancellations; persist and surface them.
- Approval chains as a platform primitive (results publishing, fee waivers, attendance corrections, structure changes mid-term).

### 3.20 Settings & Configuration — **Score: 1/10**

Only school-profile contact info is editable. **A Settings hub is the single clearest "professionalization" deliverable**, consolidating: Branding & Identity · Locale (currency/timezone/formats) · Academic (term model, grading schemes, promotion rules) · Attendance policy · Fees (categories, late-fee/discount policies, gateways, banks) · Communication (channels, templates, sender identity) · Notifications (defaults, event toggles) · Roles & Permissions · Audit log · Data (import/export/backup). Most items above are specified in their module sections; this page is where they live.

### 3.21 Student Role (future) — **Score: 0/10, design now**

Routes, role enum, and data model should anticipate: student login (older students), own timetable, results view, assignment submissions (future), fee balance visibility (school-configurable!), announcements. Decide now: a `student` role in `ProtectedRoute`, age/section-based enablement as school configuration.

---

## 4. Role-Based Journey Review (what each persona experiences today)

| Persona | Can do today | Blocked on |
|---|---|---|
| **School Administrator** | Register school, invite users, structure academics, build/publish timetables, define fee structures, bill, record payments, plan events | No setup guidance; no settings; no operational dashboard; no comms; no bulk import; flying blind on attendance and results progress |
| **Principal** | *No identity in the system* — borrows the admin login | Role doesn't exist; no KPI dashboard; no approval workflows to own |
| **Bursar** | *No identity* — borrows admin (full access incl. deleting students) | Role doesn't exist; no daily-cash view; no defaulter worklist; no gateway/bank config |
| **Teacher** | See classes/students, take (non-persisting) attendance from real timetable, enter/publish free-form grades | Attendance vanishes; no grading scheme to follow; no own-timetable view; no comms with parents; no report card duties |
| **Parent** | See children, profile, pending fees, pick a gateway (mock), receive event notifications | Cannot see attendance, results, timetable, or announcements; cannot actually pay; cannot message the school |
| **Student** | Nothing | Everything |

---

## 5. Prioritized Roadmap

### Phase 0 — Foundations (must precede everything; mostly invisible)
1. **Unify the data model** (§2.1): all academic records keyed by IDs; migrate grade + student + teacher-assignment endpoints; kill name-string addressing.
2. **Attendance backend** — persist the registers the UI already produces; remove write-side stubs.
3. **Roles & permissions framework** with principal/bursar/exam-officer/class-teacher; backend-enforced; audit log.
4. **Settings hub skeleton** + school branding/locale (logo, currency, timezone).
5. Strip mock layers from production API clients; explicit feature flags for not-yet-live backends.

### Phase 1 — Critical gaps (cannot call it production before these)
6. **Setup checklist / onboarding tracker** with dependency-aware empty states across all modules.
7. **Grading scheme configuration** + constrained teacher entry + broadsheet + moderation/publish workflow.
8. **Report card pipeline** (template config → compute → review/sign-off → publish to parents → PDF). *The flagship deliverable.*
9. **Term lifecycle**: term close (lock attendance/grades), fee balance carry-forward, year rollover + promotion wizard.
10. **Payment gateway & bank configuration** + real Paystack initialize/verify on the parent flow + auto-receipts.
11. **Bulk CSV import** (students/parents/staff).
12. **Admin attendance dashboard** + parent absence notifications + unmarked-register chasing.
13. **Student 360° profile page** (bio, guardians, attendance, results, ledger, timeline).
14. **Notification center for all roles**, powered by the generalized event-notification engine; catalog: absence, invoice due/overdue, payment received, results published, timetable published, announcements.

### Phase 2 — High-impact usability
15. Announcements/circulars module (reusing notification targeting); message templates; SMS/WhatsApp channel config.
16. Fee policy layer: admin-defined fee categories, late-fee rules, discount/scholarship programs, defaulters worklist + dunning automation, family statements, proration.
17. Operational dashboards per role (admin ops view, principal KPIs, bursar daily cash, parent money/attendance/results cards, teacher today-view).
18. Timetable consumers: teacher week view, parent/class view, print/PDF; substitution & cover workflow.
19. Student lifecycle states + admission numbers + admissions queue; guardian relationship/permission semantics; households.
20. Documents & records: logo → student photos → admission documents with required-checklists.
21. Reports hub with universal export; server-side pagination/filtering on all large tables.
22. Discipline/behaviour module (incident log → escalation → report card conduct section).
23. Mobile/PWA hardening: offline attendance with sync, push notifications, parent-flow mobile audit.

### Phase 3 — Future enhancements
24. Student role + portal (timetable, results, announcements; configurable fee visibility).
25. Assignments/homework, lesson plans, exam timetabling (reuse timetable engine).
26. Staff HR depth: leave management, payroll hooks, appraisal.
27. Multi-campus support; alumni; transcripts service.
28. Parent payment plans self-service; revenue forecasting; accounting-system export.
29. API/webhook surface for third parties; configurable custom fields on student/staff records.

---

## 6. Closing Assessment

The gap between EduConnect and a Playground-class ecosystem is not feature *count* — it is that Playground-class products are built around three spines this codebase lacks:

1. **A single canonical data model** every feature hangs off (you have two).
2. **A configuration layer** that turns hardcoded assumptions into school decisions (you have approximately zero — one Settings hub changes the product's character more than any new module).
3. **Lifecycles** — term open/close, student enrollment→graduation, structure draft→publish→archive, invoice issue→pay→carry-forward — so features hand off to each other instead of dead-ending (you have exactly one complete lifecycle today: the timetable's, and it's your proof you can do this).

The strategy is therefore not "add more pages." It is: fix the model, build the settings and permissions spine, persist what currently pretends to persist, then ship the two artifacts schools are actually buying — **report cards and reliable fee collection** — wired end-to-end through configuration, operation, automation, and notification. The timetable module already shows the standard; bring everything else up to it.
