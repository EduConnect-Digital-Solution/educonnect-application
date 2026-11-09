import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CalendarDays } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { WorkbenchTable, StatusChip, EmptyState } from '../../../../../components/patterns';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import {
    getAllPublishedTimetables, getTimetableDraft, getAcademicProfile, getTerms,
} from '../../timetable/timetableAPIs.js';
import { getSchoolClasses } from '../../services/classAPIs.js';
import { getClassArms } from '../../services/armAPIs.js';
import { ROUTES } from '../../navigation/navConfig.js';

/**
 * TimetableLibraryPage — lists every published AND draft timetable for the
 * selected class (and optional arm) in the platform table, each with a status
 * chip. Row click → the full read-only view, from which you can export / edit / delete.
 */
export default function TimetableLibrary() {
    const navigate = useNavigate();
    const { currentTerm } = useAcademic();

    const [classes, setClasses] = useState([]);
    const [arms, setArms] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [rows, setRows] = useState([]);
    const [termNameById, setTermNameById] = useState({});
    const [loadingInit, setLoadingInit] = useState(true);
    const [loadingRows, setLoadingRows] = useState(false);
    const [error, setError] = useState(null);

    // Initial: classes + term names (for the Term column).
    useEffect(() => {
        (async () => {
            try {
                const [classesRes, profileRes] = await Promise.all([getSchoolClasses(), getAcademicProfile()]);
                const cls = classesRes?.data?.classes ?? [];
                setClasses(cls);
                if (cls.length) setSelectedClassId(cls[0].id);

                const map = {};
                const yearId = profileRes?.data?.currentAcademicYear?.id;
                if (yearId) {
                    const termsRes = await getTerms(yearId);
                    (termsRes?.data?.terms ?? []).forEach(t => { map[t.id] = t.name; });
                }
                setTermNameById(map);
            } catch (e) {
                setError(e?.message || 'Failed to load classes.');
            } finally {
                setLoadingInit(false);
            }
        })();
    }, []);

    // Build rows for the selected class: published (any term) + drafts (current term, per arm).
    const loadRows = useCallback(async () => {
        if (!selectedClassId) { setRows([]); return; }
        setLoadingRows(true);
        setError(null);
        try {
            const armsRes = await getClassArms(selectedClassId);
            const armList = armsRes?.data?.arms ?? [];
            setArms(armList);

            const allPublished = await getAllPublishedTimetables();
            const className = classes.find(c => c.id === selectedClassId)?.name || 'Class';

            // Published rows (across any term).
            const publishedRows = allPublished
                .filter(t => t.classId === selectedClassId)
                .map(t => ({
                    id: t.id,
                    classId: t.classId,
                    className: t.schedules?.[0]?.className || className,
                    armId: t.armId || null,
                    armName: t.schedules?.[0]?.armName || armList.find(a => a.id === t.armId)?.name || '—',
                    termId: t.termId,
                    termName: termNameById[t.termId] || 'Term',
                    status: 'published',
                    updatedAt: t.publishedAt,
                    lessons: t.schedules?.length ?? 0,
                }));

            // Draft rows for the current term (one probe per arm, or whole-class).
            let draftRows = [];
            if (currentTerm?.id) {
                const armScopes = armList.length ? armList : [{ id: null, name: null }];
                const probes = await Promise.allSettled(
                    armScopes.map(a => getTimetableDraft(selectedClassId, currentTerm.id, a.id))
                );
                draftRows = probes.flatMap((p, i) => {
                    const draft = p.status === 'fulfilled' ? p.value?.data?.draft : null;
                    if (!draft) return [];
                    const arm = armScopes[i];
                    return [{
                        id: `draft_${selectedClassId}_${arm.id ?? 'class'}`,
                        classId: selectedClassId,
                        className,
                        armId: arm.id,
                        armName: arm.name || '—',
                        termId: currentTerm.id,
                        termName: currentTerm.name,
                        status: 'draft',
                        updatedAt: draft.updatedAt,
                        lessons: draft.schedules?.length ?? 0,
                    }];
                });
            }

            setRows([...draftRows, ...publishedRows]);
        } catch (e) {
            setError(e?.message || 'Failed to load timetables.');
        } finally {
            setLoadingRows(false);
        }
    }, [selectedClassId, classes, currentTerm, termNameById]);

    useEffect(() => { loadRows(); }, [loadRows]);

    const armOptions = useMemo(
        () => arms.map(a => ({ value: a.id, label: a.name })),
        [arms]
    );

    const columns = useMemo(() => [
        { id: 'className', header: 'Class', accessor: r => r.className, sortable: true, hideable: false,
          render: r => <span className="font-semibold text-gray-900">{r.className}</span> },
        { id: 'armName', header: 'Arm', accessor: r => r.armName, sortable: true },
        { id: 'termName', header: 'Term', accessor: r => r.termName, sortable: true,
          render: r => <span className="text-gray-500">{r.termName}</span> },
        { id: 'lessons', header: 'Lessons', accessor: r => r.lessons, sortable: true, align: 'right' },
        { id: 'updatedAt', header: 'Last updated', accessor: r => r.updatedAt,
          render: r => <span className="text-gray-500">{r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span> },
        { id: 'status', header: 'Status', accessor: r => r.status, sortable: true, render: r => <StatusChip status={r.status} /> },
    ], []);

    const filters = useMemo(() => [
        { id: 'status', label: 'Status', getValue: r => r.status, options: [{ value: 'published', label: 'Published' }, { value: 'draft', label: 'Draft' }] },
        { id: 'armId', label: 'Arm', getValue: r => r.armId, options: armOptions },
    ], [armOptions]);

    const openRow = (r) => {
        const q = new URLSearchParams({
            classId: r.classId, termId: r.termId, status: r.status,
            ...(r.armId ? { armId: r.armId } : {}), termName: r.termName || '',
        });
        navigate(`${ROUTES.timetableView}?${q.toString()}`);
    };

    if (loadingInit) {
        return <AdminLayout><div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div></AdminLayout>;
    }

    return (
        <AdminLayout>
            <div className="max-w-[1500px] mx-auto space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Timetables</h1>
                        <p className="text-gray-500 text-sm mt-1">Published and draft timetables for the selected class. Open one to view, export, edit, or delete.</p>
                    </div>
                    <button onClick={() => navigate(ROUTES.timetableBuilder)}
                        className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">
                        Open builder
                    </button>
                </div>

                {classes.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-2xl">
                        <EmptyState variant="first-use" icon={CalendarDays}
                            title="No classes yet"
                            description="Create your classes and arms before building timetables."
                            prerequisite={{ label: 'Set up classes', to: ROUTES.classes }} />
                    </div>
                ) : (
                    <>
                        {/* Class selector drives the table */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase text-gray-500 tracking-widest ml-1">Class</label>
                                <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                                    className="block w-56 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            {loadingRows && <Loader2 size={16} className="animate-spin text-gray-400 mb-2.5" />}
                        </div>

                        <WorkbenchTable
                            title="Timetables"
                            storageKey="timetables"
                            loading={loadingRows}
                            error={error}
                            onRetry={loadRows}
                            rows={rows}
                            columns={columns}
                            filters={filters}
                            searchPlaceholder="Search by class or arm…"
                            searchKeys={['className', 'armName']}
                            onRowClick={openRow}
                            emptyState={{
                                icon: CalendarDays,
                                title: 'No timetables for this class yet',
                                description: 'Build and publish a timetable for this class in the builder.',
                                action: { label: 'Open builder', to: ROUTES.timetableBuilder },
                            }}
                        />
                    </>
                )}
            </div>
        </AdminLayout>
    );
}
