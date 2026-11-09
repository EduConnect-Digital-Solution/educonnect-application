import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Power, Trash2, Link2, GraduationCap, RefreshCw, FilePlus2 } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { DetailPage, EmptyState, Timeline, StatusChip, pushToast } from '../../../../../components/patterns';
import { getDashboardUsers } from '../../services/adminService';
import { getParentDetails } from '../../../../auth/authAPIs.js';
import { StatusChangeModal, DeleteUserModal, ManageParentStudentLinkModal } from '../../components/ui/modals.jsx';
import { useAuth } from '../../../../../contexts/AuthContext.jsx';
import { ROUTES } from '../../navigation/navConfig.js';

export default function GuardianProfilePage() {
    const { guardianId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [guardian, setGuardian] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modal, setModal] = useState(null); // status | delete | links

    const toast = (message, type) => pushToast({ message, type });

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Prefer the richer detail endpoint; fall back to the list row.
            let raw = null;
            try {
                const detail = await getParentDetails(guardianId);
                raw = detail?.data?.parent ?? null;
            } catch { /* fall back below */ }
            if (!raw) {
                const res = await getDashboardUsers('parent', '');
                raw = (res.data?.users ?? []).find(u => u.id === guardianId);
            }
            if (!raw) throw new Error('Guardian not found.');
            setGuardian({
                id: raw.id ?? guardianId,
                name: `${raw.firstName ?? ''} ${raw.lastName ?? ''}`.trim() || raw.name || 'Guardian',
                email: raw.email || '—',
                phone: raw.phone || '—',
                status: raw.isActive ?? true,
                students: raw.students || [],
                updatedAt: raw.updatedAt,
                createdAt: raw.createdAt,
            });
        } catch (e) {
            setError(e?.message || 'Failed to load this guardian.');
        } finally {
            setLoading(false);
        }
    }, [guardianId]);

    useEffect(() => { load(); }, [load]);

    const closeModal = () => setModal(null);
    const afterAction = () => { closeModal(); load(); };

    if (!loading && error) {
        return (
            <AdminLayout>
                <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl mt-8">
                    <EmptyState variant="error" description={error} onRetry={load} />
                </div>
            </AdminLayout>
        );
    }

    const students = guardian?.students ?? [];
    const timelineItems = guardian ? [
        guardian.updatedAt && { title: 'Record updated', at: guardian.updatedAt, tone: 'blue', icon: RefreshCw },
        guardian.createdAt && { title: 'Guardian account created', at: guardian.createdAt, tone: 'green', icon: FilePlus2 },
    ].filter(Boolean) : [];

    return (
        <AdminLayout>
            <DetailPage
                loading={loading}
                breadcrumb={[{ label: 'People', to: ROUTES.guardians }, { label: 'Guardians', to: ROUTES.guardians }, { label: guardian?.name ?? '…' }]}
                avatar={{ name: guardian?.name }}
                title={guardian?.name}
                subtitle={guardian?.email || 'No email on record'}
                status={guardian?.status ? 'active' : 'inactive'}
                primaryActions={[
                    { id: 'links', label: 'Manage linked students', icon: Link2, variant: 'outline', onClick: () => setModal('links') },
                ]}
                overflowActions={[
                    { id: 'status', label: guardian?.status ? 'Deactivate' : 'Activate', icon: Power, onClick: () => setModal('status') },
                    { id: 'delete', label: 'Remove guardian', icon: Trash2, destructive: true, onClick: () => setModal('delete') },
                ]}
                stats={[
                    { label: 'Linked students', value: students.length, tone: students.length === 0 ? 'amber' : undefined, hint: students.length === 0 ? 'None linked' : undefined },
                    { label: 'Phone', value: guardian?.phone ?? '—' },
                    { label: 'Status', value: guardian?.status ? 'Active' : 'Inactive', tone: guardian?.status ? 'green' : undefined },
                ]}
                tabs={[
                    {
                        id: 'overview', label: 'Overview',
                        content: (
                            <div className="grid sm:grid-cols-2 gap-5">
                                <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email</p><p className="text-[13px] font-semibold text-gray-800 mt-0.5">{guardian?.email || '—'}</p></div>
                                <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Phone</p><p className="text-[13px] font-semibold text-gray-800 mt-0.5">{guardian?.phone || '—'}</p></div>
                            </div>
                        ),
                    },
                    {
                        id: 'students', label: 'Linked students', badge: students.length || undefined,
                        content: students.length > 0 ? (
                            <div className="space-y-2.5">
                                {students.map((s, i) => {
                                    const sName = s.name || `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() || 'Student';
                                    const sid = s.id || s.studentId;
                                    return (
                                        <button key={sid ?? i}
                                            onClick={() => sid && navigate(`${ROUTES.students}/${sid}`)}
                                            className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:border-blue-200 hover:bg-blue-50/30 transition-colors text-left">
                                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{sName[0]?.toUpperCase()}</div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-gray-800 truncate">{sName}</p>
                                                <p className="text-[12px] text-gray-400 truncate">{s.classDisplay || s.class || ''}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState variant="first-use" icon={GraduationCap} compact
                                title="No students linked"
                                description="Link this guardian to one or more students so they can see fees, attendance, and results."
                                action={{ label: 'Manage links', onClick: () => setModal('links') }} />
                        ),
                    },
                ]}
                rail={
                    <div className="space-y-5">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Status</p>
                            <StatusChip status={guardian?.status ? 'active' : 'inactive'} />
                        </div>
                        <div className="pt-4 border-t border-gray-100">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Timeline</p>
                            <Timeline items={timelineItems} emptyLabel="Account events will appear here." />
                        </div>
                    </div>
                }
            />

            {modal === 'status' && <StatusChangeModal onClose={afterAction} showToast={toast} user={guardian} schoolId={user?.schoolId} />}
            {modal === 'delete' && <DeleteUserModal onClose={() => { closeModal(); navigate(ROUTES.guardians); }} showToast={toast} user={guardian} schoolId={user?.schoolId} />}
            {modal === 'links' && <ManageParentStudentLinkModal onClose={afterAction} showToast={toast} parent={guardian} schoolId={user?.schoolId} />}
        </AdminLayout>
    );
}
