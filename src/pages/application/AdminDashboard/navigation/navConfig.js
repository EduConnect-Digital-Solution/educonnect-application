import {
    Home,
    Users,
    GraduationCap,
    ClipboardCheck,
    Wallet,
    Megaphone,
    BarChart3,
    Settings,
} from 'lucide-react';

/**
 * navConfig — the single source of truth for the Admin IA.
 *
 * Consumed by:
 *   • AdminLayout sidebar (groups, ordering, Settings pinned separately)
 *   • CommandPalette (flat searchable page index, incl. settings panels)
 *   • Route redirects (legacy → canonical paths)
 *
 * Organized by job-to-be-done, not by database entity.
 */

const BASE = '/dashboard/admin';

export const ROUTES = {
    home:            `${BASE}`,
    setup:           `${BASE}/setup`,

    students:        `${BASE}/people/students`,
    guardians:       `${BASE}/people/guardians`,
    staff:           `${BASE}/people/staff`,
    admissions:      `${BASE}/people/admissions`,

    classes:         `${BASE}/academics/classes`,
    subjects:        `${BASE}/academics/subjects`,
    grading:         `${BASE}/academics/grading`,
    reportCards:     `${BASE}/academics/report-cards`,
    timetables:      `${BASE}/academics/timetables`,
    timetableView:   `${BASE}/academics/timetables/view`,
    timetableBuilder:`${BASE}/academics/timetables/builder`,

    attendance:      `${BASE}/attendance`,

    financeOverview: `${BASE}/finance/overview`,
    feeStructures:   `${BASE}/finance/structures`,
    invoices:        `${BASE}/finance/invoices`,
    payments:        `${BASE}/finance/payments`,
    defaulters:      `${BASE}/finance/defaulters`,
    financeReports:  `${BASE}/finance/reports`,

    announcements:   `${BASE}/communication/announcements`,
    events:          `${BASE}/communication/events`,
    deliveryLogs:    `${BASE}/communication/delivery-logs`,

    reports:         `${BASE}/reports`,
    approvals:       `${BASE}/approvals`,

    settings:        `${BASE}/settings`,
    settingsIdentity:           `${BASE}/settings/identity`,
    settingsAcademic:           `${BASE}/settings/academic`,
    settingsGradingSetup:       `${BASE}/settings/grading`,

    adminProfile:    `${BASE}/profile`,
};

/** Sidebar groups (Settings intentionally excluded — it renders pinned at the bottom). */
export const NAV_GROUPS = [
    {
        name: 'Home',
        icon: Home,
        link: ROUTES.home,
        exact: true,
    },
    {
        name: 'People',
        icon: Users,
        base: `${BASE}/people`,
        children: [
            { name: 'Students',   link: ROUTES.students },
            { name: 'Guardians',  link: ROUTES.guardians },
            { name: 'Staff',      link: ROUTES.staff },
            { name: 'Admissions', link: ROUTES.admissions },
        ],
    },
    {
        name: 'Academics',
        icon: GraduationCap,
        base: `${BASE}/academics`,
        children: [
            { name: 'Classes & Arms',    link: ROUTES.classes },
            { name: 'Subjects',          link: ROUTES.subjects },
            { name: 'Grading & Results', link: ROUTES.grading },
            { name: 'Report Cards',      link: ROUTES.reportCards },
            { name: 'Timetables',        link: ROUTES.timetables },
        ],
    },
    {
        name: 'Attendance',
        icon: ClipboardCheck,
        link: ROUTES.attendance,
    },
    {
        name: 'Finance',
        icon: Wallet,
        base: `${BASE}/finance`,
        children: [
            { name: 'Overview',       link: ROUTES.financeOverview },
            { name: 'Fee Structures', link: ROUTES.feeStructures },
            { name: 'Invoices',       link: ROUTES.invoices },
            { name: 'Payments',       link: ROUTES.payments },
            // { name: 'Defaulters',     link: ROUTES.defaulters },
            { name: 'Reports',        link: ROUTES.financeReports },
        ],
    },
    {
        name: 'Communication',
        icon: Megaphone,
        base: `${BASE}/communication`,
        children: [
            { name: 'Announcements', link: ROUTES.announcements },
            { name: 'Events',        link: ROUTES.events },
            { name: 'Delivery Logs', link: ROUTES.deliveryLogs },
        ],
    },
    {
        name: 'Reports',
        icon: BarChart3,
        link: ROUTES.reports,
    },
];

export const SETTINGS_NAV = {
    name: 'Settings',
    icon: Settings,
    link: ROUTES.settings,
    base: ROUTES.settings,
};

/**
 * Flat page index for the command palette.
 * `keywords` cover synonyms and the old names users may still reach for.
 */
