import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/layout/AdminLayout';
import { getAllStudents } from '../../../auth/authAPIs.js';
import { getSchoolClasses } from '../services/classAPIs.js';
import { getClassArms } from '../services/armAPIs.js';
import { CreateStudentModal } from '../components/ui/modals.jsx';
import { ROUTES } from '../navigation/navConfig.js';
import { WorkbenchTable, StatusChip, Avatar, pushToast } from '../../../../components/patterns';

/**
 * StudentManagement — reference migration onto the WorkbenchTable.
 * The dual grid/table views and the row-detail modal are gone: a row click
 * opens the canonical Student profile page (where view/edit/status/delete live).
 */
const StudentManagement = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [createStudent, setCreateStudent] = useState(false);

    const fetchStudents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getAllStudents();
            const classesRes = await getSchoolClasses();
            const classesList = classesRes.data?.classes ?? [];
            const classMap = {};
            classesList.forEach(c => { if (c?.id) classMap[c.id] = c.name; });

            const armMap = {};
            await Promise.all(classesList.map(async (c) => {
                try {
                    const armsRes = await getClassArms(c.id);
                    (armsRes.data?.arms ?? []).forEach(a => { if (a?.id) armMap[a.id] = a.name; });
                } catch { /* ignore individual arm errors */ }
            }));

            const studentList = response.data.students.map(u => ({
                id: u.id,
                name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—',
                email: u?.email || '—',
                class: classMap[u.classId] || '—',
                section: armMap[u.armId] || '—',
                phone: u?.phone || '—',
                profileImage: u.profileImage ?? null,
                status: u.isActive,
                parents: u.parents || [],
            }));
            setStudents(studentList);
        } catch (err) {
            console.error('Failed to fetch students:', err);
            setError(err?.message || 'Failed to load students.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    const activeCount = students.filter(s => s.status).length;
    const inactiveCount = students.length - activeCount;

    const classOptions = useMemo(() => {
        const set = new Set();
        students.forEach(s => { if (s.class && s.class !== '—') set.add(s.class); });
        return [...set].map(c => ({ value: c, label: c }));
    }, [students]);

    const columns = useMemo(() => [
        {
            id: 'name',
            header: 'Student',
            accessor: r => r.name,
            sortable: true,
            hideable: false,
            render: r => (
                <div className="flex items-center gap-3">
                    <Avatar name={r.name} src={r.profileImage} size="sm" />
                    <span className="font-semibold text-gray-900">{r.name}</span>
                </div>
            ),
        },
        { id: 'email', header: 'Email', accessor: r => r.email, sortable: true, render: r => <span className="text-gray-500">{r.email}</span> },
        { id: 'class', header: 'Class', accessor: r => r.class, sortable: true },
        { id: 'section', header: 'Arm', accessor: r => r.section, sortable: true },
        { id: 'phone', header: 'Phone', accessor: r => r.phone, render: r => <span className="text-gray-500">{r.phone}</span> },
        {
            id: 'status',
            header: 'Status',
            accessor: r => (r.status ? 'Active' : 'Inactive'),
            sortable: true,
            render: r => <StatusChip status={r.status} />,
        },
    ], []);

    const filters = useMemo(() => [
        {
            id: 'status',
            label: 'Status',
            getValue: r => (r.status ? 'Active' : 'Inactive'),
            options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }],
        },
        { id: 'class', label: 'Class', getValue: r => r.class, options: classOptions },
    ], [classOptions]);

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
                    <h1 className="text-2xl font-bold text-gray-900">Students</h1>
                    <p className="text-sm text-gray-500">Manage student profiles, classes, and information.</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <StatCard label="Total students" value={loading ? '—' : students.length} tint="bg-[#FFF8E7]" text="text-amber-800/70" />
                    <StatCard label="Active" value={loading ? '—' : activeCount} tint="bg-[#F0FAF5]" text="text-emerald-800/70" />
                    <StatCard label="Inactive" value={loading ? '—' : inactiveCount} tint="bg-[#FFF0EB]" text="text-red-800/70" />
                </div>

                <WorkbenchTable
                    title="Students"
                    storageKey="students"
                    loading={loading}
                    error={error}
                    onRetry={fetchStudents}
                    rows={students}
                    columns={columns}
                    filters={filters}
                    searchPlaceholder="Search students by name or email…"
                    searchKeys={['name', 'email']}
                    onRowClick={(r) => navigate(`${ROUTES.students}/${r.id}`)}
                    primaryAction={{ label: 'Add Student', icon: Plus, onClick: () => setCreateStudent(true) }}
                    emptyState={{
                        icon: UserCog,
                        title: 'No students yet',
                        description: 'Add students one at a time, or import your whole school from a spreadsheet.',
                        action: { label: 'Add a student', onClick: () => setCreateStudent(true) },
                        prerequisite: classOptions.length === 0
                            ? { label: 'Set up classes first', to: ROUTES.classes }
                            : undefined,
                    }}
                />
            </div>

            {createStudent && (
                <CreateStudentModal
                    onClose={() => setCreateStudent(false)}
                    showToast={(message, type) => pushToast({ message, type })}
                    onStudentAdded={fetchStudents}
                />
            )}
        </AdminLayout>
    );
};

export default StudentManagement;
