# EduConnect — Frontend Modernization & Product Experience Blueprint

**Companion documents:** `PRODUCT_REVIEW_AND_MODERNIZATION_PLAN.md` (what's missing and why) · `SCHOOL_PLATFORM_IMPLEMENTATION_ROADMAP.md` (build order).
**This document:** the same scope, rewritten purely as **product design** — screens, journeys, navigation, states, and feel. Backend is assumed flexible; no APIs, schemas, or services are discussed here. This is the blueprint a designer and frontend engineer can build from directly.

---

# PART I — DESIGN PHILOSOPHY

## 1.1 What separates Playground-class products from CRUD collections

The audit's core finding, translated into UX terms: EduConnect's pages are **nouns** (Students, Invoices, Subjects) when professional platforms are organized around **moments** (this morning's registers, this week's collections, this term's results). Eight principles govern every screen spec below:

1. **The platform always knows what's next.** Every screen answers "what should I do now?" before it answers "what data exists?" Dashboards lead with tasks, not totals. Empty states lead with the next step, not a shrug.
2. **Setup is a journey, not a scavenger hunt.** Anything that needs configuration gets a wizard, a progress indicator, and a way back. The user never discovers a prerequisite by hitting a dead dropdown.
3. **Lifecycles are visible.** Everything that has states (draft→published, pending→paid, entered→approved) renders its state machine on screen — chips, steppers, and timelines — so users always know *where in the process* a thing is and *who holds the ball*.
4. **One thing, one home.** Every entity has exactly one canonical detail page (the student profile, the invoice detail, the class page), and every mention of it anywhere is a link to that home. No more dead-end rows.
5. **Approval is an inbox, not an easter egg.** People who approve things (principal, bursar, exam officer) get a single queue where everything awaiting them collects — never per-module hunting.
6. **Tables are workbenches.** Filter, sort, search, bulk-select, saved views, export, and row-click-to-detail on *every* list. The same table component everywhere, so learning one list means learning them all.
7. **Mobile is role-dependent, not an afterthought.** Parents and teachers are phone-first humans; admins are desktop-first. Design each surface for its real device, not a single responsive compromise.
8. **Calm, consistent, branded.** One spacing scale, one chip vocabulary, one motion language — and the *school's* identity (crest, colors) visible on everything a parent touches, because parents judge the school, not the software.

## 1.2 The current frontend, honestly

What exists is not visually amateur — the timetable builder, the fee pages, and the parent fee screen show real design effort. The problems are structural:

- **Inconsistency:** at least four hand-rolled modal styles, three button systems (shadcn/ui, Chakra remnants, bespoke Tailwind), per-page loaders, and the parent fee page defining its own private Badge/Avatar/Button/Card primitives inline.
- **Modal addiction:** creating a student, viewing a student, editing grades — everything is a modal stacked on a list. Modals can't hold tabs, history, or context, which is why no entity feels like it has a home.
- **Dashboard misdirection:** the admin home celebrates invitations; the teacher home shows generic "recent activity"; the parent home doesn't show money owed. Every role's first screen answers the wrong question.
- **No global layer:** no search, no notification bell, no approvals queue, no persistent setup progress. Each page is an island.

---

# PART II — GLOBAL EXPERIENCE LAYER

These are built once and reused by every module. **They are the highest-leverage design work in this entire document.**

## 2.1 Information Architecture & Navigation

### Admin (desktop-first, sidebar + topbar)

Reorganize the sidebar **by job-to-be-done**, not by data type:

```
🏠 Home
👥 People
   Students · Guardians · Staff · Admissions
🎓 Academics
   Classes & Arms · Subjects · Grading & Results · Report Cards · Timetables
📋 Attendance
💰 Finance
   Overview · Fee Structures · Invoices · Payments · Defaulters · Reports
📣 Communication
   Announcements · Events · Delivery Logs
📊 Reports
⚙️ Settings        (pinned to sidebar bottom, with the school's logo above it)
```

Changes from today: *User Management* becomes **People** (and "Parents" becomes "Guardians"); the four *Configuration* items disperse to their subject-matter homes (Subjects/Classes → Academics; Calendar → Settings → Academic; Timetable Builder → Academics → Timetables); *School Profile* folds into Settings → Identity; *Timetable Library* and *Builder* unify under one Timetables entry.

**Persistent topbar (all roles, all pages):**
- **Global search** (`Ctrl/⌘-K` command palette): type anything → students, guardians, staff, invoices, pages, settings panels. The single biggest "feels professional" feature per invested hour. Results grouped by type, keyboard-navigable, recent searches remembered.
- **Year/Term scope pill** (existing ScopeBar, promoted): always visible, always meaningful; switching to a closed term banners every page "Viewing 2025/26 Term 2 (read-only)".
- **🔔 Notification bell** with unread badge → notification center panel.
- **✓ Approvals chip** (roles that approve see a count: "3 awaiting you").
- **Setup progress chip** (until setup is complete): "Setup 60%" → opens the checklist.
- Profile menu (profile, preferences, theme, logout).

### Teacher (phone + desktop equally)

Sidebar shrinks to five items; mobile gets a **bottom tab bar** (the pattern teachers know from consumer apps):

```
Today · My Classes · Attendance · Results · More (profile, timetable, announcements)
```

### Parent (phone-first; desktop is the exception)

**Bottom tab bar**, full stop:

```
🏠 Home · 👧 Children · 💳 Payments · 🔔 Inbox · ⋯ More
```

A **child switcher** (avatar chips) sits at the top of every child-scoped screen — one tap to flip between siblings, selection persists across tabs.

### Student (Phase 3; phone-first)

```
🏠 Today · 📅 Timetable · 📝 Assignments · 🏆 Results · ⋯ More
```

## 2.2 The Shared Pattern Library (design-system contracts)

Every module below assumes these exist. Build them first; refactor existing screens onto them opportunistically.

**Status chip vocabulary (one set, platform-wide).**
Gray = draft/inactive · Blue = in progress/partial · Amber = pending/awaiting someone · Green = done/published/paid · Red = overdue/failed/rejected · Purple = scheduled. Same hues, same shapes, everywhere — a user who learns invoice chips already understands grade-sheet chips.

**The Workbench Table.** One component for every list: sticky header; column sort; a filter-chip row (active filters visible as dismissible chips); search-within-list; bulk-select with a floating action bar ("12 selected: Remind · Export · Assign…"); density toggle; pagination footer with total count; skeleton rows while loading; per-view column show/hide; **saved views** ("My JSS1 defaulters") for power users; Export button (CSV/PDF) top-right; **row click opens the detail page** (never a modal).

**The Detail Page anatomy.** Header: identity (avatar/icon, name, ID), status chip, breadcrumb, and 1–2 primary actions + an overflow menu. Below: a key-stats strip (3–5 numbers). Then tabs. Right rail (desktop) for metadata/timeline. This one template serves students, staff, invoices, classes, announcements, incidents — everything.

**The Wizard.** Stepper across the top (numbered, named, checkmarked), one decision per screen, persistent "Save & exit" (resume later from where you left), summary-review step before commit, success screen with "what just became possible" links. Used by: onboarding, fee structure creation, term close, year rollover, imports, report card generation.

**The Approval Inbox.** A single queue page per approving role: cards grouped by type (results sheets, waivers, excuse notes, report cards, promotion lists), each expandable in place with Approve / Return-with-comment actions, bulk-approve with spot-check sampling ("approve all 12 — review 3 random"). Decisions show who/when forever after.

**Empty states (three kinds, never blank).**
1. *First-use:* friendly illustration + one-line purpose + primary CTA + (if blocked) the prerequisite, named and linked: "Fee structures need classes first → **Set up classes**".
2. *Filtered-empty:* "No results for these filters" + one-click clear.
3. *Error:* honest message + Retry + "report this" — never a fake success, never a spinner forever.

**Forms.** ≤5 fields → modal or side-drawer. More → dedicated page or drawer with sections. Inline validation on blur; errors next to fields, never only as a toast. Long forms autosave as drafts. Bulk numeric entry (scores, attendance) is **keyboard-first grid** (arrow keys, tab, enter-to-advance), not modals-per-row. Destructive actions: type-the-name confirmation + reason field (reasons are already collected today — keep that habit, surface them in history).

**Lifecycle timeline.** A vertical event trail on detail pages: "Created by A · Submitted by B · Returned by C with comment · Approved by D" with timestamps. Money, grades, report cards, incidents all render it; trust comes from visible history.

**Toasts & undo.** Toasts confirm; they never carry errors that matter. Anything bulk or destructive offers a 10-second Undo where feasible.

**Skeletons over spinners.** Each page shape gets a skeleton; the full-screen branded spinner appears only at app boot.

---

# PART III — ROLE JOURNEYS (the day in the life each surface must serve)

**School Admin, 7:30am.** Opens Home → sees: attendance coming in live (4 registers missing), this week's collections vs outstanding, 2 approvals waiting, setup chip gone (school fully configured), one alert (gateway webhook failing). Every card deep-links. Total time to situational awareness: 30 seconds.

**Principal, Monday.** Opens Home → KPI strip (enrollment, attendance trend sparkline, collection %, results progress) → opens **Approvals** (the chip says 5): two result sheets, one waiver above threshold, two report-card batches → approves with spot-checks → composes the week's announcement from the shortcut. Never touches a data-entry screen.

**Bursar, all day.** Home = today's takings by method (live), verification queue (3 claimed transfers), defaulter worklist shortcut, gateway status. Records cash in a 4-field fast modal; receipt prints/sends itself. Evening: Daily Cash report → Export → done by 4:30.

**Teacher, 7:55am, on a phone.** Opens app → **Today** tab: period cards in time order; first card pulses "Take attendance" → opens register → "All present" one tap → flips two students to absent with reasons → Submit → next card. Between classes: a nudge "JSS2B CA2 scores due Friday — 60% entered" → opens score grid later at a desk.

**Class teacher add-on.** Today tab gains an arm snapshot: my class's attendance %, 2 excuse notes to review, comments worklist during report season.

**Parent, 8:10am, phone.** Push: "Ada was marked absent at 8:05." Opens app → Home shows the alert + balance card "₦45,000 due in 6 days [Pay]" → taps the absence → submits an excuse note with a photo of the hospital slip → 2 taps, done. Term-end: push "Ada's report card is ready" → views it in-app, branded, downloads PDF.

**Student (future), 7am.** Today tab: today's periods, "2 assignments due this week", last result published. Light, fast, zero admin chrome.

---

# PART IV — MODULE BLUEPRINTS

Each module answers the eight questions: **Pages · First sight · Information collected · Workflow · Actions · Dashboards & summaries · Setup screens · The professional difference.**

---

## 4.1 School Onboarding & Setup Journey

**Pages.**
1. Registration wizard (exists — keep; add school logo upload as an optional early step, it pays off everywhere).
2. **Welcome / Setup Checklist page** — the admin's home until setup completes.
3. Per-step wizards (each detailed in its module): Academic Calendar, Structure, Subjects, Staff, Students & Guardians (import), Periods & Timetable, Grading Scheme, Fees, Payments, Go Live.
4. A persistent **Setup progress chip** in the topbar after the user leaves the checklist.

**First sight (first login ever).** Not a dashboard of zeros. A welcome screen: school name + crest, "Let's get {School} running — about 45 minutes across a few sessions," and the checklist: ten steps, each with status ring, time estimate ("~5 min"), what it unlocks ("Unlocks: invoicing"), and a Start button. Steps that depend on others show a small lock + "after Classes".

**Information collected.** Nothing new here — the checklist *orchestrates* the other modules' collection. Its own state is computed from real data (a step turns green because classes exist, never because someone ticked a box).

**Workflow.**
```
Welcome → pick any unlocked step → step's wizard → return to checklist (progress ring fills)
→ at 100%: "Go live" moment — confetti-light celebration, dashboard unlocks as the new home,
   checklist collapses into the topbar chip → chip disappears 7 days after completion
```
Partially-done steps resume mid-wizard. Skippable steps (e.g., gateway) are skippable-with-consequence: "Skip for now — parents won't be able to pay online."

**Actions.** Start/Resume step · Skip (where allowed) · Invite a colleague to a step ("send the bursar the Fees step") · Preview with sample data (a read-only "show me what this looks like filled in" toggle — powerful for sales demos and admin confidence).

**Dashboards & summaries.** The checklist *is* the dashboard at this stage. Platform operators see setup-completeness across schools (support targeting).

**Setup screens required first.** None — this is the front door.

**The professional difference.** A school admin's first hour decides their opinion forever. CRUD products greet them with empty tables and a hamburger menu; Playground-class products walk them in, show progress, celebrate completion, and quietly teach the IA along the way (each wizard ends where its module lives, so the admin learns where things are by *doing*).

---

## 4.2 Settings Hub

**Pages.** One hub at `/settings`, left-nav within it:
Identity & Branding · Locale · Academic (calendar, grading schemes, report card templates, admission numbering, promotion mapping) · Attendance Policy · Finance (categories, policies, gateways & banks, receipt format, dunning) · Communication (channels, sender identity, templates) · Notifications (rules, defaults) · Roles & Permissions · Documents (types, requirements) · Data (import/export) · Audit Log.

**First sight.** A settings landing grid: each section as a card with icon, one-line description, and a "configured / needs attention" status dot — so Settings itself communicates completeness at a glance.

**Information collected.** Per panel (detailed in owning modules). Identity: logo/crest, motto, brand color, head-of-school name + signature image, letterhead line. Locale: currency, timezone, date format, week start.

**Workflow.** Browse or search (the ⌘K palette indexes settings panels by synonym — typing "paystack", "logo", or "late fee" lands on the right panel). Every panel: current values visible at rest, explicit Edit mode, Save/Cancel, "last changed by X on Y" footer linking to the audit log.

**Actions.** Edit · Reset-to-default per panel · Test buttons where applicable ("Send test notification", "Test gateway connection") · Export configuration summary (schools print this for handbooks).

**Dashboards & summaries.** The status-dot landing grid; the audit-log panel as the change history.

**Setup screens.** None — it *is* them.

**The professional difference.** A real Settings area is the product's statement that *the school is in charge*. Every hardcoded thing the audit found (fee types, term names, grade letters, currency) becomes a visible, editable choice here — and the moment an admin sees their crest render on a sample receipt in the Identity panel's live preview, the product stops feeling generic.

---

## 4.3 Academic Structure (Years, Terms, Sections, Classes, Arms, Subjects)

**Pages.**
1. **Academic Calendar** (years & terms timeline view — horizontal bars per term on a year ruler, with today-marker; replaces the current builder's list orientation).
2. **Structure page** — the school tree: Sections → Classes → Arms, as an expandable hierarchy with inline population counts and class-teacher avatars.
3. **Class detail page** (new — classes deserve a home): header (name, level, section, promotion target), stat strip (arms, students, subjects, fee structure linked?), tabs: Arms & Rosters · Subjects · Timetable · Fees · Results summary.
4. **Subjects page** (catalog with category chips; per-arm assignment matrix).

**First sight.** The structure tree, populated or first-use empty state ("Most Nigerian schools run Creche → SS3 — start from the standard ladder and edit, or build from scratch": **template-first creation** is the single best UX idea for this module).

**Information collected.** Section names; class name, level, promotion-target class; arm name + class teacher; subject name/code/category (categories editable); per-arm subject sets.

**Workflow.**
```
Calendar wizard: year → terms (count & names are the school's choice, 3-term template offered)
→ Structure wizard: pick template ladder → edit → arms per class (bulk: "3 arms A/B/C for all of JSS")
→ Subjects: create catalog (template offered) → assignment matrix:
   grid of subjects × arms with checkboxes, "copy arm A to all JSS arms" affordances
   (the existing copy/replace arm-subject tooling is good — give it this matrix UI)
```
Deletions are guarded with an impact preview: "JSS2 has 84 students, 12 timetable entries, 3 fee structures → you can't delete it; you can archive it at year end."

**Actions.** Add/edit/archive at each level · Assign class teacher (inline, searchable) · Copy subjects between arms · Reorder levels · Set promotion mapping (a simple "this class promotes to →" picker, surfaced here because year-rollover depends on it).

**Dashboards & summaries.** Population vs capacity per arm (inline bars in the tree); a one-glance "structure health" banner (classes with no arms, arms with no class teacher, arms with no subjects).

**Setup screens.** Calendar before structure; structure before subjects (enforced by wizard order, explained by lock-hints).

**The professional difference.** The tree + templates + impact-preview deletes. A CRUD product makes you create "JSS1", "JSS2"… in twelve modals; a professional one offers the ladder, shows the school as a living hierarchy with people in it, and treats structure changes with the gravity they deserve.

---

## 4.4 People: Students, Guardians, Staff, Admissions

**Pages.**
1. **Students list** (Workbench Table: filters for class/arm/status/gender; saved views; bulk bar).
2. **Student profile** — *the most important page in the product* (see 4.5).
3. **Guardians list** + guardian detail (their children, contact prefs, financial-responsibility badges).
4. **Staff list** + staff profile (role chips, teaching assignments, timetable load, documents) — replaces the teacher-only page; non-teaching staff appear with role-appropriate tabs.
5. **Admissions pipeline** — kanban-style columns (Applied → Reviewing → Offered → Accepted → Enrolled), cards draggable, each card opens an application detail drawer.
6. **Import wizard** (CSV: upload → map columns → validation report with per-row fix-in-place → preview → commit → results).

**First sight.** Students list with the class-filter chips pre-rendered (filter by tapping a class chip, not opening a dropdown). First-use: "Add students one by one, or **import your whole school from a spreadsheet** (recommended)" — import is the hero CTA, not a footnote.

**Information collected.** Student: bio (name, DOB, gender, photo), admission no. (auto-suggested from the school's format), class/arm, state of origin/nationality, religion (school-optional), medical flags (blood group, genotype, allergies — behind a "Health" form section), previous school, admission date. Guardian links: relationship type, primary-contact / financially-responsible / pickup-authorized toggles (three switches with plain-language captions: "Receives invoices"). Staff: bio, role, subjects/classes (teaching), employment basics.

**Workflow.**
```
Create student (drawer, sectioned form: Identity → Class → Guardians → Health → Review)
   — guardian step searches existing guardians first ("Is this parent already here? Link, don't duplicate")
→ profile opens on save ("what's next: assign subjects happen via arm; invite the guardian?")
Bulk import: wizard → errors fixed inline ("row 41: class 'JS1' unknown — did you mean JSS1? [Apply to all]")
   → commit valid rows → results screen with error-rows download
Admissions: application card → review drawer → Offer (templated letter) → Accept → "Convert to student"
   pre-fills the create form
```

**Actions (students list bulk bar).** Move arm · Change status · Link guardian · Export · Send to import-fix. Row actions: open profile (primary), quick-view popover (photo, class, guardian phone — for the front desk answering a call without leaving the list).

**Dashboards & summaries.** People landing strip: enrolled count (trend), new this term, exits this term, unassigned students (alert if >0), guardian-coverage gaps ("12 students have no financially-responsible guardian" — a billing time bomb surfaced as a worklist link).

**Setup screens.** Classes/arms must exist (import validates against them); admission-number format in Settings → Academic.

**The professional difference.** Search-first guardian linking (duplicate prevention as UX, not data cleanup later), the admissions pipeline as a board instead of a buried status field, and a front desk that can answer "is Ada in school today, and has her mum paid?" from one quick-view popover.

---

## 4.5 The Student Profile (360°)

**Pages.** One page, tabbed. Linked from every roster, register, invoice, report, search result, and notification in the platform.

**First sight.** Header: photo, name, admission no., class-arm chip, status chip, guardian avatars (tap → call/profile), and primary actions (Edit · Record payment · More ▾). Stat strip: attendance % this term · current balance · last result average · open incidents. The strip *is* the answer to "how is this child doing?" in four numbers.

**Tabs & what each shows.**
- **Overview:** bio card, guardian panel (relationship + permission badges), current enrollments, pinned notes.
- **Attendance:** term calendar strip (green/red/amber dots per day), totals, excuse-note history, "view full history" per term.
- **Results:** per-term accordion → subject scores table per the grading scheme; published report cards as branded cards → in-app viewer + PDF.
- **Fees:** ledger (the existing StudentLedgerModal grows into a tab), running balance headline, receipts list, active payment plan if any. Bursar sees Record payment here.
- **Documents:** required-document checklist with upload slots (birth certificate ✓, immunization ⬜…), generated artifacts (report cards, receipts) auto-filed.
- **Timeline:** everything chronological — enrolled, promoted, incidents, notes, status changes — the institutional memory of the child.

**Information collected.** Staff notes (with visibility selector: all staff / admin only); document uploads; edits to bio (audited).

**Workflow.** Arrive from anywhere → answer the question you came with via the stat strip or one tab → act in place (approve excuse, record payment, add note) → leave. The profile is a hub, not a form.

**Actions.** Role-scoped: admin/front desk edit bio & lifecycle (Change arm · Withdraw · Transfer — each a small guided dialog with reason + checklist); bursar acts in Fees tab; class teacher adds notes & views all; subject teacher sees academics but (default) not fees; parent sees a softened read-only version of their own child (no staff notes, no other-guardian contacts).

**Dashboards & summaries.** The stat strip; per-tab mini-summaries.

**Setup screens.** None of its own — tabs light up as modules go live, each with a first-use empty state naming what will appear there.

**The professional difference.** This page *is* the ecosystem made visible. The moment an admin clicks a name in an attendance report and lands on a profile showing fees, results, and a timeline together, the "collection of pages" feeling dies.

---

## 4.6 Attendance

**Pages.**
1. **Teacher: Today board** (exists, good bones) — period cards in time order, each showing status (not started / draft / submitted ✓), tap → register.
2. **Teacher: Register** (exists) — upgraded per below.
3. **Admin: Attendance Operations** — the school-this-morning view.
4. **Student attendance history** (profile tab + standalone per-student view).
5. **Parent: child attendance view** (calendar strip + alerts + excuse submission).
6. **Excuse review queue** (class teacher / admin).
7. **Settings → Attendance Policy.**

**First sight.** *Teacher:* Today board — the next unmarked period pulses gently at top. *Admin:* a live tiles row — school attendance % so far today, registers submitted x/y, absent students count → below, a per-class grid coloring up in real time as registers land, and an **Unmarked registers** list with one-tap "nudge teacher". *Parent:* the child's week strip with today highlighted.

**Information collected.** Register: per-student status (present default; absent/late as exceptions), reason, late-arrival time. Excuse note (parent): date(s), reason category, free text, optional photo. Policy (settings): mode — per-period vs once-daily form-teacher (radio with plain-language explanation of each, because this decision shapes the teacher's whole day), late grace minutes, extra statuses, edit window, alert thresholds, parent-alert toggle.

**Workflow (the register, refined).**
```
Open register → roster with photos → [All present] one tap
→ tap exceptions to cycle present→absent→late (color + icon, thumb-reach on phone)
→ absent/late expand inline for reason/time (optional at mark, required by submit per policy)
→ counter pill updates live ("38 ✓ · 2 ✗ · 1 ⏰") → Submit (confirm sheet summarizes)
→ submitted state: locked banner with "Edit (within 24h)" → edits ask a reason
Offline: register works fully offline, sync badge in the corner ("Saved on device — will sync"),
   conflict resolved in the teacher's favor of clarity ("This register was already submitted on
   another device — review differences")
```
*Parent excuse:* alert → "Submit excuse note" → category + text + photo → submitted chip → decision notification → calendar dot turns amber (excused).

**Actions.** Teacher: mark, all-present, submit, edit-within-window. Admin: nudge unmarked, view any register read-only, correct-with-reason, approve excuses, export day/term. Parent: view, excuse, see history.

**Dashboards & summaries.** Admin ops tiles + class grid; chronic-absence widget ("5 students below 80% — view list"); teacher-compliance mini-table (who chronically marks late/never); parent's term summary ("Present 52 · Absent 3 (2 excused) · Late 1 — 94%"); report-card-ready per-student term %.

**Setup screens.** Policy panel (mode decision first-run, with a "you can change this between terms, not mid-term" note); published timetable prerequisite surfaced by the Today board's empty state ("No periods today — your school's timetable for this term hasn't been published").

**The professional difference.** Exceptions-first marking (default everyone present; touch only the absent), a live morning picture for the principal, and the absence alert → excuse note → approval loop that turns attendance from data entry into a *conversation between school and home*.

---

## 4.7 Grading, Results Entry & Moderation

**Pages.**
1. **Settings → Grading Schemes** (builder with live preview).
2. **Teacher: Score Entry** — spreadsheet-grid per subject × arm.
3. **Teacher: My Sheets** — status list of all my subject×arm sheets this term.
4. **Exam Officer: Results Monitor** — the submission matrix.
5. **Moderation review** (per sheet).
6. **Broadsheet** (per arm).
7. **Subject analytics** view.

**First sight.** *Teacher:* My Sheets — chips per sheet (Not started / In progress 60% / Submitted / Returned ⚠ / Approved ✓) with the entry deadline countdown banner. *Exam officer:* the matrix — rows = arms, columns = subjects, each cell a status chip; the term's results progress in one screen (this matrix is the page exam officers will screenshot into WhatsApp staff groups — make it beautiful).

**Information collected.** Scheme (settings): components with names/max/weights (live total-must-equal-100 indicator), grade boundaries (visual slider rail mapping 0–100 to A–F bands), remarks per grade, position/average display toggles. Scores: per student per component, plus an optional teacher remark per student.

**Workflow.**
```
Scheme builder: template ("CA1 10 · CA2 10 · Assignment 10 · Exam 70, A–F") → tweak → preview
   shows a sample student row computed live → activate for term
Teacher grid: rows = students (photo + name, frozen column), columns = scheme components
   → keyboard-first (type, Enter ↓, Tab →), paste-from-Excel a whole column,
   out-of-range cells reject inline ("max 10"), totals/grades compute live in trailing columns
   → progress bar ("28/40 students complete") → Submit sheet (missing-scores blocker lists names)
Returned sheets: banner with the moderator's comment, edited cells highlighted until resubmit
Moderation: EO opens a sheet → distribution histogram + flags ("8 students ≥95 — verify")
   → Approve or Return-with-comment → PR bulk sign-off from the Approval Inbox
Broadsheet: students × subjects grid, totals/average/position columns,
   sticky name column, print-perfect layout, export
```

**Actions.** Teacher: enter, paste, submit, respond-to-return. EO: open/return/approve, reopen window for a teacher (audited), export matrix. PR: sign off. Admin: view-all.

**Dashboards & summaries.** The matrix; per-subject analytics (mean, pass %, distribution curve, top/bottom 5); teacher-compliance ("3 sheets outstanding, deadline Friday"); class-vs-class comparison.

**Setup screens.** Scheme must exist and be active — score entry's empty state without one: "Your school hasn't defined how grades are computed → **Set up grading scheme** (admin)". Entry window dates set by EO (banner on teacher side: "Entry open until 14 Jul").

**The professional difference.** The grid. Teachers grade 40 students in minutes, not 40 modals; the scheme means every teacher's numbers mean the same thing; the matrix + return-loop makes results processing a managed pipeline with visible bottlenecks instead of a term-end panic.

---

## 4.8 Report Cards

**Pages.**
1. **Settings → Report Card Template** (per section): block toggles + drag-to-reorder + **always-on live preview** of a sample student's card.
2. **Class teacher: Comments & Traits worklist.**
3. **Generation console** (exam officer).
4. **Principal: approval view** (inside the Approval Inbox, with spot-check sampling).
5. **Parent: report card viewer.**
6. **Batch print view.**

**First sight.** *Template editor:* the preview IS the page — a rendered report card (school crest, sample data) with a side panel of toggles (scores table, position, class average, attendance, affective traits, psychomotor, CT comment, PR comment, next-term date, fees note); flipping a toggle animates the block in/out of the preview. *Parent:* a card-shaped artifact in the child's Results tab — tap to open full-screen, school-branded, with a Download PDF button.

**Information collected.** Template config; trait definitions + rating scale (settings); per-student trait ratings + CT comment (comment bank with starter phrases, editable; free text allowed); PR comment (or batch comment).

**Workflow.**
```
Template (once per section) → term end: EO opens Generation console for an arm
→ prerequisite checklist renders live: Grades approved ✓ · Attendance complete ✓ ·
   Comments 34/40 ⚠ (→ links to the CT worklist) → CT worklist: student-by-student
   (photo, computed results summary for context, trait star-ratings, comment box with bank)
→ Generate → progress per student → review state: EO/CT flip through cards (carousel)
→ PR approval: batch card in Inbox ("JSS2A — 40 reports") → spot-check 3 random → Approve
→ Publish → parents notified → cards appear in portal → archived to Documents
Corrections post-publish: "Request regeneration" (reason → PR approves → v2 supersedes,
   parents see only latest, history kept)
```
The fees-withhold policy, if the school enables it, renders honestly on the parent side: a locked card with "Available once outstanding fees are settled — [View balance]" (never a silent absence).

**Actions.** EO: generate, publish, regenerate. CT: comments/traits, review own arm. PR: approve, comment. Parent: view, download, (print). Admin: batch print (sequential full-arm PDF for paper distribution day).

**Dashboards & summaries.** Generation console's per-arm progress; published/withheld counts; "report season" banner on admin home during the window.

**Setup screens.** Template, traits, comment bank (settings); generation blocked—with named gaps—until prerequisites pass.

**The professional difference.** The live-preview template editor (the admin *sees their school's report card* take shape) and the prerequisite checklist that turns a chaotic term-end into a visible pipeline. This is the artifact parents hold in their hands — it must look like the school, not like the software.

---

## 4.9 Finance: Fee Setup, Invoices, Payments, Defaulters (Admin/Bursar)

**Pages.**
1. **Finance Overview** (exists — refocus, below).
2. **Fee Structures** (exists — list is fine; the *creation* becomes a wizard).
3. **Invoices** (Workbench Table; invoice detail page replaces drill-down modals).
4. **Payments & Ledger** (exists — add the verification queue tab).
5. **Defaulters** (new — the bursar's daily page).
6. **Reports** (exists — joins the global Reports hub).
7. **Settings → Finance** (categories · late-fee/discount policies · scholarships · gateways & banks · receipt format · dunning ladder).

**First sight.** *Overview:* this term's headline — Collected vs Outstanding as one big progress bar, then tiles: today's takings, overdue total + count, collection rate trend sparkline, gateway status dot — and a "needs attention" list (failed payments, pending verifications, waivers awaiting approval). *Defaulters:* worklist sorted by amount owed, family-grouped, each row: household, children chips, balance, days overdue, last-reminder date, promise-to-pay status — with a bulk bar (Remind · Export · Escalate).

**Information collected.** Structure wizard: scope (class(es), optionally arm-level variants), line items from the school's *own* category list, amounts, optional flags, payment type (full / installments with a visual percentage-split bar that must total 100), due dates. Settings: categories (name/code), late-fee rules (plain-sentence builder: "After [7] days grace, add [2%] [once]"), discount rules ("2nd child [10%] off, 3rd+ [25%]"), scholarship programs (name, sponsor, coverage, roster), gateway connect (keys → "Test connection" → green check), banks, receipt numbering, dunning ladder (timeline-style editor: T-7 reminder → T+1 overdue → T+14 firm → T+30 escalate, each step: channel + template + auto/manual).

**Workflow.**
```
Structure wizard: scope → items → plan → review (shows a sample family's invoice rendered) →
   Publish (confirm sheet: "This will generate 84 invoices for JSS2 — parents will see them") →
   success screen links to the invoice batch
Invoice detail page: header (student → profile link, status chip, balance), line items,
   payment history timeline, actions (Record payment · Remind · Adjust · Void-with-reason)
Record payment (bursar fast-modal): student search → open invoices listed → amount → method →
   reference → Save → receipt auto-issues (toast: "Receipt #0231 sent to Mrs Okafor")
Verification queue: claimed transfers as cards (parent says paid) → bursar matches against
   bank statement → Confirm / Query
Defaulter row → family drawer: ledger summary, contact log ("called 12/6 — promised Friday"),
   actions: Remind now · Log call · Record promise-to-pay · Propose waiver (→ approval) ·
   Apply restriction (per school policy)
```

**Actions.** Per page above; every money action lands in the lifecycle timeline of its invoice and the audit log.

**Dashboards & summaries.** Overview tiles; aging buckets visual (stacked bar 0-30/31-60/61+); collections-by-class table; **Daily Cash report** (today, by method, by collector — the bursar's 4pm ritual, one click to print); reconciliation view (gateway settlements vs recorded, mismatches highlighted).

**Setup screens.** Categories before structures; gateway before parent online payment (parents see bank-transfer instructions as fallback if no gateway, never a dead button); dunning before auto-reminders.

**The professional difference.** Plain-sentence policy builders (the bursar reads the late-fee rule as English), the rendered-sample-invoice review step before publishing to 84 families, receipts that issue themselves, and a defaulters page that works like a CRM worklist — because fee recovery is relationship work, and the UI should hold the relationship's memory (calls, promises, reminders).

---

## 4.10 Parent Fees & Payment Experience

**Pages (within the parent app's Payments tab).**
1. **Family balance home** — all children, one total, per-child cards.
2. **Invoice detail** (parent view — friendlier rendering of the same artifact).
3. **Pay flow** (sheet-based, ≤3 steps).
4. **Receipts & history.**
5. **Payment plan view** (if the school granted one).

**First sight.** "You owe ₦45,000 — due 16 Jun" as the headline, then per-child cards (child avatar, term, balance, mini-status chip), and a single prominent **Pay** button. If nothing is owed: a green "All settled ✓" state with the receipts history below — *the all-clear is a designed moment, not an empty page*.

**Information collected.** Amount choice (full / an installment per the plan / custom-if-policy-allows, with a slider-or-presets control); payment channel. Nothing else — the school already knows everything.

**Workflow.**
```
Pay → sheet 1: what am I paying (invoice lines, child) + amount presets
→ sheet 2: channel (gateway checkout opens: card/transfer/USSD)
→ gateway completes → return → success screen: animated check, receipt number,
   [Download receipt] [Done] → balance card updates immediately
Pending-confirmation states are honest: "Bank transfer initiated — we'll confirm within
   X hours" with a pending chip, never a fake green
Manual-payment schools: "How to pay" card (bank details, reference to quote) +
   "I've paid — notify the school" → lands in the bursar's verification queue
```

**Actions.** Pay · Download/share receipt (WhatsApp-share matters in this market) · View ledger history · Request payment plan (if school enables, 3.5) · Contact bursar (prefilled context).

**Dashboards & summaries.** The family balance home is the dashboard; a yearly summary ("paid ₦310,000 this session") parents use for their own records.

**Setup screens (school side).** Gateway connected → Pay button live; otherwise instructions-mode automatically.

**The professional difference.** Three taps to paid, receipts that arrive themselves and share to WhatsApp, honest pending states, and the *all-settled* moment designed with as much care as the owing state. Money UX is trust UX.

---

## 4.11 Communication: Announcements, Notification Center, Inbox

**Pages.**
1. **Admin: Announcements manager** (list + composer).
2. **Composer** (full-page, not modal: rich text, attachments, audience picker, schedule).
3. **Delivery & read tracking** per announcement.
4. **Notification Center** (every role — the bell).
5. **Parent/Teacher: Inbox tab** (announcement feed + notification history merged, filterable).
6. **Settings → Communication & Notifications** (channels, templates, rules).

**First sight.** *Composer:* title, body, then the audience picker as **chips with live recipient count** ("Everyone (1,240)" / "JSS parents (310)" / specific classes / roles) — the count updates as chips change, which is the safety rail against mis-broadcasts. *Parent Inbox:* newest first, unread bold, announcement cards distinct from system notifications (absence, payment) by icon language.

**Information collected.** Announcement: title, body, attachments, audience, channels (in-app always; email/SMS/WhatsApp toggles show per-send cost estimate when paid channels are on), publish now/schedule, optional "requires acknowledgement".

**Workflow.**
```
Compose → audience chips (count live) → channel toggles (cost estimate) → Preview as recipient
   (renders the phone-frame view) → Publish or Schedule
→ tracking page: delivered/read/acknowledged progress bars per channel → Resend to unread (once)
Recipient: push/badge → Inbox → read → (acknowledge) → deep links into the relevant module
Notification Center (all roles): grouped by day, filter chips (All · Money · Attendance ·
   Results · Announcements), mark-all-read, per-item deep link, preferences link
Preferences (each user): per-category channel + instant/daily-digest + quiet hours —
   plain switches, no jargon
```

**Actions.** Composer: draft/schedule/publish/duplicate/archive. Recipient: read, acknowledge, mute category (except critical). Admin: resend, export read-compliance ("which parents haven't seen the fee circular").

**Dashboards & summaries.** Per-announcement reach/read/ack bars; channel spend dashboard (settings side); admin-home "last announcement read rate" mini-widget.

**Setup screens.** Sender identity; channel providers with test-send; templates editor (variables as insertable chips: `{{student.firstName}}` shown as a friendly token "Student's first name").

**The professional difference.** The live recipient counter, the phone-frame preview, and read-rate tracking turn broadcasting from a prayer into a managed act. And one Inbox means a parent never wonders where school messages live.

---

## 4.12 Timetables (consumption-side completion)

The builder is the platform's UX high-water mark — keep it. What's missing is everyone else's view.

**Pages.**
1. **Teacher: My Timetable** — full week grid, current period highlighted live, term picker.
2. **Parent/Student: Class timetable** — per child, same grid language, read-only.
3. **Print/export views**: per class · per teacher · master grid (rooms/streams) — print-perfect, school-branded headers, because timetables live on walls.
4. **Substitution board (admin/HOS):** today's absent teachers → affected periods → suggested covers (free + qualified first) → assign.
5. (Builder additions:) teacher availability editor; room registry + conflicts — these slot into the existing conflict engine UI as new conflict chips.

**First sight.** *Teacher:* this week, today's column highlighted, a "now" line across the grid (the touch that makes it feel alive). *Parent:* child's week with subject colors consistent with everywhere else the subject appears.

**Workflow.** Publish (existing flow) → consumers notified → views update; substitution: mark absence → board lists holes → tap a hole → ranked suggestions with reasons ("free · teaches Physics") → assign → covering teacher's Today board gains the period (badged "covering for Mr A").

**Actions.** View, print, export PDF; admin: assign/clear covers; teacher: confirm/decline cover requests.

**Dashboards & summaries.** Teacher workload card (periods/week vs school average); free-period matrix; uncovered-periods alert on admin home each morning.

**Setup screens.** None new for views (published timetable is the prerequisite, and its absence already has a wizard); availability + rooms optional enrichments in the builder.

**The professional difference.** The "now" line, covers flowing straight into the covering teacher's Today board, and print views good enough to staple to the staff-room wall. A timetable nobody can *see* is a database; this makes it the school's pulse.

---

## 4.13 Events & School Calendar

**Pages.** Keep the Events Planner (its notification config is strong). Add: a **unified school calendar view** (month grid merging term dates, events, exam windows, holidays — color-coded layers with toggles) visible to all roles in their own scope; parent/teacher event detail with RSVP-style acknowledge where relevant.

**First sight.** The month view with today ringed; admins see layer toggles, parents see their children's relevant events only.

**The professional difference.** One calendar where term structure, events, and exam windows coexist — the school year as a single visual object instead of three pages.

---

## 4.14 Discipline & Behaviour

**Pages.** Incident log (Workbench Table, severity-colored); **Report Incident** form (built for a phone in a corridor: student search-first, category chips, severity selector, voice-to-text-friendly description, photo); review queue (admin/PR); student conduct tab (on the profile); merit/demerit feed (if school enables points); Settings → Discipline (categories, severities, escalation matrix, sanction types).

**First sight.** *Teacher:* the report form is two taps from anywhere (overflow menu "Report incident") — speed is the adoption driver. *Admin:* the log filtered to "open", severity chips loud.

**Workflow.** Report → routed by severity (minor → class teacher resolves inline; major → review queue) → sanction recorded (suspension auto-reflects in attendance views with a distinct status) → parent notified per matrix → resolved → conduct tab + (per template) report card conduct section.

**Actions.** Log, escalate, resolve-with-note, award merit; parent: view resolved incidents (policy-dependent), acknowledge.

**Dashboards & summaries.** Incidents by category/class trend; repeat-pattern flags ("3rd incident this term — pattern card on the student profile"); merit leaderboard (school's choice).

**Setup screens.** Categories/severities/escalation before first report (template set offered).

**The professional difference.** A corridor-speed report form and severity-routing — discipline systems fail when logging an incident takes longer than the incident.

---

## 4.15 Documents & Records

**Pages.** Document settings (types, required-at-admission, parent-visible flags); per-student/staff Documents tabs (slot-based: each required type renders as a labeled slot — empty, uploaded-pending-verify, verified ✓); school document library; expiring-documents worklist.

**First sight.** The slots. A student's Documents tab reads like a checklist ("Birth certificate ✓ · Immunization ⬜ upload · Previous results ✓") — completeness is visually obvious without counting.

**Workflow.** Upload (drag/camera) → pending chip → staff verifies → ✓; admissions shows the same slots inside the application flow; generated artifacts (report cards, receipts) auto-file with a distinct "system" badge; expiring staff certs surface in a worklist + reminder.

**The professional difference.** Slot-based requirements turn "do we have Ada's paperwork?" from a filing-cabinet question into a glance.

---

## 4.16 Reports & Analytics Hub

**Pages.** One **Reports** hub: report cards (tiles) grouped by domain (Attendance · Academic · Finance · Enrollment · Staff · Platform), each tile → parameter bar (always: year/term from the scope pill; plus class/date-range as relevant) → rendered report → Export/Print/Schedule. A **Schedules** tab ("Daily cash report → bursar's email, 4pm").

**First sight.** The permission-filtered tile grid — a bursar sees finance tiles, a class teacher sees their arm's tiles. Recently-run and pinned reports float to top.

**Dashboards vs reports — the design rule.** Dashboards answer "now/today" with live widgets; the hub answers "this term/this period" with parameterized, exportable documents. Every dashboard widget links to its corresponding hub report ("see full report →") — that link is the connective tissue users feel.

**The professional difference.** Every number in the product is two clicks from a printable, parameterized, exportable document — and the scheduled-delivery tab means the principal's Monday digest arrives without anyone remembering to run it.

---

## 4.17 Role Dashboards (the payoff screens)

Specified throughout Part III; the design contract:

- **Card registry pattern:** dashboards are grids of registered cards; each card has a live state, an empty/prerequisite state, and a deep link. Cards appear as modules go live — dashboards grow with the school.
- **Admin Home cards:** Attendance today (live %) · Registers missing (names) · Fees this week (collected/outstanding bar) · Approvals (count → inbox) · Setup (until done) · Alerts (gateway, sync) · Upcoming events · Latest announcement read-rate.
- **Principal Home:** KPI strip (enrollment, attendance trend, collection %, results progress) · Approval inbox preview · Chronic-absence digest · Defaulter escalations · Announce shortcut.
- **Bursar Home:** Today's takings (by method, live) · Verification queue · Defaulters summary · Gateway status · Daily Cash shortcut.
- **Teacher Today:** period cards (current pulsing) · unmarked nudges · score-deadline progress · my announcements; CT extra: arm snapshot + worklists.
- **Parent Home:** per-child stack — balance card with Pay · attendance this week strip · latest result/report · announcements; alerts float to top as dismissible banners.
- **Invitation/user-stat widgets** move to People; they were never dashboard material.

---

# PART V — MOBILE & RESPONSIVE STRATEGY

1. **Device truth per role:** Parent = phone (design at 360px, desktop is the adaptation) · Teacher = phone for Today/register/inbox, desktop for score grids · Admin/Bursar/EO = desktop (tables, builders), with a deliberately reduced phone surface (dashboards, approvals, defaulter drawer, announcement composer) · Student = phone.
2. **Bottom tabs for phone roles, sidebar for desktop roles** — not one nav squeezed both ways.
3. **Thumb-zone actions:** register marking, Pay button, approve/return — all bottom-anchored on phone.
4. **Offline as a designed state:** register fully offline-capable with a sync badge; elsewhere, cached data shows with a "stale" timestamp chip rather than a global yellow banner; actions queue where safe, disable honestly where not.
5. **Push notifications** (PWA): opt-in prompts contextual ("Get an alert if Ada is marked absent?") not generic; categories mirror Inbox filters.
6. **Tables on phone** collapse to card lists with the 2–3 most important fields + chevron to detail — the Workbench Table ships with this card-mode built in.
7. **Print is a first-class output** (report cards, broadsheets, timetables, receipts, statements): dedicated print stylesheets, school-branded headers, no UI chrome.

---

# PART VI — UX ROLLOUT SEQUENCE (design-led, value-first)

Ordered for perceived transformation per unit of work, assuming the backend follows:

**Wave 1 — The platform learns to speak (global layer).**
Design system consolidation (chips, Workbench Table, Detail Page, wizard, empty states) · topbar (search ⌘K, scope pill, bell, approvals chip) · navigation IA restructure for all roles. *The product feels different everywhere at once.*

**Wave 2 — First impressions.**
Onboarding checklist + welcome journey · Settings hub (Identity/Locale live, other panels as placeholders-with-purpose) · role dashboard rebuilds (cards on the registry pattern, sources arriving over time).

**Wave 3 — The daily loops.**
Register refinements + offline + admin Attendance Operations + parent absence/excuse loop · bursar fast-payment modal + receipts + parent Pay flow + family balance home.

**Wave 4 — The term's spine.**
Grading scheme builder + score-entry grid + results matrix + moderation loop · report card template live-preview + generation console + parent viewer + approval inbox.

**Wave 5 — The relationship layer.**
Student 360° profile (tabs lighting up) · announcements + Inbox + notification center + preferences · defaulters worklist + dunning visibility.

**Wave 6 — Completion.**
Timetable consumer views + substitution board · admissions pipeline + documents slots + discipline · Reports hub + schedules · student portal shell.

---

## Closing: the eight-question test

Before any screen ships, it passes this checklist — the distilled version of everything above:

1. Does the user's **first glance** answer "what needs me?" before "what exists"?
2. Is every **prerequisite** named and linked the moment it blocks something?
3. Does every entity mentioned have a **home page**, and is every mention a link?
4. Is the thing's **lifecycle state** visible, with who-holds-the-ball obvious?
5. Can the workflow be completed on the **device this role actually carries**?
6. Does completing the workflow produce a **visible consequence** (notification, dashboard tick, timeline entry) somewhere another human sees?
7. Could the school **recognize itself** (crest, names, its own categories and policies) on this screen?
8. If the data is empty, wrong, or offline — is the screen still **honest and helpful**?

A screen that passes all eight feels like Playground. A screen that fails three feels like CRUD. That is the entire difference, and it is a design discipline, not a feature count.
