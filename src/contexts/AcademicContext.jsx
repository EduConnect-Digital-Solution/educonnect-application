import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import { getAcademicYears, getAcademicProfile, getTerms } from '../pages/application/AdminDashboard/timetable/timetableAPIs.js';
import { getTeacherDashboard } from '../pages/auth/authAPIs.js';
import { pushToast } from '../components/patterns/toastBus.js';

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
  const role = user?.role ?? null;
  // Who the scope belongs to. When this changes (sign in, sign out, another account) the scope is
  // reset and reloaded in place, without remounting the pages underneath.
  const identity = user ? JSON.stringify([user.id ?? user.userId ?? user.email, user.schoolId, role]) : null;

  const [loading, setLoading] = useState(true);
  const [switchingYear, setSwitchingYear] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [currentYear, setCurrentYear] = useState(null);
  const [terms, setTerms] = useState([]);
  const [currentTerm, setCurrentTerm] = useState(null);

  const mountedRef = useRef(true);
  // Bumped whenever the signed-in identity changes: answers for an earlier identity are dropped
  const generationRef = useRef(0);
  // Bumped on every year switch: only the latest switch may apply its terms
  const yearRequestRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load (or reload) the system academic scope from the backend (admin).
  const load = useCallback(async () => {
    const generation = generationRef.current;
    const isCurrent = () => mountedRef.current && generationRef.current === generation;
    try {
      const [yearsRes, profileRes] = await Promise.all([
        getAcademicYears(),
        getAcademicProfile(),
      ]);
      if (!isCurrent()) return;

      const years = yearsRes?.data?.years ?? [];
      const year = pickYear(years, profileRes?.data?.currentAcademicYear);

      let yearTerms = [];
      let term = null;
      if (year) {
        const termsRes = await getTerms(year.id);
        if (!isCurrent()) return;
        yearTerms = termsRes?.data?.terms ?? [];
        term = pickTerm(yearTerms, profileRes?.data?.currentTerm);
      }

      // A full reload wins over any year switch still in flight
      yearRequestRef.current++;
      setSwitchingYear(false);
      setAcademicYears(years);
      setCurrentYear(year);
      setTerms(yearTerms);
      setCurrentTerm(term);
    } catch (err) {
      console.error('[Academic] load failed:', err);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  // Teachers don't have access to the admin academic API, so we pull
  // currentAcademicYear and currentAcademicTerm from the teacher dashboard
  // instead (data.school.currentAcademicYear / currentAcademicTerm).
  const loadForTeacher = useCallback(async () => {
    const generation = generationRef.current;
    const isCurrent = () => mountedRef.current && generationRef.current === generation;
    try {
      const res = await getTeacherDashboard();
      if (!isCurrent()) return;
      const school = res?.data?.school ?? {};
      const year   = school.currentAcademicYear ?? null;
      const term   = school.currentAcademicTerm ?? null;
      setCurrentYear(year);
      setCurrentTerm(term);
      setAcademicYears(year ? [year] : []);
      setTerms(term ? [term] : []);
    } catch (err) {
      console.error('[Academic] teacher load failed:', err);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  // One load per signed-in identity. Signing out, or in as someone else, clears the previous scope first.
  useEffect(() => {
    generationRef.current++;
    yearRequestRef.current++;
    setSwitchingYear(false);
    setAcademicYears([]);
    setCurrentYear(null);
    setTerms([]);
    setCurrentTerm(null);

    if (identity && role === 'admin') { setLoading(true); load(); }
    else if (identity && role === 'teacher') { setLoading(true); loadForTeacher(); }
    else setLoading(false); // parents and signed-out visitors have no academic scope to wait for
  }, [identity, role, load, loadForTeacher]);

  // Change the active year. The year and its term change together, once the new year's terms have
  // arrived, so no page ever sees the new year paired with the previous year's term.
  const selectYear = useCallback(async (yearId) => {
    const year = academicYears.find(y => y.id === yearId);
    if (!year) return;
    const generation = generationRef.current;
    const request = ++yearRequestRef.current;
    const isCurrent = () => mountedRef.current && generationRef.current === generation && yearRequestRef.current === request;
    setSwitchingYear(true);
    try {
      const res = await getTerms(yearId);
      if (!isCurrent()) return;
      const yearTerms = res?.data?.terms ?? [];
      setCurrentYear(year);
      setTerms(yearTerms);
      setCurrentTerm(pickTerm(yearTerms, null));
    } catch (err) {
      console.error('[Academic] selectYear failed:', err);
      // Stay on the year that is still showing rather than leave pages with a year and no terms
      if (isCurrent()) pushToast({ message: `Could not switch to ${year.name ?? year.year ?? 'that academic year'}. Please try again.`, type: 'error' });
    } finally {
      if (isCurrent()) setSwitchingYear(false);
    }
  }, [academicYears]);

  // Change the active term within the already-loaded year.
  const selectTerm = useCallback((termId) => {
    setCurrentTerm(terms.find(t => t.id === termId) ?? null);
  }, [terms]);

  const value = {
    loading,
    switchingYear,
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
