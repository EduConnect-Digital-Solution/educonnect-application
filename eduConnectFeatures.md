# EduConnect — Feature List

Status tags: ✅ Live now  🚧 Partially built  📋 Planned (placeholder screen only, not functional yet)

---

## Authentication & Account Setup
- ✅ Log in as Admin, Teacher, or Parent
- ✅ Register a new school (multi-step: school info, location, admin account)
- ✅ Upload school logo during registration
- ✅ Verify school email via OTP
- ✅ Forgot password / reset password via emailed OTP
- ✅ Complete registration as an invited teacher or parent
- ✅ Log out (with confirmation)

## Platform-Wide
- ✅ Install app to home screen (PWA)
- ✅ Get notified when a new app version is available
- ✅ See offline/online connection status
- ✅ Switch light/dark theme
- ✅ Global search (⌘K) across students, staff, guardians, classes, subjects, invoices
- ✅ Switch active academic year/term (scopes all data app-wide)

---

## Admin Dashboard

### Dashboard Home
- ✅ View total users, active users, students, and pending invitations
- ✅ View recent activity (new registrations, new students, invitations sent)
- ✅ Resend or cancel a pending user invitation
- ✅ Quick-launch: register a student / invite a teacher / invite a parent

### Onboarding
- ✅ Complete guided setup checklist for a new school
- ✅ Preview sample/demo data before going live
- ✅ Mark school as "live"

### Students
- ✅ View student directory (search/filter/sort)
- ✅ Add a new student
- ✅ View student profile (bio data, guardians, assigned teachers)
- ✅ Edit student details
- ✅ Activate / deactivate a student
- ✅ Remove a student
- 🚧 View student's attendance/results/fees from their profile (tabs exist, awaiting linked modules)

### Guardians
- ✅ View guardian directory
- ✅ Invite a guardian
- ✅ View guardian profile
- ✅ Link / unlink a guardian to student(s)
- ✅ Activate / deactivate / remove a guardian

### Staff / Teachers
- ✅ View staff directory
- ✅ Invite a teacher
- ✅ View staff profile
- ✅ Assign / unassign classes to a teacher
- ✅ Assign subjects to a teacher
- ✅ Activate / deactivate / remove a staff member

### Admissions
- 📋 Manage applicant pipeline (application → review → offer → enrolled) — not yet built

### Classes & Subjects
- ✅ Create class levels and arms/streams
- ✅ Rename or delete a class/arm
- ✅ Assign subjects to a class arm (or copy from another arm)
- ✅ Set up school subject catalogue (auto-generate or add manually)
- ✅ Edit / delete a subject

### Timetables & Calendar
- ✅ Create/edit academic years and terms
- ✅ Set active academic year/term
- ✅ Build a class timetable (drag-and-drop)
- ✅ Detect and resolve scheduling conflicts
- ✅ Publish a timetable
- ✅ Duplicate a timetable to another class
- ✅ View / print / export a timetable
- ✅ Create school events and holidays on a calendar
- ✅ Send notifications tied to an event

### Grading & Results
- ✅ Create/edit grading scales (e.g., A1–F9)
- ✅ Set a default grading scheme
- ✅ Track teacher grading progress by class/subject (submission matrix)
- ✅ View compiled grade broadsheet per class
- ✅ Export broadsheet to Excel
- ✅ Run pre-publish checklist and publish results (locks grades)
- ✅ Bulk-generate result slip PDFs
- ✅ Define assessment policy (CA components + exam weighting)
- ✅ Assign assessment policy by school/class/arm/subject
- ✅ Grant teachers permission to create their own assessment policies
- ✅ Configure report card template
- ✅ Track required report card comments
- ✅ Generate → sign off → publish report cards to parents

### Fees & Finance
- ✅ View finance overview (collected/outstanding/collection rate)
- ✅ Create a fee structure (line items, one-time or installment plans)
- ✅ Publish a fee structure (auto-generates invoices)
- ✅ Clone a fee structure to another term/class
- ✅ View / search all invoices
- ✅ View invoice detail (line items, payment history)
- ✅ Record a manual payment (cash/bank/POS/cheque)
- ✅ Process an online payment (Paystack/Flutterwave/Remita)
- ✅ Record a partial payment
- ✅ Void an invoice
- ✅ Apply a fee adjustment (discount/waiver/correction) with reason
- ✅ View/search all payments
- ✅ View and print a digital receipt
- ✅ Email/SMS a receipt to a parent
- ✅ View a student's fee ledger (running balance)
- ✅ View arrears aging report
- ✅ View collection trend chart
- ✅ Export outstanding balances (CSV)
- 📋 Defaulters worklist with bulk reminders — not yet built

### Attendance (Admin View)
- 📋 School-wide attendance tiles/registers — not yet built (admins currently rely on Teacher-side attendance)

### Communication
- 📋 Compose and broadcast announcements — not yet built
- 📋 View cross-channel message delivery log — not yet built
- ✅ Send notifications via the Events calendar (interim solution)

### Reports
- 📋 Unified report hub (attendance/academics/finance/enrollment) — not yet built
- ✅ Finance-specific reports available today (see Fees & Finance)

### Approvals
- ✅ Central approvals inbox (approve/return items with comments and audit trail) — populates as each module's workflow goes live

### Settings
- ✅ Edit school identity/branding (name, contact, address, description)
- ✅ Request school activation/deactivation
- ✅ Manage grading schemes, assessment policies, and teacher grading permissions
- ✅ Edit own admin profile (name, phone, photo)
- 📋 Locale, attendance policy, roles & permissions, audit log, data import — not yet built

---

## Teacher Dashboard
- ✅ View dashboard overview (student/class/subject counts)
- ✅ View list of assigned students (searchable) or per-class chart view
- ✅ View recent activity feed
- ✅ View list of assigned classes
- ✅ View class/subject roster with latest scores and grades
- ✅ View a student's detail/analytics profile
- ✅ View today's class schedule with attendance status
- ✅ Mark attendance (present/absent/late + reason)
- ✅ Bulk-mark attendance ("mark all present", multi-select)
- ✅ Save attendance as draft
- ✅ Submit attendance (locks the register)
- ✅ Reopen and edit a submitted attendance register
- ✅ View active grading/assessment policy for a class/subject
- ✅ Add a new assessment (test/quiz/exam)
- ✅ Edit / view / delete an assessment
- ✅ Enter student scores for an assessment
- ✅ View grading history for a class/subject/term
- ✅ Create/edit own assessment policy (if granted permission)
- ✅ Assign assessment policy scope (class/arm/subject)
- ✅ Delete own assessment policy
- ✅ View own profile and workload (assigned classes)
- 📋 Upload lessons / create quiz — coming soon
- 📋 Message parent directly / generate report card from student profile — presentational only, not yet wired

## Parent Dashboard
- ✅ View dashboard overview (children count, enrollment status)
- ✅ View notifications (with unread count and history)
- ✅ View list of children
- ✅ View a child's detailed profile (academic, demographic, contact info)
- ✅ Switch between children when viewing fees (multi-child households)
- ✅ View fee summary (total, paid, outstanding, due date)
- ✅ View payment progress bar
- ✅ View itemized fee breakdown
- ✅ View payment timeline and history
- ✅ Pay outstanding fees online (Flutterwave/Paystack/Remita)
- ✅ Download/print invoice, fee schedule, receipt, payment statement
- ✅ View own profile
- ✅ Edit own profile (contact info, address, occupation, emergency contact)
- 📋 View academic progress / performance trends — coming soon
- 📋 Contact teachers directly — coming soon