export const PAGE_INDEX = [
    { label: 'Home',                group: 'Navigation', route: ROUTES.home,             keywords: 'dashboard overview' },
    { label: 'Students',            group: 'Navigation', route: ROUTES.students,         keywords: 'people pupils learners user management' },
    { label: 'Guardians',           group: 'Navigation', route: ROUTES.guardians,        keywords: 'parents family people' },
    { label: 'Staff',               group: 'Navigation', route: ROUTES.staff,            keywords: 'teachers employees people user management' },
    { label: 'Admissions',          group: 'Navigation', route: ROUTES.admissions,       keywords: 'applications enrol enroll intake' },
    { label: 'Classes & Arms',      group: 'Navigation', route: ROUTES.classes,          keywords: 'class setup sections streams config' },
    { label: 'Subjects',            group: 'Navigation', route: ROUTES.subjects,         keywords: 'subject setup curriculum config' },
    { label: 'Grading & Results',   group: 'Navigation', route: ROUTES.grading,          keywords: 'scores grades assessment exams marks schemes submission matrix broadsheet publish results positions average' },
    { label: 'Report Cards',        group: 'Navigation', route: ROUTES.reportCards,      keywords: 'results terminal report template builder comments traits sign off principal publish parents print' },
    { label: 'Timetables',          group: 'Navigation', route: ROUTES.timetables,       keywords: 'timetable library schedule periods' },
    { label: 'Timetable Builder',   group: 'Navigation', route: ROUTES.timetableBuilder, keywords: 'timetable builder schedule editor config' },
    { label: 'Attendance',          group: 'Navigation', route: ROUTES.attendance,       keywords: 'register absent present roll call' },
    { label: 'Finance Overview',    group: 'Navigation', route: ROUTES.financeOverview,  keywords: 'fees money collections' },
    { label: 'Fee Structures',      group: 'Navigation', route: ROUTES.feeStructures,    keywords: 'fees tuition billing setup' },
    { label: 'Invoices',            group: 'Navigation', route: ROUTES.invoices,         keywords: 'fees bills billing' },
    { label: 'Payments',            group: 'Navigation', route: ROUTES.payments,         keywords: 'fees ledger receipts transactions' },
    { label: 'Defaulters',          group: 'Navigation', route: ROUTES.defaulters,       keywords: 'fees owing overdue debtors' },
    { label: 'Finance Reports',     group: 'Navigation', route: ROUTES.financeReports,   keywords: 'fees aging collections reconciliation' },
    { label: 'Announcements',       group: 'Navigation', route: ROUTES.announcements,    keywords: 'broadcast circular message communication' },
    { label: 'Events',              group: 'Navigation', route: ROUTES.events,           keywords: 'events planner calendar communication' },
    { label: 'Delivery Logs',       group: 'Navigation', route: ROUTES.deliveryLogs,     keywords: 'notifications sent log communication' },
    { label: 'Reports',             group: 'Navigation', route: ROUTES.reports,          keywords: 'analytics exports hub' },
    { label: 'My Profile',          group: 'Navigation', route: ROUTES.adminProfile,     keywords: 'account me admin profile' },
    { label: 'Approvals',           group: 'Navigation', route: ROUTES.approvals,        keywords: 'sign off review waiting queue inbox' },
    { label: 'Setup Checklist',     group: 'Navigation', route: ROUTES.setup,            keywords: 'onboarding getting started setup welcome go live' },

    { label: 'Settings',                       group: 'Settings', route: ROUTES.settings,         keywords: 'configuration preferences' },
    { label: 'Settings · Identity & Branding',      group: 'Settings', route: ROUTES.settingsIdentity,           keywords: 'school profile logo name address contact deactivate' },
    { label: 'Settings · Academic Calendar',         group: 'Settings', route: ROUTES.settingsAcademic,           keywords: 'calendar years terms sessions config' },
    { label: 'Settings · Grading & Assessment',      group: 'Settings', route: ROUTES.settingsGradingSetup, keywords: 'grading scheme scale bands grade points assessment policy ca exam marks breakdown continuous components setup' },
];

/** Legacy paths → canonical paths (mounted as <Navigate replace> routes). */
export const LEGACY_REDIRECTS = [
    { from: `${BASE}/users`,             to: ROUTES.students },
    { from: `${BASE}/users/teachers`,    to: ROUTES.staff },
    { from: `${BASE}/users/parents`,     to: ROUTES.guardians },
    { from: `${BASE}/users/students`,    to: ROUTES.students },

    { from: `${BASE}/fees`,              to: ROUTES.financeOverview },
    { from: `${BASE}/fees/overview`,     to: ROUTES.financeOverview },
    { from: `${BASE}/fees/structures`,   to: ROUTES.feeStructures },
    { from: `${BASE}/fees/invoices`,     to: ROUTES.invoices },
    { from: `${BASE}/fees/payments`,     to: ROUTES.payments },
    { from: `${BASE}/fees/reports`,      to: ROUTES.financeReports },

    { from: `${BASE}/config`,            to: ROUTES.subjects },
    { from: `${BASE}/config/subjects`,   to: ROUTES.subjects },
    { from: `${BASE}/config/classes`,    to: ROUTES.classes },
    { from: `${BASE}/config/calendar`,   to: ROUTES.settingsAcademic },
    { from: `${BASE}/config/timetable`,  to: ROUTES.timetableBuilder },
    { from: `${BASE}/timetable-library`, to: ROUTES.timetables },

    { from: `${BASE}/school-profile`,    to: ROUTES.settingsIdentity },
    { from: `${BASE}/events-planner`,    to: ROUTES.events },

    { from: `${BASE}/people`,            to: ROUTES.students },
    { from: `${BASE}/academics`,         to: ROUTES.classes },
    { from: `${BASE}/finance`,           to: ROUTES.financeOverview },
    { from: `${BASE}/communication`,     to: ROUTES.announcements },
];
