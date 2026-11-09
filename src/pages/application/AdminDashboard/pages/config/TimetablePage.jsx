import React, { useEffect, useRef } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { TimetableProvider, useTimetable } from '../../timetable/TimetableContext.jsx';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import TimetableBuilder from '../../timetable/TimetableBuilder.jsx';
import { useGlobalTimetableData } from '../../timetable/useGlobalTimetableData.js';

/**
 * TimetablePage
 * Route: /dashboard/admin/config/timetable
 *
 * Renders the drag-and-drop timetable builder with its class/term context bar.
 * Data loading is handled by useGlobalTimetableData.
 */
function TimetableContent() {
    const { state, dispatch } = useTimetable();
    const { academicYears, currentYear, terms, currentTerm, selectYear, selectTerm, loading: academicLoading } = useAcademic();
    const { initialLoad, resources } = useGlobalTimetableData();
    const [searchParams] = useSearchParams();
    const preselectedRef = useRef(false);

    // ── Edit prefill: when arriving from "Edit timetable" with ?classId&armId&termId,
    // preselect class / arm / term once resources are loaded. useGlobalTimetableData
    // then loads the existing periods + schedules into the editor automatically.
    useEffect(() => {
        if (preselectedRef.current || initialLoad || academicLoading) return;
        const classId = searchParams.get('classId');
        const armId = searchParams.get('armId');
        const termId = searchParams.get('termId');
        if (!classId) return;

        const cls = resources.classes.find(c => c.id === classId);
        if (!cls) return;
        preselectedRef.current = true;

        if (termId && termId !== currentTerm?.id && terms.some(t => t.id === termId)) {
            selectTerm(termId);
        }
        dispatch({ type: 'SELECT_CLASS', payload: cls });
        if (armId) {
            const arm = resources.arms.find(a => a.id === armId);
            if (arm) dispatch({ type: 'SELECT_ARM', payload: arm });
        }
    }, [initialLoad, academicLoading, resources, searchParams, terms, currentTerm, selectTerm, dispatch]);

    if (initialLoad || academicLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 h-full">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Booting Academic Engine...</p>
            </div>
        );
    }

    // Arms for the currently selected class (empty = class has no arms → whole-class timetable)
    const classArms = state.selectedClass
        ? resources.arms.filter(a => a.classId === state.selectedClass.id)
        : [];

    return (
        <div className="flex flex-col h-full min-h-[calc(100vh-120px)]">
            {/* Breadcrumb back to the Timetables hub */}
            <Link
                to="/dashboard/admin/academics/timetables"
                className="inline-flex items-center gap-1.5 mb-3 text-[13px] font-semibold text-gray-500 hover:text-blue-700 transition-colors self-start"
            >
                <ArrowLeft size={14} /> Timetables
            </Link>

            {/* Class / Arm / Term context bar */}
            <div className="flex flex-wrap  items-center gap-4 p-3 bg-white border border-gray-200 rounded-xs mb-4 shrink-0 overflow-visible z-10">

                {/* Target Class */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Target Class</span>
                    <select
                        value={state.selectedClass?.id || ''}
                        onChange={e => {
                            const c = resources.classes.find(x => x.id === e.target.value) ?? null;
                            dispatch({ type: 'SELECT_CLASS', payload: c });
                        }}
                        className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="">-- Choose Class --</option>
                        {resources.classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Target Arm — only shown when the selected class has arms */}
                {classArms.length > 0 && (
                    <>
                        <div className="w-px h-6 bg-gray-200 hidden md:block" />
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Target Arm</span>
                            <select
                                value={state.selectedArm?.id || ''}
                                onChange={e => {
                                    const arm = classArms.find(a => a.id === e.target.value) ?? null;
                                    dispatch({ type: 'SELECT_ARM', payload: arm });
                                }}
                                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="">-- Choose Arm / Stream --</option>
                                {classArms.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                <div className="w-px h-6 bg-gray-200 hidden md:block" />

                <div className="flex flex-wrap items-center gap-3">
                    {/* Academic year selector — reads/writes the global academic scope */}
                    <select
                        value={currentYear?.id || ''}
                        onChange={e => selectYear(e.target.value)}
                        className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        {academicYears.map(y => (
                            <option key={y.id} value={y.id}>{y.name}{y.isActive ? ' (Active)' : ''}</option>
                        ))}
                    </select>

                    <div className="w-px h-5 bg-gray-200 hidden md:block" />

                    {/* Term selector — populated after year is resolved */}
                    <select
                        value={currentTerm?.id || ''}
                        onChange={e => selectTerm(e.target.value)}
                        disabled={terms.length === 0}
                        className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                    >
                        {terms.map(t => (
                            <option key={t.id} value={t.id}>{t.name}{t.isCurrent ? ' (Current)' : ''}</option>
                        ))}
                    </select>
                </div>

                {state.loading.draft && (
                    <div className="ml-auto flex items-center gap-2 text-xs font-semibold text-gray-400">
                        <Loader2 size={12} className="animate-spin" /> Fetching data...
                    </div>
                )}
            </div>

            {/* Builder */}
            <div className="flex-1 overflow-hidden">
                <TimetableBuilder resources={resources} />
            </div>
        </div>
    );
}

export default function TimetablePage() {
    return (
        <AdminLayout>
            <TimetableProvider>
                <TimetableContent />
            </TimetableProvider>
        </AdminLayout>
    );
}