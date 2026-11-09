import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/layout/AdminLayout';
import { getDashboardUsers } from '../services/adminService';
import { InviteParentModal } from '../components/ui/modals.jsx';
import { ROUTES } from '../navigation/navConfig.js';
import { WorkbenchTable, StatusChip, Avatar, pushToast } from '../../../../components/patterns';

/**
 * Guardians list — migrated onto WorkbenchTable. Rows open the Guardian
 * profile page, where status / links / removal live.
 */
const ParentManagement = () => {
    const navigate = useNavigate();
    const [parents, setParents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showInvite, setShowInvite] = useState(false);

    const fetchParents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getDashboardUsers('parent', '');
            setParents((response.data?.users ?? []).map(u => ({
                id: u.id,
                name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—',
                email: u.email || '—',
                status: u.isActive,
                students: u.students || [],
                phone: u.phone || '—',
                profileImage: u.profileImage ?? null,
            })));
        } catch (err) {
            console.error('Failed to fetch guardians:', err);
            setError(err?.message || 'Failed to load guardians.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchParents(); }, [fetchParents]);

    const activeCount = parents.filter(p => p.status).length;
    const inactiveCount = parents.length - activeCount;

    const columns = useMemo(() => [
        {
            id: 'name', header: 'Guardian', accessor: r => r.name, sortable: true, hideable: false,
            render: r => (
                <div className="flex items-center gap-3">
                    <Avatar name={r.name} src={r.profileImage} size="sm" />
                    <span className="font-semibold text-gray-900">{r.name}</span>
                </div>
            ),
        },
        { id: 'email', header: 'Email', accessor: r => r.email, sortable: true, render: r => <span className="text-gray-500">{r.email}</span> },
        { id: 'phone', header: 'Phone', accessor: r => r.phone, render: r => <span className="text-gray-500">{r.phone}</span> },
        { id: 'students', header: 'Linked students', accessor: r => r.students.length, sortable: true, align: 'right', render: r => <span className="font-semibold text-gray-700">{r.students.length}</span> },
        { id: 'status', header: 'Status', accessor: r => (r.status ? 'Active' : 'Inactive'), sortable: true, render: r => <StatusChip status={r.status} /> },
    ], []);

    const filters = useMemo(() => [
        { id: 'status', label: 'Status', getValue: r => (r.status ? 'Active' : 'Inactive'), options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }] },
    ], []);

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
                    <h1 className="text-2xl font-bold text-gray-900">Guardians</h1>
                    <p className="text-sm text-gray-500">Manage guardian profiles and their linked students.</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <StatCard label="Total guardians" value={loading ? '—' : parents.length} tint="bg-[#FFF8E7]" text="text-amber-800/70" />
                    <StatCard label="Active" value={loading ? '—' : activeCount} tint="bg-[#F0FAF5]" text="text-emerald-800/70" />
                    <StatCard label="Inactive" value={loading ? '—' : inactiveCount} tint="bg-[#FFF0EB]" text="text-red-800/70" />
                </div>

                <WorkbenchTable
                    title="Guardians"
                    storageKey="guardians"
                    loading={loading}
                    error={error}
                    onRetry={fetchParents}
                    rows={parents}
                    columns={columns}
                    filters={filters}
                    searchPlaceholder="Search guardians by name or email…"
                    searchKeys={['name', 'email']}
                    onRowClick={(r) => navigate(`${ROUTES.guardians}/${r.id}`)}
                    primaryAction={{ label: 'Invite Guardian', icon: Plus, onClick: () => setShowInvite(true) }}
                    emptyState={{
                        icon: Users,
                        title: 'No guardians yet',
                        description: 'Invite parents and guardians so families can follow their children.',
                        action: { label: 'Invite a guardian', onClick: () => setShowInvite(true) },
                    }}
                />
            </div>

            {showInvite && (
                <InviteParentModal
                    onClose={() => setShowInvite(false)}
                    showToast={(message, type) => pushToast({ message, type })}
                />
            )}
        </AdminLayout>
    );
};

export default ParentManagement;
