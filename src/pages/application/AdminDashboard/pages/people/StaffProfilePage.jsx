import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Power, Trash2, BookOpen, Layers, RefreshCw, FilePlus2 } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { DetailPage, EmptyState, Timeline, StatusChip, pushToast } from '../../../../../components/patterns';
import { getDashboardUsers } from '../../services/adminService';
import { StatusChangeModal, DeleteUserModal, UnassignClassesModal } from '../../components/ui/modals.jsx';
import TeacherClassAssignmentModal from './TeacherClassAssignmentModal.jsx';
import TeacherSubjectAssignmentModal from './TeacherSubjectAssignmentModal.jsx';
import { useAuth } from '../../../../../contexts/AuthContext.jsx';
import { ROUTES } from '../../navigation/navConfig.js';

const Chip = ({ children, tone = 'blue' }) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${
        tone === 'blue' ? 'bg-blue-50/60 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-600 border-gray-100'
    }`}>{children}</span>
);

export default function StaffProfilePage() {
    const { staffId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [staff, setStaff] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modal, setModal] = useState(null); // status | delete | assignClasses | unassignClasses | assignSubjects

    const toast = (message, type) => pushToast({ message, type });

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getDashboardUsers('teacher', '');
            const found = (res.data?.users ?? []).find(u => u.id === staffId);
            if (!found) throw new Error('Staff member not found.');
            // subjects and classes may be arrays of objects or plain strings depending
            // on the API version — normalise both to plain strings for safe rendering.
            const toStringArray = (arr) =>
                (arr ?? []).map(item =>
                    typeof item === 'string'
                        ? item
                        : item?.name ?? item?.subjectName ?? item?.className ?? String(item)
                );

            setStaff({
                id: found.id,
                name: `${found.firstName ?? ''} ${found.lastName ?? ''}`.trim() || 'Staff',
                firstName: found.firstName,
                lastName: found.lastName,
                email: found.email,
                phone: found.phone || '—',
                profileImage: found.profileImage ?? null,
                status: found.isActive,
                subjects: toStringArray(found.subjects),
                classes: toStringArray(found.classes),
                updatedAt: found.updatedAt,
                createdAt: found.createdAt,
            });
        } catch (e) {
            setError(e?.message || 'Failed to load this staff member.');
        } finally {
            setLoading(false);
        }
    }, [staffId]);

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

    const timelineItems = staff ? [
        staff.updatedAt && { title: 'Record updated', at: staff.updatedAt, tone: 'blue', icon: RefreshCw },
        staff.createdAt && { title: 'Staff account created', at: staff.createdAt, tone: 'green', icon: FilePlus2 },
    ].filter(Boolean) : [];

    return (
        <AdminLayout>
            <DetailPage
                loading={loading}
                breadcrumb={[{ label: 'People', to: ROUTES.staff }, { label: 'Staff', to: ROUTES.staff }, { label: staff?.name ?? '…' }]}
                avatar={{ name: staff?.name, image: staff?.profileImage }}
                title={staff?.name}
                subtitle={staff?.email || 'No email on record'}
                status={staff?.status ? 'active' : 'inactive'}
                primaryActions={[
                    { id: 'classes', label: 'Assign classes', icon: Layers, variant: 'outline', onClick: () => setModal('assignClasses') },
                    { id: 'subjects', label: 'Assign subjects', icon: BookOpen, onClick: () => setModal('assignSubjects') },
                ]}
                overflowActions={[
                    { id: 'unassignClasses', label: 'Unassign classes', icon: Layers, onClick: () => setModal('unassignClasses') },
                    { id: 'status', label: staff?.status ? 'Deactivate' : 'Activate', icon: Power, onClick: () => setModal('status') },
                    { id: 'delete', label: 'Remove staff', icon: Trash2, destructive: true, onClick: () => setModal('delete') },
                ]}
                stats={[
                    { label: 'Subjects', value: staff?.subjects?.length ?? 0 },
                    { label: 'Classes', value: staff?.classes?.length ?? 0 },
                    { label: 'Status', value: staff?.status ? 'Active' : 'Inactive', tone: staff?.status ? 'green' : undefined },
                ]}
                tabs={[
                    {
                        id: 'overview',
                        label: 'Overview',
                        content: (
                            <div className="grid sm:grid-cols-2 gap-5">
                                <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email</p><p className="text-[13px] font-semibold text-gray-800 mt-0.5">{staff?.email || '—'}</p></div>
                                <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Phone</p><p className="text-[13px] font-semibold text-gray-800 mt-0.5">{staff?.phone || '—'}</p></div>
                            </div>
                        ),
                    },
                    {
                        id: 'assignments',
                        label: 'Assignments',
                        badge: (staff?.subjects?.length || 0) + (staff?.classes?.length || 0) || undefined,
                        content: (
                            <div className="space-y-5">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5"><BookOpen size={12} /> Subjects</p>
                                    {staff?.subjects?.length ? (
                                        <div className="flex flex-wrap gap-2">{staff.subjects.map((s, i) => <Chip key={i}>{s}</Chip>)}</div>
                                    ) : <p className="text-[13px] text-gray-400 italic">No subjects assigned</p>}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5"><Layers size={12} /> Classes</p>
                                    {staff?.classes?.length ? (
                                        <div className="flex flex-wrap gap-2">{staff.classes.map((c, i) => <Chip key={i} tone="gray">{c}</Chip>)}</div>
                                    ) : <p className="text-[13px] text-gray-400 italic">No classes assigned</p>}
                                </div>
                            </div>
                        ),
                    },
                ]}
                rail={
                    <div className="space-y-5">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Status</p>
                            <StatusChip status={staff?.status ? 'active' : 'inactive'} />
                        </div>
                        <div className="pt-4 border-t border-gray-100">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Timeline</p>
                            <Timeline items={timelineItems} emptyLabel="Employment events will appear here." />
                        </div>
                    </div>
                }
            />

            {modal === 'status' && <StatusChangeModal onClose={afterAction} showToast={toast} user={staff} schoolId={user?.schoolId} />}
            {modal === 'delete' && <DeleteUserModal onClose={() => { closeModal(); navigate(ROUTES.staff); }} showToast={toast} user={staff} schoolId={user?.schoolId} />}
            {modal === 'assignClasses' && <TeacherClassAssignmentModal teacher={staff} schoolId={user?.schoolId} onClose={closeModal} onAssigned={load} />}
            {modal === 'assignSubjects' && <TeacherSubjectAssignmentModal teacher={staff} onClose={closeModal} onAssigned={load} />}
            {modal === 'unassignClasses' && <UnassignClassesModal onClose={afterAction} showToast={toast} teacher={staff} schoolId={user?.schoolId} />}
        </AdminLayout>
    );
}
