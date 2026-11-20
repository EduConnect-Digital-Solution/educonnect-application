import { useState, useEffect, useRef } from 'react';
import { useTimetable } from './TimetableContext.jsx';
import { useAcademic } from '../../../../contexts/AcademicContext.jsx';
import {
    getTimetableDraft,
    getAllPublishedTimetables,
} from './timetableAPIs.js';
import { expandPeriods, extractPeriodConfig } from './timetableUtils.js';
import { getSchoolClasses } from '../services/classAPIs.js';
import { getClassArms } from '../services/armAPIs.js';
import { getSchoolSubjects } from '../services/subjectAPIs.js';
import * as adminService from '../services/adminService.js';

/**
 * useGlobalTimetableData
 * ───────────────────────────────
 * Loads the timetable builder's *reference resources* (classes, arms, teachers,
 * subjects) once on mount, and reloads the active draft whenever the selected
 * class / arm / term changes.
 *
 * Academic scope (year + term) is NO LONGER managed here — it lives in the global
 * AcademicContext. Reference resources (classes, arms, teachers, subjects) are
 * fetched here into local state and RETURNED to the page, which passes them down
 * to the builder panels as props. Everything else (selectedClass, selectedArm,
 * schedules, periods) is the builder's own editor state in TimetableContext.
 */
const ROOMS = ['Room 101', 'Room 102', 'Room 103', 'Lab 1', 'Library', 'Gym'];

export function useGlobalTimetableData() {
    const { state, dispatch } = useTimetable();
    const { currentTerm } = useAcademic();
    const [initialLoad, setInitialLoad] = useState(true);
    const [draftError, setDraftError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    // Reference resources — owned here, fetched directly from the APIs.
    const [classes, setClasses] = useState([]);
    const [arms, setArms] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);

    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // ── Load builder reference resources once on mount ────────────────────────
    useEffect(() => {
        async function loadResources() {
            try {
                const [classesRes, teachersRes, subjectsRes] = await Promise.all([
                    getSchoolClasses(),
                    adminService.getDashboardUsers(),
                    getSchoolSubjects(),
                ]);
                if (!mountedRef.current) return;

                if (classesRes?.success) {
                    const cls = classesRes.data?.classes ?? [];
                    setClasses(cls);

                    if (cls.length > 0) {
                        const armResults = await Promise.all(cls.map(c => getClassArms(c.id)));
                        if (!mountedRef.current) return;
                        setArms(armResults.flatMap(r => r?.data?.arms ?? []));
                    }
                }

                if (teachersRes?.success && Array.isArray(teachersRes.data?.users)) {
                    setTeachers(
                        teachersRes.data.users
                            .filter(u => u.role === 'teacher')
                            .map(t => ({ id: t.id, name: `${t.firstName} ${t.lastName}` }))
                    );
                }

                if (subjectsRes?.success) {
                    setSubjects(subjectsRes.data?.subjects ?? []);
                }
            } catch (err) {
                console.error('[Timetable] resource load failed:', err);
            } finally {
                if (mountedRef.current) setInitialLoad(false);
            }
        }

        loadResources();
    }, []); // run exactly once on mount

    // ── Reactive: reload the draft when class, arm, or term changes ───────────
    const selectedTermId = currentTerm?.id;
    const selectedClassId = state.selectedClass?.id;
    const selectedArmId = state.selectedArm?.id ?? null;
    const classHasArms = Boolean(
        selectedClassId && arms.some(a => a.classId === selectedClassId)
    );

    const scope = selectedClassId && selectedTermId && (!classHasArms || selectedArmId)
        ? `${selectedClassId}:${selectedArmId ?? ''}:${selectedTermId}` : null;

    useEffect(() => {
        // Require class + term. When the class has arms, require an explicit arm.
        if (!selectedClassId || !selectedTermId) return;
        if (classHasArms && selectedArmId === null) return;

        let cancelled = false;

        async function loadDraft() {
            setDraftError(false);
            dispatch({ type: 'SET_LOADING', payload: { draft: true } });
            try {
                // Fetch all published timetables and match the current selection client-side.
                const allPublished = await getAllPublishedTimetables();
                if (cancelled) return;
                const otherSchedules = (allPublished || []).filter(t =>
                    t.termId === selectedTermId && !(t.classId === selectedClassId && (t.armId ?? null) === selectedArmId)
                ).flatMap(t => (t.schedules ?? []).map(s => ({ ...s, classId: s.classId ?? t.classId, armId: s.armId ?? t.armId ?? null })));
                const published = (allPublished || []).find(t =>
                    t.classId === selectedClassId &&
                    t.termId === selectedTermId &&
                    (t.armId ?? null) === selectedArmId
                );

                // Prefer an existing draft so edits to a published timetable survive reload.
                // Some backend versions use 404 to mean no draft exists.
                let draftRes;
                try {
                    draftRes = await getTimetableDraft(selectedClassId, selectedTermId, selectedArmId);
                } catch (err) {
                    if (err.response?.status !== 404) throw err;
                }
                if (cancelled) return;
                const draft = draftRes?.success && draftRes.data?.draft;
                if (draft) {
                    dispatch({ type: 'SET_DRAFT', periods: expandPeriods(draft), schedules: draft.schedules ?? [], draftId: draft.id });
                    dispatch({ type: 'SET_PERIOD_CONFIG', payload: extractPeriodConfig(draft) });
                    if (draft.updatedAt) dispatch({ type: 'SET_SAVED', at: draft.updatedAt });
                } else if (published) {
                    dispatch({ type: 'SET_DRAFT', periods: expandPeriods(published), schedules: published.schedules ?? [], draftId: null });
                    dispatch({ type: 'SET_PERIOD_CONFIG', payload: extractPeriodConfig(published) });
                    dispatch({ type: 'SET_PUBLISHED', publishedAt: published.publishedAt });
                } else {
                    dispatch({ type: 'CLEAR_PERIODS_AND_SCHEDULES' });
                }
                dispatch({ type: 'SET_SCOPE', scope, otherSchedules });
            } catch (err) {
                console.error('[Timetable] loadDraft failed:', err);
                if (!cancelled) setDraftError(true);
            } finally {
                if (!cancelled) dispatch({ type: 'SET_LOADING', payload: { draft: false } });
            }
        }

        loadDraft();
        return () => { cancelled = true; };
    }, [selectedClassId, selectedArmId, selectedTermId, classHasArms, scope, retryCount, dispatch]);

    return {
        initialLoad, scope, draftError, retryDraft: () => setRetryCount(n => n + 1),
        resources: { classes, arms, teachers, subjects, rooms: ROOMS },
    };
}

