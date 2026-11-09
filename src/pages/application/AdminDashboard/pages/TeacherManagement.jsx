import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/layout/AdminLayout';
import { getDashboardUsers } from '../services/adminService';
import { InviteTeacherModal } from '../components/ui/modals.jsx';
import { ROUTES } from '../navigation/navConfig.js';
import { WorkbenchTable, StatusChip, Avatar, pushToast } from '../../../../components/patterns';

/**
 * Staff list — migrated onto WorkbenchTable. The dual grid/table views and
 * per-row action dropdown are gone; a row opens the Staff profile page where
 * status / assignments / removal live.
 */
const TeacherManagement = () => {
    const navigate = useNavigate();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showInvite, setShowInvite] = useState(false);

    const fetchTeachers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getDashboardUsers('teacher', '');
            setTeachers((response.data?.users ?? []).map(u => ({
                id: u.id,
                name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—',
                email: u.email || '—',
                status: u.isActive,
                subjects: u.subjects || [],
                classes: u.classes || [],
                phone: u.phone || '—',
                profileImage: u.profileImage ?? null,
            })));
        } catch (err) {
            console.error('Failed to fetch teachers:', err);
            setError(err?.message || 'Failed to load staff.');
        } finally {
            setLoading(false);
        }
    }, []);

    console.log("teachers", teachers);

    useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

    const activeCount = teachers.filter(t => t.status).length;
    const inactiveCount = teachers.length - activeCount;

    const subjectOptions = useMemo(() => {
        const set = new Set();
        teachers.forEach(t => t.subjects?.forEach(s => set.add(s)));
        return [...set].map(s => ({ value: s, label: s }));
    }, [teachers]);

    const columns = useMemo(() => [
        {
            id: 'name', header: 'Staff', accessor: r => r.name, sortable: true, hideable: false,
            render: r => (
                <div className="flex items-center gap-3">
                    <Avatar name={r.name} src={r.profileImage} size="sm" />
                    <span className="font-semibold text-gray-900">{r.name}</span>
                </div>
            ),
        },
        { id: 'email',    header: 'Email',    accessor: r => r.email, sortable: true, render: r => <span className="text-gray-500">{r.email}</span> },
        { id: 'subjects', header: 'Subjects', accessor: r => r.subjects.join(', '), render: r => <span className="text-gray-600 truncate block max-w-[220px]">{r.subjects.join(', ') || '—'}</span> },
        { id: 'classes',  header: 'Classes',  accessor: r => r.classes?.map(c => c.className).join(', '),render: r => { const classText = r.classes?.map(c => c.className).join(', ') || '—';
                return ( <span className="text-gray-500 truncate block max-w-40" title={classText}> {classText} </span> );}
        },
        { id: 'status', header: 'Status', accessor: r => (r.status ? 'Active' : 'Inactive'), sortable: true, render: r => <StatusChip status={r.status} /> },
    ], []);

    const filters = useMemo(() => [
        { id: 'status', label: 'Status', getValue: r => (r.status ? 'Active' : 'Inactive'), options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }] },
        // array getter → matches when the chosen subject is among the staff's subjects
        { id: 'subject', label: 'Subject', getValue: r => r.subjects, options: subjectOptions },
    ], [subjectOptions]);

    const StatCard = ({ label, value, tint, text }) => (
        <div className={`${tint} rounded-2xl p-5 flex flex-col justify-center items-center`}>
            <p className={`text-sm font-medium mb-1 ${text}`}>{label}</p>
            <h2 className="text-3xl font-bold text-gray-900">{value}</h2>
        </div>
    );

    return (
        <AdminLayout>
            <div className="space-y-5">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
                    <p className="text-sm text-gray-500">Manage staff profiles, assignments, and activity.</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <StatCard label="Total staff" value={loading ? '—' : teachers.length} tint="bg-[#FFF8E7]" text="text-amber-800/70" />
                    <StatCard label="Active" value={loading ? '—' : activeCount} tint="bg-[#F0FAF5]" text="text-emerald-800/70" />
                    <StatCard label="Inactive" value={loading ? '—' : inactiveCount} tint="bg-[#FFF0EB]" text="text-red-800/70" />
                </div>

                <WorkbenchTable
                    title="Staff"
                    storageKey="staff"
                    loading={loading}
                    error={error}
                    onRetry={fetchTeachers}
                    rows={teachers}
                    columns={columns}
                    filters={filters}
                    searchPlaceholder="Search staff by name or email…"
                    searchKeys={['name', 'email']}
                    onRowClick={(r) => navigate(`${ROUTES.staff}/${r.id}`)}
                    primaryAction={{ label: 'Add Teacher', icon: Plus, onClick: () => setShowInvite(true) }}
                    emptyState={{
                        icon: UserCog,
                        title: 'No staff yet',
                        description: 'Invite teachers and other staff to give them accounts and assignments.',
                        action: { label: 'Invite a teacher', onClick: () => setShowInvite(true) },
                    }}
                />
            </div>

            {showInvite && (
                <InviteTeacherModal
                    onClose={() => setShowInvite(false)}
                    showToast={(message, type) => pushToast({ message, type })}
                    onTeacherAdded={fetchTeachers}
                />
            )}
        </AdminLayout>
    );
};

export default TeacherManagement;
