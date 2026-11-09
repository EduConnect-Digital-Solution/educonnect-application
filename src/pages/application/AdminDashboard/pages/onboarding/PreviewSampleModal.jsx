import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FlaskConical, GraduationCap, Wallet, ClipboardCheck, FileBadge } from 'lucide-react';
import { getSampleSchoolData } from '../../services/onboardingAPIs.js';
import { StatusChip } from '../../../../../components/patterns';

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

const TABS = [
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'fees', label: 'Fees', icon: Wallet },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'reports', label: 'Reports', icon: FileBadge },
];

/**
 * PreviewSampleModal — read-only "Preview Filled School" using clearly-labelled
 * demo data. For sales demos, training, and admin confidence. Never written anywhere.
 */
export default function PreviewSampleModal({ onClose }) {
    const [tab, setTab] = useState('students');
    const data = getSampleSchoolData();

    return createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Preview — a filled school</h2>
                        <p className="text-[12px] text-gray-400 mt-0.5">See what EduConnect looks like once your school is up and running.</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100"><X size={18} /></button>
                </div>

                {/* Demo-data banner */}
                <div className="flex items-center gap-2 px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-[12px] font-bold text-amber-700">
                    <FlaskConical size={14} /> DEMO DATA — nothing here is real. This is sample content for preview only.
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-4 border-b border-gray-100">
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`relative flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-semibold transition-colors ${tab === t.id ? 'text-blue-700' : 'text-gray-500 hover:text-gray-800'}`}>
                            <t.icon size={14} /> {t.label}
                            {tab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-blue-600 rounded-full" />}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5">
                    {tab === 'students' && (
                        <Table head={['Name', 'Class', 'Arm', 'Gender', 'Guardian']}
                            rows={data.students.map(s => [s.name, s.class, s.arm, s.gender, s.guardian])} />
                    )}
                    {tab === 'fees' && (
                        <Table head={['Student', 'Structure', 'Amount', 'Paid', 'Status']}
                            rows={data.fees.map(f => [f.student, f.structure, naira(f.amount), naira(f.paid),
                                <StatusChip key={f.id} status={f.status} />])} />
                    )}
                    {tab === 'attendance' && (
                        <Table head={['Class', 'Date', 'Present', 'Absent', 'Late', 'Rate']}
                            rows={data.attendance.map(a => [a.class, a.date, a.present, a.absent, a.late, `${a.rate}%`])} />
                    )}
                    {tab === 'reports' && (
                        <Table head={['Report', 'Students', 'Status']}
                            rows={data.reports.map(r => [r.title, r.students, <StatusChip key={r.id} status={r.status} />])} />
                    )}
                </div>

                <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/60 text-right">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700">
                        Got it — let's build the real thing
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function Table({ head, rows }) {
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                    <tr>{head.map(h => <th key={h} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {rows.map((cells, i) => (
                        <tr key={i} className="hover:bg-gray-50/60">
                            {cells.map((c, j) => <td key={j} className="px-4 py-2.5 text-gray-700">{c}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
