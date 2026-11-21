import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Copy } from 'lucide-react';
import { default as Loader2 } from '@/components/brand/LoaderIcon.jsx';
import { Link, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { TimetableProvider, useTimetable } from '../../timetable/TimetableContext.jsx';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import TimetableBuilder from '../../timetable/TimetableBuilder.jsx';
import { useGlobalTimetableData } from '../../timetable/useGlobalTimetableData.js';
import CopyToArmsDrawer from '../../timetable/components/CopyToArmsDrawer.jsx';
import useMediaQuery from '@/components/patterns/useMediaQuery.js';

const selectClass = 'w-full md:w-auto px-3 py-2.5 md:py-1.5 bg-gray-50 border border-gray-200 rounded text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const fieldLabel = 'text-[11px] md:text-xs font-bold uppercase tracking-wider text-gray-400';

/**
 * TimetablePage
 * Route: /dashboard/admin/config/timetable
 *
 * Renders the timetable builder with its class/term context bar, at every screen size: drag and drop on
 * desktop, tap to place on phones and tablets. Data loading is handled by useGlobalTimetableData.
 * On phones the context bar folds into a one-line summary once a class (and arm) is chosen, to leave room for the grid.
 */
function TimetableContent() {
    const { state, dispatch } = useTimetable();
    const { academicYears, currentYear, terms, currentTerm, selectYear, selectTerm, loading: academicLoading } = useAcademic();
    const { initialLoad, resources, scope, draftError, retryDraft } = useGlobalTimetableData();
    const [searchParams] = useSearchParams();
    const preselectedRef = useRef(false);
    const [copyOpen, setCopyOpen] = useState(false);
    const isPhone = useMediaQuery('(max-width: 767px)');
    const [pickersOpen, setPickersOpen] = useState(false);
    // Phones: move focus into the pickers when they are opened with "Change", and back to the summary on "Done"
    const pickerPanelRef = useRef(null);
    const summaryRef = useRef(null);
    const focusPanelNext = useRef(false);
    const usedPickers = useRef(false); // set by a tap or change inside the pickers, not by a prefilled link
    const canCopy = Boolean(state.loadedScope === scope && state.selectedClass && state.selectedArm && currentTerm?.id && state.schedules.length > 0);

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

    // Arms for the currently selected class (empty = class has no arms → whole-class timetable)
    const classArms = state.selectedClass
        ? resources.arms.filter(a => a.classId === state.selectedClass.id)
        : [];
    const needsChoice = !state.selectedClass || (classArms.length > 0 && !state.selectedArm);
    const showPickers = !isPhone || pickersOpen || needsChoice;
    const scopeSummary = [
        state.selectedClass?.name,
        state.selectedArm?.name,
        currentYear?.name,
        currentTerm?.name,
    ].filter(Boolean).join(' · ');

    // When the pickers fold away (Done, or the last missing choice made) the focused select disappears: put focus
    // on the summary button instead of losing it. When opened with "Change", focus the first select.
    const pickersWereShown = useRef(showPickers);
    useEffect(() => {
        if (showPickers && focusPanelNext.current) pickerPanelRef.current?.querySelector('select')?.focus();
        if (!showPickers && pickersWereShown.current && usedPickers.current) summaryRef.current?.focus();
        focusPanelNext.current = false;
        if (!showPickers) usedPickers.current = false;
        pickersWereShown.current = showPickers;
    }, [showPickers]);

    if (initialLoad || academicLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 h-full">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Booting Academic Engine...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:h-full lg:min-h-[calc(100vh-120px)]">
            {/* Breadcrumb back to the Timetables hub */}
            <Link
                to="/dashboard/admin/academics/timetables"
                className="inline-flex items-center gap-1.5 mb-2 md:mb-3 py-1 text-[13px] font-semibold text-gray-500 hover:text-blue-700 transition-colors self-start"
            >
                <ArrowLeft size={14} /> Timetables
            </Link>

            {/* Class / Arm / Term context bar */}
            {!showPickers ? (
                <div className="flex items-center gap-2 mb-3 shrink-0">
                    <button
                        ref={summaryRef}
                        type="button"
                        onClick={() => { focusPanelNext.current = true; setPickersOpen(true); }}
                        aria-expanded="false"
                        aria-label={`Editing ${scopeSummary}. Change class, arm, year or term`}
                        className="flex-1 min-w-0 flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xs text-left"
                    >
                        <span className="min-w-0">
                            <span className={`block ${fieldLabel}`}>Editing</span>
                            <span className="block truncate text-sm font-semibold text-gray-800">{scopeSummary}</span>
                        </span>
                        <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-blue-700">
                            {state.loading.draft ? <Loader2 size={12} className="animate-spin" /> : null} Change <ChevronDown size={14} />
                        </span>
                    </button>
                    {canCopy && (
                        <button type="button" onClick={() => setCopyOpen(true)} aria-label="Copy to other arms"
                            className="shrink-0 p-3 text-blue-700 bg-blue-50 border border-blue-100 rounded">
                            <Copy size={16} />
                        </button>
                    )}
                </div>
            ) : (
            <div id="timetable-scope-pickers" ref={pickerPanelRef}
                onChangeCapture={() => { usedPickers.current = true; }} onClickCapture={() => { usedPickers.current = true; }}
                className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-center md:gap-4 p-3 bg-white border border-gray-200 rounded-xs mb-3 md:mb-4 shrink-0 overflow-visible z-10">

                {/* Target Class */}
                <label className="col-span-2 flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
                    <span className={fieldLabel}>Target Class</span>
                    <select
                        value={state.selectedClass?.id || ''}
                        onChange={e => {
                            const c = resources.classes.find(x => x.id === e.target.value) ?? null;
                            dispatch({ type: 'SELECT_CLASS', payload: c });
                        }}
                        className={selectClass}
                    >
                        <option value="">-- Choose Class --</option>
                        {resources.classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </label>

                {/* Target Arm — only shown when the selected class has arms */}
                {classArms.length > 0 && (
                    <>
                        <div className="w-px h-6 bg-gray-200 hidden md:block" />
                        <label className="col-span-2 flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
                            <span className={fieldLabel}>Target Arm</span>
                            <select
                                value={state.selectedArm?.id || ''}
                                onChange={e => {
                                    const arm = classArms.find(a => a.id === e.target.value) ?? null;
                                    dispatch({ type: 'SELECT_ARM', payload: arm });
                                }}
                                className={selectClass}
                            >
                                <option value="">-- Choose Arm / Stream --</option>
                                {classArms.map(a => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                            </select>
                        </label>
                    </>
                )}

                <div className="w-px h-6 bg-gray-200 hidden md:block" />

                {/* Academic year and term: side by side on phones, labelled there only (desktop shows the values alone) */}
                <div className="col-span-2 grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-center">
                    <label className="flex flex-col gap-1 min-w-0">
                        <span className={`${fieldLabel} md:hidden`}>Year</span>
                        {/* Academic year selector — reads/writes the global academic scope */}
                        <select
                            value={currentYear?.id || ''}
                            onChange={e => selectYear(e.target.value)}
                            className={selectClass}
                        >
                            {academicYears.map(y => (
                                <option key={y.id} value={y.id}>{y.name}{y.isActive ? ' (Active)' : ''}</option>
                            ))}
                        </select>
                    </label>

                    <div className="w-px h-5 bg-gray-200 hidden md:block" />

                    <label className="flex flex-col gap-1 min-w-0">
                        <span className={`${fieldLabel} md:hidden`}>Term</span>
                        {/* Term selector — populated after year is resolved */}
                        <select
                            value={currentTerm?.id || ''}
                            onChange={e => selectTerm(e.target.value)}
                            disabled={terms.length === 0}
                            className={`${selectClass} disabled:opacity-50`}
                        >
                            {terms.map(t => (
                                <option key={t.id} value={t.id}>{t.name}{t.isCurrent ? ' (Current)' : ''}</option>
                            ))}
                        </select>
                    </label>
                </div>

                {canCopy && (
                    <button type="button" onClick={() => setCopyOpen(true)}
                        className="col-span-2 md:ml-auto flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded hover:bg-blue-100">
                        <Copy size={14} /> Copy to other arms
                    </button>
                )}

                {state.loading.draft && (
                    <div className="col-span-2 md:ml-auto flex items-center gap-2 text-xs font-semibold text-gray-400">
                        <Loader2 size={12} className="animate-spin" /> Fetching data...
                    </div>
                )}

                {isPhone && !needsChoice && (
                    <button type="button" onClick={() => setPickersOpen(false)}
                        aria-expanded="true" aria-controls="timetable-scope-pickers"
                        className="col-span-2 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded">
                        Done
                    </button>
                )}
            </div>
            )}

            {canCopy && (
                <CopyToArmsDrawer open={copyOpen} onClose={() => setCopyOpen(false)} arms={resources.arms} classes={resources.classes} termId={currentTerm.id}
                    source={{ classId: state.selectedClass.id, armId: state.selectedArm.id, label: `${state.selectedClass.name} ${state.selectedArm.name}` }} />
            )}

            {/* Builder */}
            {/* Below lg the page scrolls as a whole (natural on phones); from lg the builder fills the screen */}
            <div className="flex-1 lg:overflow-hidden">
                {scope && state.loadedScope !== scope ? (
                    <div className="p-6 text-sm text-gray-600" role="status">
                        {draftError ? <>Could not load this timetable. <button type="button" onClick={retryDraft} className="text-blue-700 underline">Try again</button></> : 'Loading timetable…'}
                    </div>
                ) : <TimetableBuilder resources={resources} />}
            </div>
        </div>
    );
}

export default function TimetablePage() {
    // Works at every width: phones and tablets place lessons by tapping (see MobileTray), so there is no desktop gate.
    return (
        <AdminLayout>
            <TimetableProvider>
                <TimetableContent />
            </TimetableProvider>
        </AdminLayout>
    );
}
