# Pattern Library — Platform Design-System Contracts

Every module — current and future — builds from these primitives. **Never build a
one-off table, status badge, modal-as-detail-view, or spinner.** A user who learns
Students must instantly understand Invoices, Staff, Attendance, and Report Cards.

Import from the barrel: `import { StatusChip, WorkbenchTable, … } from '../../components/patterns'`

| Pattern | Rule it encodes |
|---|---|
| `StatusChip` | One color vocabulary: gray=draft/inactive · blue=in-progress/partial · amber=pending/awaiting · green=done/published/paid · red=overdue/failed/rejected · purple=scheduled. Map new statuses in `STATUS_TONES`, never inline-style a status. |
| `WorkbenchTable` | THE list page: sticky header, sort, search, filter chips, bulk select + floating action bar, density, pagination, skeletons, export, column visibility, saved views, total count. **Row click opens a detail page — never a modal.** |
| `DetailPage` | THE detail layout: header (avatar · name · ID · status · breadcrumb · actions · overflow), 3–5 stat strip, content tabs, desktop right rail (metadata/timeline/notes). |
| `Wizard` | Multi-step flows: named steps, numbered + checkmarked progress, Save & Exit with resume (localStorage), auto review step, success screen. One major decision per step. |
| `ApprovalInbox` | Approvals are a destination, not module easter eggs. Grouped by type, expandable cards, Approve / Return-with-comment, bulk approve, history. Every decision records who/when/why. |
| `EmptyState` | No blank screens. `first-use` (what + why + named, linked prerequisite), `filtered` (clear filters), `error` (retry). |
| `FormKit` | ≤5 fields → `Drawer`/modal; more → page with `FormSection`s or a Wizard. Validate on blur (`useFieldErrors`), errors beside fields (`Field`), drafts autosave (`useFormDraft`). Toasts never carry validation errors. |
| `useKeyboardGrid` | Spreadsheet-style entry for scores/attendance: arrows/Tab/Enter navigation, Excel paste. Never edit-row→modal→save→repeat. |
| `ConfirmDestructiveDialog` | Destructive actions: confirm + type the record name + reason. The reason goes to audit history. |
| `Timeline` | The lifecycle trail (created → submitted → returned → approved → published). Every entry: user, timestamp, action, comment. |
| `ToastHost` / `pushToast` | Toasts only confirm (`Invoice created · Undo`). Critical errors render inline on the page. Bulk/destructive actions offer Undo where feasible. |
| `Skeletons` | Skeleton-first loading (`TableSkeleton`, `DetailSkeleton`, `DashboardSkeleton`, `CardGridSkeleton`). The branded full-screen loader is for app boot only. |

**Migrated to the design system (admin dashboard):**
- Lists on `WorkbenchTable`: Students, Staff, Guardians, Fee Invoices, Fee Payments.
- Detail pages on `DetailPage`: Student, Staff, Guardian, Invoice, Payment.
- `ApprovalInbox`: `pages/ApprovalsPage.jsx` (topbar chip destination).
- `StatusChip`: student/staff/guardian states, invoice + payment statuses, fee-structure status.
- Skeletons replaced spinners on: admin Dashboard, all 5 fee pages, School Profile.
- `pushToast` is the standard: Student/Staff/Guardian/Invoice/Payment flows, QuickActions,
  Dashboard invitations, Admin Profile, School Profile, all fee pages/tabs.

**Known exceptions / remaining (documented):**
- `CreateStudentModal` — approved legacy exception; left as-is, only bridged to `pushToast`.
- `useKeyboardGrid` primitive is ready; rollout to **score entry** (`TeacherDashboard/ClassStudents.jsx`)
  and **attendance entry** (`TeacherDashboard/attendance/AttendanceRegister.jsx`) lands with the
  teacher-module rebuilds (roadmap WP 1.4 / 1.8), since both are teacher-dashboard surfaces outside
  the admin design-system pass.
- Legacy `Toast.jsx` still used by non-admin surfaces (auth pages, teacher/parent dashboards);
  migrate when those sections are modernized. `components/ui/Toast.jsx` is deprecated.
- Repo eslint config lacks `eslint-plugin-react`, so renamed icon params used only in JSX
  (`icon: Icon` → `<Icon/>`) false-flag as unused. Pre-existing repo-wide; not introduced here.
