import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import { getAcademicYears, getAcademicProfile, getTerms } from '../pages/application/AdminDashboard/timetable/timetableAPIs.js';
import { getTeacherDashboard } from '../pages/auth/authAPIs.js';

/**
 * ───────────────────────────────
 * AcademicContext — the ONLY truly-global app state besides auth/PWA.
 * ───────────────────────────────
 * Holds the system-wide academic scope:
 *   • currentYear  (selected academic year)
 *   • currentTerm  (selected term)
 * plus the lists needed to switch them (academicYears, terms).
 *
 * Loaded ONCE for an authenticated admin and kept for the whole session, so
 * navigating between admin pages no longer refetches year/term. Every page reads
 * this via `useAcademic()` instead of threading it through a reducer.
 *
 * NOTE: page-level data (classes, fees, timetables, events, …) is intentionally
 * NOT stored here — each page fetches what it needs directly from its API.
 */

const AcademicContext = createContext(null);

// Pick the default year: profile's current year → active year → first.
function pickYear(years, profileYear) {
  if (!years.length) return null;
  if (profileYear?.id) {
    return years.find(y => y.id === profileYear.id) ?? years.find(y => y.isActive) ?? years[0];
  }
  return years.find(y => y.isActive) ?? years[0];
}

// Pick the default term: profile's current term → current → first.
function pickTerm(terms, profileTerm) {
  if (!terms.length) return null;
  if (profileTerm?.id) {
    return terms.find(t => t.id === profileTerm.id) ?? terms.find(t => t.isCurrent) ?? terms[0];
  }
  return terms.find(t => t.isCurrent) ?? terms[0];
}

export function AcademicProvider({ children }) {
  const { user } = useAuth();
  const isAdmin   = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  const [loading, setLoading] = useState(true);
  const [academicYears, setAcademicYears] = useState([]);
  const [currentYear, setCurrentYear] = useState(null);
  const [terms, setTerms] = useState([]);
  const [currentTerm, setCurrentTerm] = useState(null);

  const mountedRef = useRef(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load (or reload) the system academic scope from the backend.
  const load = useCallback(async () => {
    try {
      const [yearsRes, profileRes] = await Promise.all([
        getAcademicYears(),
        getAcademicProfile(),
      ]);
      if (!mountedRef.current) return;

      const years = yearsRes?.data?.years ?? [];
      const year = pickYear(years, profileRes?.data?.currentAcademicYear);

      let yearTerms = [];
      let term = null;
      if (year) {
        const termsRes = await getTerms(year.id);
        if (!mountedRef.current) return;
        yearTerms = termsRes?.data?.terms ?? [];
        term = pickTerm(yearTerms, profileRes?.data?.currentTerm);
      }

      setAcademicYears(years);
      setCurrentYear(year);
      setTerms(yearTerms);
      setCurrentTerm(term);
    } catch (err) {
      console.error('[Academic] load failed:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // One-shot load for an authenticated admin.
  useEffect(() => {
    if (!isAdmin || loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [isAdmin, load]);

  // One-shot load for an authenticated teacher.
  // Teachers don't have access to the admin academic API, so we pull
  // currentAcademicYear and currentAcademicTerm from the teacher dashboard
  // instead (data.school.currentAcademicYear / currentAcademicTerm).
  const loadForTeacher = useCallback(async () => {
    try {
      const res = await getTeacherDashboard();
      if (!mountedRef.current) return;
      const school = res?.data?.school ?? {};
      const year   = school.currentAcademicYear ?? null;
      const term   = school.currentAcademicTerm ?? null;
      setCurrentYear(year);
      setCurrentTerm(term);
      if (year) setAcademicYears([year]);
      if (term) setTerms([term]);
    } catch (err) {
      console.error('[Academic] teacher load failed:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isTeacher || loadedRef.current) return;
    loadedRef.current = true;
    loadForTeacher();
  }, [isTeacher, loadForTeacher]);

  // Change the active year — fetches its terms and selects a sensible default term.
  const selectYear = useCallback(async (yearId) => {
    const year = academicYears.find(y => y.id === yearId);
    if (!year) return;
    setCurrentYear(year);
    try {
      const res = await getTerms(yearId);
      if (!mountedRef.current) return;
      const yearTerms = res?.data?.terms ?? [];
      setTerms(yearTerms);
      setCurrentTerm(pickTerm(yearTerms, null));
    } catch (err) {
      console.error('[Academic] selectYear failed:', err);
      setTerms([]);
      setCurrentTerm(null);
    }
  }, [academicYears]);

  // Change the active term within the already-loaded year.
  const selectTerm = useCallback((termId) => {
    setCurrentTerm(terms.find(t => t.id === termId) ?? null);
  }, [terms]);

  const value = {
    loading,
    academicYears,
    currentYear,
    terms,
    currentTerm,
    selectYear,
    selectTerm,
    refresh: load,
  };

  return <AcademicContext.Provider value={value}>{children}</AcademicContext.Provider>;
}

export function useAcademic() {
  const ctx = useContext(AcademicContext);
  if (!ctx) throw new Error('useAcademic must be used within an <AcademicProvider>');
  return ctx;
}
