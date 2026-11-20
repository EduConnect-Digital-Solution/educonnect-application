import React, { createContext, useContext, useReducer, useMemo, useRef, useEffect, useCallback } from 'react';
import { detectConflicts, getConflictedEntryIds, getWarnedEntryIds, hasBlockingConflicts } from './conflictEngine';
import { pushToast } from '@/components/patterns/toastBus.js';

// Periods are now dynamic and configured per draft.

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ─── Subject color palette ──
const COLOR_PALETTE = [
  { bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-300',    dot: 'bg-blue-500',    dragBg: 'bg-blue-200' },
  { bg: 'bg-violet-100',  text: 'text-violet-800',  border: 'border-violet-300',  dot: 'bg-violet-500',  dragBg: 'bg-violet-200' },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500', dragBg: 'bg-emerald-200' },
  { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300',  dot: 'bg-orange-500',  dragBg: 'bg-orange-200' },
  { bg: 'bg-pink-100',    text: 'text-pink-800',    border: 'border-pink-300',    dot: 'bg-pink-500',    dragBg: 'bg-pink-200' },
  { bg: 'bg-cyan-100',    text: 'text-cyan-800',    border: 'border-cyan-300',    dot: 'bg-cyan-500',    dragBg: 'bg-cyan-200' },
  { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-300',   dot: 'bg-amber-500',   dragBg: 'bg-amber-200' },
  { bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-300',    dot: 'bg-rose-500',    dragBg: 'bg-rose-200' },
  { bg: 'bg-teal-100',    text: 'text-teal-800',    border: 'border-teal-300',    dot: 'bg-teal-500',    dragBg: 'bg-teal-200' },
  { bg: 'bg-indigo-100',  text: 'text-indigo-800',  border: 'border-indigo-300',  dot: 'bg-indigo-500',  dragBg: 'bg-indigo-200' },
];

/**
 * Returns a stable color scheme for a given subject name/id.
 * Hash is based on character codes — same subject always gets the same color.
 */
export function getSubjectColor(subjectId) {
  if (!subjectId) return COLOR_PALETTE[0];
  const hash = String(subjectId).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

/** Lightweight unique ID with no external dependency. */
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/** A new schedule entry for `subject` in one cell ({ day, periodId, periodNumber, startTime, endTime }). */
export function makeScheduleEntry(state, subject, cell) {
  return {
    id: uid(),
    classId: state.selectedClass.id,
    className: state.selectedClass.name,
    armId: state.selectedArm?.id ?? null,
    armName: state.selectedArm?.name ?? null,
    dayOfWeek: cell.day,
    periodId: cell.periodId,
    periodNumber: cell.periodNumber,
    startTime: cell.startTime,
    endTime: cell.endTime,
    subjectId: subject.id,
    subjectName: subject.name,
    teacherId: null,
    teacherName: null,
  };
}

/** True when `entry` can go back into the timetable currently open (same class, arm and period grid). */
export function canRestoreEntry(state, entry, scopeVersion) {
  return !state.isPublished
    && state.scopeVersion === scopeVersion
    && state.selectedClass?.id === entry.classId
    && (state.selectedArm?.id ?? null) === (entry.armId ?? null)
    && state.periods.some(p => p.id === entry.periodId)
    && !state.schedules.some(s => s.id === entry.id);
}

// ─── State ──
// NOTE: Academic scope (year + term) is NOT held here — it lives in the global
// AcademicContext. This reducer owns only the timetable *editor* working state.
const initialState = {
  // Builder
  selectedClass: null,   // { id, name }
  selectedArm: null,     // { id, classId, name } | null — null means whole class (no arm)
  periods: [],           // Computed PeriodConfig[] — generated from periodConfig
  periodConfig: null,    // Raw wizard inputs: { id, schoolStart, periodDuration, totalPeriods, breaks[] }
  savedPeriodConfigs: [], // School-wide reusable configs fetched on init
  schedules: [],         // ScheduleEntry[]
  draftId: null,
  isDraft: true,
  isPublished: false,
  publishedAt: null,

  // Selection
  selectedEntryId: null,
  // Tap-to-place on touch screens: { mode: 'place', subject } | { mode: 'move', entry } | null
  tapMode: null,
  // Below xl the inspector opens as a sheet, only when the user asks (tapping a lesson or Details).
  detailsOpen: false,
  // Bumped whenever a different timetable (class, arm, term draft) is swapped in or the grid is cleared,
  // so an Undo from before can never restore into it.
  scopeVersion: 0,

  // Draft save
  lastSavedAt: null,
  isSaving: false,
  saveError: false,
  saveRetry: 0,
  loadedScope: null,
  otherSchedules: [],

  // Loading flags
  loading: { draft: false },
};

// ─── Reducer ────────────────────
function timetableReducer(state, action) {
  switch (action.type) {

    // ── Class selection ─────────
    // Changing class resets arm, periods, schedules and draft state.
    case 'SELECT_CLASS':
      return { ...state, scopeVersion: state.scopeVersion + 1, selectedClass: action.payload, selectedArm: null, periods: [], schedules: [], draftId: null, selectedEntryId: null, tapMode: null, isPublished: false, loadedScope: null, otherSchedules: [] };

    // ── Arm selection ───────────
    // Changing arm resets draft state so the new arm's timetable loads fresh.
    // Passing null means "whole class" (class has no arms).
    case 'SELECT_ARM':
      return { ...state, scopeVersion: state.scopeVersion + 1, selectedArm: action.payload, periods: [], schedules: [], draftId: null, selectedEntryId: null, tapMode: null, isPublished: false, loadedScope: null, otherSchedules: [] };

    // ── Periods config ──────────
    case 'SET_PERIODS':
      return { ...state, periods: action.payload };
    
    case 'SET_PERIOD_CONFIG':
      return { ...state, periodConfig: action.payload };

    // ── Schedule entries ────────
    case 'SET_DRAFT':
      return { ...state, scopeVersion: state.scopeVersion + 1, tapMode: null, schedules: action.schedules, periods: action.periods ?? state.periods, draftId: action.draftId, isDraft: true, isPublished: false };

    case 'ADD_SCHEDULE_ENTRY':
      return { ...state, schedules: [...state.schedules, action.payload] };

    // Undo of a removal. Ignored unless the same timetable is still open, so it can never land in another class.
    case 'RESTORE_SCHEDULE_ENTRY':
      return canRestoreEntry(state, action.entry, action.scopeVersion) ? { ...state, schedules: [...state.schedules, action.entry] } : state;

    case 'UPDATE_SCHEDULE_ENTRY':
      return {
        ...state,
        schedules: state.schedules.map(s =>
          s.id === action.payload.id ? { ...s, ...action.payload } : s
        ),
      };

    case 'MOVE_SCHEDULE_ENTRY':
      return {
        ...state,
        schedules: state.schedules.map(s =>
          s.id === action.id
            ? { ...s, dayOfWeek: action.day, periodId: action.periodId, startTime: action.startTime, endTime: action.endTime, periodNumber: action.periodNumber }
            : s
        ),
      };

    case 'REMOVE_SCHEDULE_ENTRY':
      return {
        ...state,
        schedules: state.schedules.filter(s => s.id !== action.id),
        selectedEntryId: state.selectedEntryId === action.id ? null : state.selectedEntryId,
      };

    case 'CLEAR_SCHEDULES':
      return { ...state, scopeVersion: state.scopeVersion + 1, schedules: [], selectedEntryId: null, tapMode: null };

    case 'CLEAR_PERIODS_AND_SCHEDULES':
      return { ...state, scopeVersion: state.scopeVersion + 1, periods: [], schedules: [], selectedEntryId: null, tapMode: null, draftId: null, isPublished: false, lastSavedAt: null };

    // ── Copy from another class/arm (bulk) ───────────────────────────────────
    case 'PASTE_SCHEDULES': {
      // Restamp classId/className/armId/armName to the current target, regenerate IDs.
      // Teacher assignments are not copied — they are arm/class specific.
      const { targetClass, targetArm, entries } = action;
      const stampedEntries = entries.map(e => ({
        ...e,
        id: uid(),
        classId: targetClass.id,
        className: targetClass.name,
        armId: targetArm?.id ?? null,
        armName: targetArm?.name ?? null,
        teacherId: null,
        teacherName: null,
      }));
      return { ...state, scopeVersion: state.scopeVersion + 1, schedules: stampedEntries };
    }

    case 'SET_SCOPE':
      return { ...state, loadedScope: action.scope, otherSchedules: action.otherSchedules };
    case 'RETRY_SAVE':
      return { ...state, saveRetry: state.saveRetry + 1 };
    case 'SAVE_FAILED':
      return { ...state, isSaving: false, saveError: true };

    // ── Published ───────────────
    case 'SET_PUBLISHED':
      return { ...state, isPublished: true, isDraft: false, publishedAt: action.publishedAt, tapMode: null };

    // ── UI selection ────────────
    case 'SELECT_ENTRY':
      return { ...state, selectedEntryId: action.id, detailsOpen: action.openDetails ? true : state.detailsOpen };
    case 'DESELECT_ENTRY':
      return { ...state, selectedEntryId: null };
    case 'OPEN_DETAILS':
      return { ...state, detailsOpen: true };
    case 'CLOSE_DETAILS':
      return { ...state, detailsOpen: false, selectedEntryId: null };
    case 'HIDE_DETAILS': // the screen grew to xl, where the inspector column shows instead
      return { ...state, detailsOpen: false };
    case 'SET_TAP_MODE':
      return { ...state, tapMode: action.tapMode, selectedEntryId: null, detailsOpen: false };
    case 'CLEAR_TAP_MODE':
      return { ...state, tapMode: null };

    // ── Draft save state ────────
    case 'SET_SAVING':
      return { ...state, isSaving: action.value, saveError: false };
    case 'SET_SAVED':
      return { ...state, lastSavedAt: action.at, isSaving: false, saveError: false, draftId: action.draftId ?? state.draftId };

    // ── Loading ─────────────────
    case 'SET_LOADING':
      return { ...state, loading: { ...state.loading, ...action.payload } };

    default:
      return state;
  }
}

// ─── Context ────────────────────
const TimetableContext = createContext(null);

export function TimetableProvider({ children }) {
  const [state, dispatch] = useReducer(timetableReducer, initialState);

  // Derived: conflict analysis (re-runs every time schedules change)
  const conflicts = useMemo(() => detectConflicts(state.schedules, state.otherSchedules), [state.schedules, state.otherSchedules]);
  const conflictedIds = useMemo(() => getConflictedEntryIds(conflicts), [conflicts]);
  const warnedIds = useMemo(() => getWarnedEntryIds(conflicts), [conflicts]);
  const hasErrors = useMemo(() => hasBlockingConflicts(conflicts), [conflicts]);

  // Derived: selected entry
  const selectedEntry = useMemo(
    () => state.schedules.find(s => s.id === state.selectedEntryId) ?? null,
    [state.schedules, state.selectedEntryId]
  );

  // Derived: schedule lookup by day+period (for WeeklyGrid)
  const scheduleByCell = useMemo(() => {
    const map = {};
    for (const entry of state.schedules) {
      const key = `${entry.dayOfWeek}__${entry.periodId}`;
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    }
    return map;
  }, [state.schedules]);

  // Remove a lesson and offer Undo. The undo re-checks the open timetable at click time (via the ref),
  // so switching class, publishing or starting afresh in the meantime makes it a harmless no-op.
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  const removeWithUndo = useCallback((entry) => {
    const { scopeVersion } = stateRef.current;
    dispatch({ type: 'REMOVE_SCHEDULE_ENTRY', id: entry.id });
    pushToast({
      message: `${entry.subjectName} removed from ${entry.dayOfWeek} ${entry.startTime}`,
      undo: () => {
        if (!canRestoreEntry(stateRef.current, entry, scopeVersion)) {
          pushToast({ message: 'That lesson can no longer be restored here.', type: 'info' });
          return;
        }
        dispatch({ type: 'RESTORE_SCHEDULE_ENTRY', entry, scopeVersion });
      },
    });
  }, []);

  const value = {
    state,
    dispatch,
    removeWithUndo,
    // Derived
    conflicts,
    conflictedIds,
    warnedIds,
    hasErrors,
    selectedEntry,
    scheduleByCell,
  };

  return (
    <TimetableContext.Provider value={value}>
      {children}
    </TimetableContext.Provider>
  );
}

export function useTimetable() {
  const ctx = useContext(TimetableContext);
  if (!ctx) throw new Error('useTimetable must be used inside <TimetableProvider>');
  return ctx;
}

