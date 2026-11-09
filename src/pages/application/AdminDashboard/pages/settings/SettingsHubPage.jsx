import React from 'react';
import { Link } from 'react-router-dom';
import {
    School, CalendarDays, Globe2, ClipboardCheck, Wallet, MessagesSquare,
    BellRing, ShieldCheck, FolderArchive, DatabaseZap, ScrollText, ChevronRight,
    SplitSquareVertical,
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { ROUTES } from '../../navigation/navConfig.js';

/**
 * SettingsHubPage — the configuration home. Live sections link through;
 * upcoming sections are visible (so admins learn where things will live)
 * but clearly marked and not clickable. No dead links.
 */
const SECTIONS = [
    {
        icon: School,
        title: 'Identity & Branding',
        description: 'School name, contact details, type, and status — the identity on everything parents see.',
        to: ROUTES.settingsIdentity,
        live: true,
    },
    {
        icon: CalendarDays,
        title: 'Academic Calendar',
        description: 'Academic years and terms — the calendar every module runs on.',
        to: ROUTES.settingsAcademic,
        live: true,
    },
    {
        icon: SplitSquareVertical,
        title: 'Grading & Assessment',
        description: 'Set up grading schemes (grade bands & points) and assessment policies (CA components, exam weights, and where each policy applies).',
        to: ROUTES.settingsGradingSetup,
        live: true,
    },
    {
        icon: Globe2,
        title: 'Locale',
        description: 'Currency, timezone, and date formats.',
        live: false,
    },
    {
        icon: ClipboardCheck,
        title: 'Attendance Policy',
        description: 'Per-period vs daily marking, late grace, edit windows, and parent alerts.',
        live: false,
    },
    {
        icon: Wallet,
        title: 'Finance',
        description: 'Fee categories, late-fee and discount policies, payment gateways, and receipts.',
        live: false,
    },
    {
        icon: MessagesSquare,
        title: 'Communication',
        description: 'Email, SMS, and WhatsApp channels, sender identity, and message templates.',
        live: false,
    },
    {
        icon: BellRing,
        title: 'Notifications',
        description: 'Which events notify whom, on which channels, by default.',
        live: false,
    },
    {
        icon: ShieldCheck,
        title: 'Roles & Permissions',
        description: 'Who can view, edit, approve, and export — per module.',
        live: false,
    },
    {
        icon: FolderArchive,
        title: 'Documents',
        description: 'Document types, admission requirements, and retention.',
        live: false,
    },
    {
        icon: DatabaseZap,
        title: 'Data & Import',
        description: 'Bulk CSV import for students, guardians, and staff; exports and backups.',
        live: false,
    },
    {
        icon: ScrollText,
        title: 'Audit Log',
        description: 'Who changed what, when — across the whole platform.',
        live: false,
    },
];

export default function SettingsHubPage() {
    return (
        <AdminLayout>
            <div className="mx-auto px-2 py-4">
                <div className="mb-7">
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {SECTIONS.map(section => {
                        const Icon = section.icon;
                        const card = (
                            <div
                                className={`relative h-full p-5 rounded-2xl border bg-white transition-all ${
                                    section.live
                                        ? 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer group'
                                        : 'border-gray-100 opacity-70'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className={`p-2.5 rounded-xl ${section.live ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-300'}`}>
                                        <Icon size={20} />
                                    </div>
                                    {section.live ? (
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-600">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Live
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
                                            Coming soon
                                        </span>
                                    )}
                                </div>
                                <h3 className={`mt-4 text-sm font-bold ${section.live ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {section.title}
                                </h3>
                                <p className={`mt-1 text-xs leading-relaxed ${section.live ? 'text-gray-500' : 'text-gray-300'}`}>
                                    {section.description}
                                </p>
                                {section.live && (
                                    <ChevronRight
                                        size={15}
                                        className="absolute bottom-5 right-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all"
                                    />
                                )}
                            </div>
                        );

                        return section.live
                            ? <Link key={section.title} to={section.to}>{card}</Link>
                            : <div key={section.title}>{card}</div>;
                    })}
                </div>
            </div>
        </AdminLayout>
    );
}
