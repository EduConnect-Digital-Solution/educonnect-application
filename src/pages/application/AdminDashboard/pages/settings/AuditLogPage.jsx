import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import SettingsBreadcrumb from '../../components/ui/SettingsBreadcrumb.jsx';
import { listAuditLogs, exportAuditLogCsv } from '../../services/schoolSettingsAPIs.js';
import { formatSchoolDateTime } from '../../../../../utils/schoolLocale.js';
import { notify } from '@/components/patterns/toastBus.js';
import { TableSkeleton, EmptyState } from '../../../../../components/patterns';

const fieldClass = 'px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300';

const ACTION_WORDS = {
    'school.profile.update': 'Updated the school profile',
    'school.admin.update': 'Updated the admin profile',
    'school.logo.update': 'Changed the school logo',
    'school.go-live': 'Marked the school live',
    'settings.update': 'Changed school settings',
    'fees.structure.create': 'Created a fee structure',
    'fees.structure.update': 'Edited a fee structure',
    'fees.structure.delete': 'Deleted a fee structure',
    'fees.structure.clone': 'Copied a fee structure',
    'fees.structure.transition': 'Published or reverted a fee structure',
    'fees.invoice.create': 'Created an invoice',
    'fees.invoice.generate': 'Generated invoices',
    'fees.invoice.void': 'Voided an invoice',
    'fees.payment.record': 'Recorded a payment',
    'fees.adjustment.create': 'Made a fee adjustment',
    'fees.reconciliation.import': 'Imported bank settlements',
    'fees.gateway.update': 'Changed payment gateway settings',
    'grading.scale.create': 'Created a grading scale',
    'grading.scale.update': 'Edited a grading scale',
    'grading.scale.delete': 'Deleted a grading scale',
    'grading.scale.default': 'Set the default grading scale',
    'grading.scale.assign': 'Assigned a grading scale to classes',
    'grading.band.add': 'Added a grade band',
    'grading.band.update': 'Edited a grade band',
    'grading.band.delete': 'Deleted a grade band',
    'assessment.policy.create': 'Created an assessment policy',
    'assessment.policy.update': 'Edited an assessment policy',
    'assessment.policy.delete': 'Deleted an assessment policy',
    'assessment.policy.assign': 'Assigned an assessment policy',
    'assessment.policy.unassign': 'Removed an assessment policy assignment',
    'assessment.permission.grant': 'Gave a teacher policy permission',
    'assessment.permission.revoke': 'Removed a teacher policy permission',
    'assessment.submission.approve': 'Approved a score sheet',
    'assessment.submission.return': 'Returned a score sheet',
    'assessment.submission.force-return': 'Force-returned a score sheet',
    'results.publish': 'Published results',
    'report-cards.template.update': 'Changed the report card template',
    'report-cards.generate': 'Generated report cards',
    'report-cards.sign-off': 'Signed off report cards',
    'report-cards.publish': 'Published report cards to parents',
    'invitation.teacher': 'Invited a teacher',
    'invitation.parent': 'Invited a parent',
    'invitation.resend': 'Resent an invitation',
    'invitation.cancel': 'Cancelled an invitation',
    'invitation.delete': 'Deleted an invitation',
    'user.toggle-status': 'Activated or deactivated a user',
    'user.remove': 'Removed a user',
    'parent.link-students': 'Linked students to a parent',
    'parent.unlink-students': 'Unlinked students from a parent',
    'parent.remove': 'Removed a parent',
    'student.create': 'Added a student',
    'student.update': 'Edited a student',
    'student.toggle-status': 'Activated or deactivated a student',
    'student.remove': 'Removed a student',
    'student.assign-class': 'Assigned students to a class',
    'student.unassign-class': 'Removed students from a class',
    'teacher.assign-classes': 'Assigned classes to a teacher',
    'teacher.assign-subjects': 'Assigned subjects to a teacher',
    'teacher.remove-classes': 'Removed classes from a teacher',
    'admissions.decision': 'Decided an application',
    'admissions.admit': 'Admitted an applicant',
    'admissions.delete': 'Deleted an application',
    'academic.year.create': 'Created an academic year',
    'academic.year.set-current': 'Set the current academic year',
    'academic.year.delete': 'Deleted an academic year',
    'academic.term.create': 'Created a term',
    'academic.term.set-current': 'Set the current term',
    'academic.term.delete': 'Deleted a term',
    'class.create': 'Created classes',
    'class.delete': 'Deleted a class',
    'timetable.publish': 'Published a timetable',
    'timetable.copy': 'Copied a timetable',
    'timetable.update': 'Edited a published timetable',
    'timetable.delete': 'Deleted a published timetable',
    'event.create': 'Created an event',
    'event.update': 'Edited an event',
    'event.delete': 'Deleted an event',
    'event.notify': 'Sent an event notification',
    'announcement.send': 'Sent an announcement',
    'announcement.delete': 'Deleted an announcement',
    'attendance.reopen': 'Reopened an attendance register',
    'data.import': 'Imported data',
    'data.export': 'Exported data',
    'audit.export': 'Exported the audit log',
};
export const describeAction = (a) => ACTION_WORDS[a] || a.replace(/[.-]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function Row({ log }) {
    const [open, setOpen] = useState(false);
    const extras = Object.entries(log.details || {}).filter(([k]) => !['role', 'method'].includes(k));
    return (
        <>
            <tr className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setOpen((o) => !o)}>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap align-top">{formatSchoolDateTime(log.createdAt)}</td>
                <td className="px-4 py-3 align-top"><p className="text-sm font-semibold text-gray-900">{log.actor.name}</p>{log.actor.role && <p className="text-xs text-gray-400 capitalize">{log.actor.role}</p>}</td>
                <td className="px-4 py-3 text-sm text-gray-800 align-top">{describeAction(log.action)}</td>
                <td className="px-4 py-3 text-xs text-gray-500 align-top hidden md:table-cell">{log.entityType}</td>
                <td className="px-2 py-3 text-gray-400 align-top w-8">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
            </tr>
            {open && (
                <tr className="bg-gray-50">
                    <td colSpan={5} className="px-4 py-3">
                        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
                            <dt className="text-gray-400">Action code</dt><dd className="text-gray-700 break-all">{log.action}</dd>
                            {log.entityId && (<><dt className="text-gray-400">Item</dt><dd className="text-gray-700 break-all">{log.entityType} {log.entityId}</dd></>)}
                            {log.ipAddress && (<><dt className="text-gray-400">From</dt><dd className="text-gray-700">{log.ipAddress}</dd></>)}
                            {extras.map(([k, v]) => (<React.Fragment key={k}><dt className="text-gray-400">{k}</dt><dd className="text-gray-700 break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></React.Fragment>))}
                        </dl>
                    </td>
                </tr>
            )}
        </>
    );
}

function AuditContent() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ action: '', from: '', to: '' });
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);

    const params = useCallback(() => Object.fromEntries(Object.entries({ ...filters, page, limit: 25 }).filter(([, v]) => v !== '')), [filters, page]);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        listAuditLogs(params())
            .then((d) => { if (alive) { setData(d); setError(''); } })
            .catch((e) => alive && setError(e.message))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [params]);

    const set = (k) => (e) => { setPage(1); setFilters((f) => ({ ...f, [k]: e.target.value })); };
    const doExport = async () => {
        setExporting(true);
        try { await exportAuditLogCsv(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))); notify.success('Audit log downloaded.'); }
        catch (e) { notify.error(e.message); } finally { setExporting(false); }
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
                    <p className="text-sm text-gray-500 mt-1 max-w-xl">Who changed what in your school, and when. Only administrator actions are recorded here, and entries cannot be edited.</p>
                </div>
                <button onClick={doExport} disabled={exporting} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    <Download size={15} /> {exporting ? 'Preparing…' : 'Download CSV'}
                </button>
            </div>

            <div className="flex flex-wrap gap-3 items-end">
                <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-gray-500">Action</span>
                    <select className={fieldClass} value={filters.action} onChange={set('action')}>
                        <option value="">All actions</option>
                        {(data?.actions || []).map((a) => <option key={a} value={a}>{describeAction(a)}</option>)}
                    </select></label>
                <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-gray-500">From</span>
                    <input type="date" className={fieldClass} value={filters.from} onChange={set('from')} /></label>
                <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-gray-500">To</span>
                    <input type="date" className={fieldClass} value={filters.to} onChange={set('to')} /></label>
                {(filters.action || filters.from || filters.to) && <button className="px-3 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900" onClick={() => { setPage(1); setFilters({ action: '', from: '', to: '' }); }}>Clear</button>}
            </div>

            {error ? <EmptyState variant="error" description={error} onRetry={() => setPage((p) => p)} />
                : loading && !data ? <TableSkeleton />
                : data.logs.length === 0 ? <EmptyState title="No entries" description="Nothing has been recorded for these filters yet. Actions such as publishing fees, changing grading or inviting users appear here." />
                : (
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50"><tr>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500">When</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500">Who</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500">What</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 hidden md:table-cell">Item</th>
                                    <th className="w-8" />
                                </tr></thead>
                                <tbody>{data.logs.map((l) => <Row key={l.id} log={l} />)}</tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
                            <span>{data.pagination.total} entries</span>
                            <div className="flex items-center gap-2">
                                <button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 font-semibold disabled:opacity-40">Previous</button>
                                <span>Page {data.pagination.page} of {Math.max(data.pagination.pages, 1)}</span>
                                <button disabled={page >= data.pagination.pages || loading} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 font-semibold disabled:opacity-40">Next</button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
}

export default function AuditLogPage() {
    return (
        <AdminLayout>
            <SettingsBreadcrumb section="Audit Log" />
            <AuditContent />
        </AdminLayout>
    );
}
