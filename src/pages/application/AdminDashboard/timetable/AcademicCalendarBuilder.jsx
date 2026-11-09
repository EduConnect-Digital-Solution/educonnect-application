import React, { useState, useEffect, useMemo } from 'react';
import { useAcademic } from '../../../../contexts/AcademicContext.jsx';
import {
  Plus, Edit2, Trash2, CheckCircle, AlertCircle, Calendar as CalendarIcon,
  Clock, Check, X, ShieldAlert, ArrowRight, Settings, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import {
  createAcademicYear, updateAcademicYear, deleteAcademicYear,
  createTerm, updateTerm, deleteTerm, setAcademicContext, getAcademicProfile,
  getAcademicYears, getTerms, setCurrentTerm
} from './timetableAPIs';
import {formatYear} from "../utils/formatters";
import { pushToast, Field, Drawer, ConfirmDestructiveDialog, EmptyState, inputClass, useFieldErrors } from '../../../../components/patterns';

// Readable message from a failed API call (validation detail first, then the server message)
const errMsg = (e) => {
  const data = e?.response?.data;
  const details = Array.isArray(data?.errors) ? data.errors.map(x => x?.msg || x?.message).filter(Boolean) : [];
  if (details.length) return [...new Set(details)].join(' · ');
  if (!e?.response && e?.message === 'Network Error') return 'Could not reach the server. Check your internet connection and try again.';
  return data?.message || e?.message || 'Something went wrong. Please try again.';
};

// API dates arrive as ISO timestamps; <input type="date"> needs YYYY-MM-DD
const toDay = (v) => (v ? String(v).slice(0, 10) : '');
const niceDate = (v) => (v ? new Date(`${toDay(v)}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function AcademicCalendarBuilder() {
  // Academic years + terms are this page's own data — fetched directly here.
  const { refresh: refreshAcademic } = useAcademic();
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [isYearsLoading, setIsYearsLoading] = useState(true);
  const [isTermsLoading, setIsTermsLoading] = useState(false);
  const [yearsError, setYearsError] = useState(null);
  const [termsError, setTermsError] = useState(null);
  const [savingYear, setSavingYear] = useState(false);
  const [savingTerm, setSavingTerm] = useState(false);
  const [yearServerError, setYearServerError] = useState(null);
  const [termServerError, setTermServerError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'year' | 'term', item }



  // Local state for active context (fetched from profile)
  const [activeProfile, setActiveProfile] = useState({
    currentYear: null,
    currentTerm: null,
    isLoading: true
  });
  // UI State
  const [selectedViewYearId, setSelectedViewYearId] = useState(null);
  
  // Modals
  const [showYearModal, setShowYearModal] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [editYearId, setEditYearId] = useState(null);
  const [editTermId, setEditTermId] = useState(null);

  // Forms
  const currentYearNum = new Date().getFullYear();
  const [yearForm, setYearForm] = useState({ startYear: currentYearNum, endYear: currentYearNum + 1, startDate: '', endDate: '' });
  const [termForm, setTermForm] = useState({ name: '', startDate: '', endDate: '', term: '' });

  // Calendar State
  const [selectedDateMsg, setSelectedDateMsg] = useState(null);
  const [eventForm, setEventForm] = useState({ name: '', type: 'holiday' });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCalendarTermId, setSelectedCalendarTermId] = useState(null);

  // ── Validation (runs on blur and again on save) ──
  const selectedYear = academicYears.find(y => y.id === selectedViewYearId);

  const yearValidators = useMemo(() => ({
    endYear: (v, all) => (Number(all.endYear) > Number(all.startYear) ? null : 'The end year must come after the start year'),
    startDate: (v, all) => {
      if (!v) return 'Pick the date this academic year starts';
      const label = `${all.startYear}-${all.endYear}`;
      if (academicYears.some(y => y.id !== editYearId && y.year === label)) return `${all.startYear}/${all.endYear} already exists`;
      return null;
    },
    endDate: (v, all) => {
      if (!v) return 'Pick the date this academic year ends';
      if (all.startDate && v <= all.startDate) return 'The end date must be after the start date';
      return null;
    },
  }), [academicYears, editYearId]);

  const termValidators = useMemo(() => {
    const yStart = toDay(selectedYear?.startDate);
    const yEnd = toDay(selectedYear?.endDate);
    // `terms` already holds only the viewed year's terms (loaded per year)
    const siblings = terms.filter(t => t.id !== editTermId);
    return {
      name: (v) => {
        if (!v) return 'Choose which term this is';
        if (siblings.some(t => t.name === v)) return `${v} already exists in this academic year`;
        return null;
      },
      startDate: (v, all) => {
        if (!v) return 'Pick the date this term starts';
        if (yStart && v < yStart) return `Cannot start before the academic year (${niceDate(yStart)})`;
        if (yEnd && v > yEnd) return `Cannot start after the academic year ends (${niceDate(yEnd)})`;
        const clash = all.endDate && siblings.find(t => v <= toDay(t.endDate) && all.endDate >= toDay(t.startDate));
        if (clash) return `Overlaps ${clash.name} (${niceDate(clash.startDate)} – ${niceDate(clash.endDate)})`;
        return null;
      },
      endDate: (v, all) => {
        if (!v) return 'Pick the date this term ends';
        if (all.startDate && v <= all.startDate) return 'The end date must be after the start date';
        if (yEnd && v > yEnd) return `Cannot end after the academic year ends (${niceDate(yEnd)})`;
        return null;
      },
    };
  }, [terms, selectedYear, editTermId]);

  const yearV = useFieldErrors(yearValidators);
  const termV = useFieldErrors(termValidators);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); 
  
  const days = [];
  for (let i = 0; i < firstDayIndex; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));

  // Fetch academic profile + years on mount
  useEffect(() => {
    fetchProfile();
    loadYears();
  }, []);

  // Reload the terms list whenever the viewed year changes.
  useEffect(() => {
    if (!selectedViewYearId) { setTerms([]); return; }
    let cancelled = false;
    setIsTermsLoading(true);
    setTermsError(null);
    getTerms(selectedViewYearId)
      .then(res => { if (!cancelled && res?.success) setTerms(res.data?.terms ?? []); })
      .catch(e => { if (!cancelled) setTermsError(errMsg(e)); })
      .finally(() => { if (!cancelled) setIsTermsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedViewYearId]);

  const loadYears = async () => {
    setIsYearsLoading(true);
    setYearsError(null);
    try {
      const res = await getAcademicYears();
      if (res?.success) setAcademicYears(res.data?.years ?? []);
      else setYearsError(res?.message || 'Could not load academic years.');
    } catch (e) {
      setYearsError(errMsg(e));
    } finally {
      setIsYearsLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await getAcademicProfile();
      if (res.success && res.data?.school) {
        setActiveProfile({
          currentYear: res.data.currentAcademicYear || null,
          currentTerm: res.data.currentTerm || null,
          isLoading: false
        });
      }
    } catch (e) {
      console.error("Failed to fetch academic profile", e);
      setActiveProfile(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Set selected view year initially if none selected
  useEffect(() => {
    if (!selectedViewYearId && academicYears.length > 0) {
      // Prefer active year, then most recent
      const active = activeProfile.currentYear?.id;
      if (active && academicYears.some(y => y.id === active)) {
        setSelectedViewYearId(active);
      } else {
        setSelectedViewYearId(academicYears[academicYears.length - 1].id);
      }
    }
  }, [academicYears, activeProfile.currentYear, selectedViewYearId]);

  // --- Handlers ---

  const openCreateYear = () => {
    setEditYearId(null);
    setYearForm({ startYear: currentYearNum, endYear: currentYearNum + 1, startDate: '', endDate: '' });
    setYearServerError(null);
    yearV.clearErrors();
    setShowYearModal(true);
  };

  const openEditYear = (y) => {
    const [sy, ey] = String(y.year || '').split('-').map(n => parseInt(n, 10));
    setYearForm({
      startYear: sy || currentYearNum,
      endYear: ey || (sy || currentYearNum) + 1,
      startDate: toDay(y.startDate),
      endDate: toDay(y.endDate),
    });
    setEditYearId(y.id);
    setYearServerError(null);
    yearV.clearErrors();
    setShowYearModal(true);
  };

  const closeYearModal = () => {
    if (savingYear) return;
    setShowYearModal(false);
    setEditYearId(null);
    setYearServerError(null);
    yearV.clearErrors();
  };

  const handleSaveYear = async () => {
    if (!yearV.validateAll(yearForm)) return;
    const year = `${yearForm.startYear}-${yearForm.endYear}`;
    const name = `${yearForm.startYear}/${yearForm.endYear} Academic Year`;
    setSavingYear(true);
    setYearServerError(null);
    try {
      if (editYearId) {
        const res = await updateAcademicYear(editYearId, { year, name, startDate: yearForm.startDate, endDate: yearForm.endDate });
        if (!res?.success) throw new Error(res?.message || 'The academic year could not be updated.');
        const updated = res.data.year;
        setAcademicYears(prev => prev.map(y => (y.id === updated.id ? { ...y, ...updated } : y)));
        pushToast({ message: `${updated.name || name} updated` });
      } else {
        const payload = { years: [{ year, name, startDate: yearForm.startDate, endDate: yearForm.endDate, isCurrent: false }] };
        const res = await createAcademicYear(payload);
        if (!res?.success) throw new Error(res?.message || 'The academic year could not be created.');
        const created = res.data.years?.[0] ?? res.data.academicYear;
        setAcademicYears(prev => [...prev, created]);
        if (!selectedViewYearId) setSelectedViewYearId(created.id);
        pushToast({ message: `${created?.name || name} created. Next, add its terms.` });
      }
      setShowYearModal(false);
      setEditYearId(null);
      refreshAcademic();
    } catch (e) {
      setYearServerError(errMsg(e));
    } finally {
      setSavingYear(false);
    }
  };

  const confirmDeleteYear = async (reason, y) => {
    try {
      const res = await deleteAcademicYear(y.id);
      if (!res?.success) throw new Error(res?.message || 'The academic year could not be deleted.');
    } catch (e) {
      throw new Error(errMsg(e));
    }
    setAcademicYears(prev => prev.filter(x => x.id !== y.id));
    if (selectedViewYearId === y.id) setSelectedViewYearId(null);
    pushToast({ message: `${y.name} deleted` });
    refreshAcademic();
  };

  const openCreateTerm = () => {
    setEditTermId(null);
    setTermForm({ name: '', startDate: '', endDate: '', term: '' });
    setTermServerError(null);
    termV.clearErrors();
    setShowTermModal(true);
  };

  const openEditTerm = (t) => {
    setTermForm({ name: t.name, term: t.term || t.name.replace(/\s+/g, '_'), startDate: toDay(t.startDate), endDate: toDay(t.endDate) });
    setEditTermId(t.id);
    setTermServerError(null);
    termV.clearErrors();
    setShowTermModal(true);
  };

  const closeTermModal = () => {
    if (savingTerm) return;
    setShowTermModal(false);
    setEditTermId(null);
    setTermServerError(null);
    termV.clearErrors();
  };

  const handleSaveTerm = async () => {
    if (!selectedViewYearId) return;
    if (!termV.validateAll(termForm)) return;
    setSavingTerm(true);
    setTermServerError(null);
    try {
      if (editTermId) {
        const res = await updateTerm(editTermId, { name: termForm.name, startDate: termForm.startDate, endDate: termForm.endDate });
        if (!res?.success) throw new Error(res?.message || 'The term could not be updated.');
        const updated = res.data.term;
        setTerms(prev => prev.map(t => (t.id === updated.id ? { ...t, ...updated } : t)));
        pushToast({ message: `${updated.name || termForm.name} updated` });
      } else {
        const payload = { terms: [{ ...termForm, academicYearId: selectedViewYearId, isCurrent: false }] };
        const res = await createTerm(payload);
        if (!res?.success) throw new Error(res?.message || 'The term could not be created.');
        const created = res.data.terms?.[0] ?? res.data.term;
        setTerms(prev => [...prev, created]);
        pushToast({ message: `${created?.name || termForm.name} added` });
      }
      setShowTermModal(false);
      setEditTermId(null);
      refreshAcademic();
    } catch (e) {
      setTermServerError(errMsg(e));
    } finally {
      setSavingTerm(false);
    }
  };

  const confirmDeleteTerm = async (reason, t) => {
    try {
      const res = await deleteTerm(t.id);
      if (!res?.success) throw new Error(res?.message || 'The term could not be deleted.');
    } catch (e) {
      throw new Error(errMsg(e));
    }
    setTerms(prev => prev.filter(x => x.id !== t.id));
    pushToast({ message: `${t.name} deleted` });
    refreshAcademic();
  };

  const handleSetActiveContext = async (yearId) => {
    try {
      const res = await setAcademicContext(yearId);
      if (!res?.success) throw new Error(res?.message || 'Could not change the current academic year.');
      pushToast({ message: `${academicYears.find(y => y.id === yearId)?.name || 'Academic year'} is now the current year` });
      fetchProfile();        // Refresh local active badges
      refreshAcademic();     // Propagate to the global academic scope
    } catch (e) {
      pushToast({ message: errMsg(e), type: 'error' });
    }
  };

  const handleSetActiveTerm = async (termId) => {
    try {
      const res = await setCurrentTerm(termId);
      if (!res?.success) throw new Error(res?.message || 'Could not change the current term.');
      pushToast({ message: `${terms.find(t => t.id === termId)?.name || 'Term'} is now the current term` });
      fetchProfile();        // Refresh local active badges
      refreshAcademic();     // Propagate to the global academic scope
    } catch (e) {
      pushToast({ message: errMsg(e), type: 'error' });
    }
  };

  const getStatusBadge = (isActive) => (
    isActive 
      ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle size={12} /> Active</span>
      : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"><Clock size={12} /> Inactive</span>
  );

  const viewTerms = terms?.filter(t => t.academicYearId === selectedViewYearId);



  return (
    <div className="flex flex-col gap-8 bg-gray-50/50 max-w-[1600px] mx-auto w-full ">
      
      {/* Header & System Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
             Academic Context Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Configure and manage academic years, terms, and system-wide active sessions.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-8">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">CURRENT ACADEMIC YEAR</p>
            {activeProfile.currentYear ? (
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-gray-900">{activeProfile.currentYear.name}</span>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">Active</span>
                </div>
            ) : (
                <span className="text-sm font-medium text-amber-600 flex items-center gap-1"><AlertCircle size={14}/> Not Set</span>
            )}
          </div>

          <div className="hidden sm:block w-px bg-gray-200 h-10"></div>

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">CURRENT TERM</p>
            {activeProfile.currentTerm ? (
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-gray-900">{activeProfile.currentTerm.name}</span>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">Active</span>
                </div>
            ) : (
                <span className="text-sm font-medium text-amber-600 flex items-center gap-1"><AlertCircle size={14}/> Not Set</span>
            )}
          </div>
        </div>

      </div>

      {/* Main Configuration Layout */}
      <div id="academic-years-section" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Academic Years List (Left Column) */}
        {/*<div className={` `}>*/}
          <div className=" flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Academic Years</h3>
              <button
                  onClick={openCreateYear}
                  className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition shadow-sm"
              >
                <Plus size={16} /> New Year
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
              {isYearsLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
                    <p className="text-gray-500 text-sm">Loading academic years...</p>
                  </div>
              ) : academicYears.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <CalendarIcon className="text-gray-400" size={32} />
                    </div>
                    <h4 className="text-gray-900 font-bold mb-1">No Academic Years</h4>
                    <p className="text-gray-500 text-sm mb-4">Create an academic year to start configuring terms and schedules.</p>
                    <button onClick={openCreateYear} className="text-blue-600 font-medium text-sm hover:underline">Create First Year</button>
                  </div>
              ) : (
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-sm z-10 border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs tracking-wider">Year Name</th>
                        <th className="py-3 px-4 font-semibold text-gray-600 uppercase text-xs tracking-wider">Status</th>
                        <th className="py-3 px-4 text-right"></th>
                      </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                      {academicYears.map(y => {
                        const isSystemActive = activeProfile.currentYear?.id === y.id;
                        const isSelected = selectedViewYearId === y.id;
                        return (
                            <tr
                                key={y.id}
                                onClick={() => setSelectedViewYearId(y.id)}
                                className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                            >
                              <td className="py-3 px-4">
                                <div className="font-bold text-gray-900">{y.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{formatYear(y.startDate)} - {formatYear(y.endDate)}</div>
                              </td>
                              <td className="py-3 px-4">
                                {getStatusBadge(isSystemActive)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                                  {!isSystemActive && (
                                      <button
                                          title="Set as Active Year"
                                          onClick={() => handleSetActiveContext(y.id)}
                                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                      ><Check size={16}/></button>
                                  )}
                                  <button
                                      title="Edit"
                                      onClick={() => openEditYear(y)}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  ><Edit2 size={16}/></button>
                                  <button
                                      title="Delete"
                                      onClick={() => setDeleteTarget({ type: 'year', item: y })}
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  ><Trash2 size={16}/></button>
                                </div>
                              </td>
                            </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
              )}
            </div>
          </div>

          {/* Terms List (Right Column) */}
          <div className=" flex flex-col gap-4">
            <div className="flex justify-between items-center h-9">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                Terms
                {selectedViewYearId && (
                    <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  for {academicYears.find(y => y.id === selectedViewYearId)?.name || 'Selected Year'}
                </span>
                )}
              </h3>
              {selectedViewYearId && (
                  <button
                      onClick={openCreateTerm}
                      className="flex items-center gap-1 text-sm bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition shadow-sm"
                  >
                    <Plus size={16} /> Add Term
                  </button>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
              {!selectedViewYearId ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
                    <ArrowRight className="text-gray-300 mb-3" size={32} />
                    <p>Select an Academic Year from the left to view its terms.</p>
                  </div>
              ) : isTermsLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
                    <p className="text-gray-500 text-sm">Loading terms...</p>
                  </div>
              ) : terms.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <CalendarIcon className="text-gray-400" size={32} />
                    </div>
                    <h4 className="text-gray-900 font-bold mb-1">No Terms Defined</h4>
                    <p className="text-gray-500 text-sm mb-4">Create terms (e.g. First Term, Fall Semester) for this academic year.</p>
                    <button onClick={openCreateTerm} className="text-blue-600 font-medium text-sm hover:underline">Add First Term</button>
                  </div>
              ) : (
                  <div className="overflow-y-auto flex-1 p-4">
                    <div className="grid grid-cols-1 gap-3">
                      {terms.map(t => {
                        const isSystemActiveYear = activeProfile.currentYear?.id === selectedViewYearId;
                        const isSystemActiveTerm = activeProfile.currentTerm?.id === t.id;

                        return (
                            <div key={t.id} className={`border rounded-lg p-4 transition-all ${isSystemActiveTerm ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-bold text-gray-900 text-base">{t.name}</h4>
                                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                                    <span><strong className="font-medium">Start:</strong> {formatYear(t.startDate) || 'Not set'}</span>
                                    <span><strong className="font-medium">End:</strong> {formatYear(t.endDate) || 'Not set'}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(isSystemActiveTerm)}
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                <div>
                                  {!isSystemActiveTerm && (
                                      <button
                                          onClick={() => handleSetActiveTerm(t.id)}
                                          className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-md transition"
                                      >
                                        Set as Active Term
                                      </button>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => openEditTerm(t)} className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 px-2 py-1 bg-gray-50 hover:bg-blue-50 rounded transition"><Edit2 size={12}/> Edit</button>
                                  <button onClick={() => setDeleteTarget({ type: 'term', item: t })} className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-600 px-2 py-1 bg-gray-50 hover:bg-red-50 rounded transition"><Trash2 size={12}/> Delete</button>
                                </div>
                              </div>
                            </div>
                        )
                      })}
                    </div>
                  </div>
              )}
            </div>
          </div>
        {/*</div>*/}


      </div>
      {/* --- Forms & dialogs --- */}

      {/* Create/Edit Academic Year */}
      <Drawer
        open={showYearModal}
        onClose={closeYearModal}
        title={editYearId ? 'Edit academic year' : 'New academic year'}
        subtitle="The school year that terms, classes and fees are organised under."
        footer={(
          <>
            <button onClick={closeYearModal} disabled={savingYear} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button onClick={handleSaveYear} disabled={savingYear} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {savingYear && <Loader2 size={14} className="animate-spin" />}
              {savingYear ? 'Saving…' : editYearId ? 'Save changes' : 'Create academic year'}
            </button>
          </>
        )}
      >
        {yearServerError && (
          <div role="alert" className="flex gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div><p className="font-semibold">This academic year could not be saved</p><p className="mt-0.5">{yearServerError}</p></div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts in" required htmlFor="ay-start-year">
            <select
              id="ay-start-year"
              value={yearForm.startYear}
              onChange={e => { const sy = parseInt(e.target.value, 10); setYearForm({ ...yearForm, startYear: sy, endYear: Math.max(yearForm.endYear, sy + 1) }); }}
              className={inputClass(false)}
            >
              {Array.from({ length: 10 }, (_, i) => currentYearNum - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="Ends in" required htmlFor="ay-end-year" error={yearV.errors.endYear}>
            <select
              id="ay-end-year"
              value={yearForm.endYear}
              onChange={e => { const next = { ...yearForm, endYear: parseInt(e.target.value, 10) }; setYearForm(next); if (yearV.errors.endYear) yearV.validateField('endYear', next.endYear, next); }}
              onBlur={() => yearV.validateField('endYear', yearForm.endYear, yearForm)}
              className={inputClass(!!yearV.errors.endYear)}
            >
              {Array.from({ length: 10 }, (_, i) => yearForm.startYear + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
        </div>
        <p className="text-[12px] text-gray-500 -mt-2">This will be called <strong className="text-gray-700">{yearForm.startYear}/{yearForm.endYear} Academic Year</strong>.</p>
        <Field label="First day of the year" required hint="e.g. September" htmlFor="ay-start" error={yearV.errors.startDate}>
          <input id="ay-start" type="date" value={yearForm.startDate}
            onChange={e => { const next = { ...yearForm, startDate: e.target.value }; setYearForm(next); if (yearV.errors.startDate) yearV.validateField('startDate', next.startDate, next); if (yearV.errors.endDate) yearV.validateField('endDate', next.endDate, next); }}
            onBlur={() => yearV.validateField('startDate', yearForm.startDate, yearForm)}
            className={inputClass(!!yearV.errors.startDate)} />
        </Field>
        <Field label="Last day of the year" required hint="e.g. July" htmlFor="ay-end" error={yearV.errors.endDate}>
          <input id="ay-end" type="date" value={yearForm.endDate} min={yearForm.startDate || undefined}
            onChange={e => { const next = { ...yearForm, endDate: e.target.value }; setYearForm(next); if (yearV.errors.endDate) yearV.validateField('endDate', next.endDate, next); }}
            onBlur={() => yearV.validateField('endDate', yearForm.endDate, yearForm)}
            className={inputClass(!!yearV.errors.endDate)} />
        </Field>
        <p className="text-[12px] text-gray-400"><span className="text-red-400">*</span> Required. You can add the terms (First, Second, Third) right after.</p>
      </Drawer>

      {/* Create/Edit Term */}
      <Drawer
        open={showTermModal}
        onClose={closeTermModal}
        title={editTermId ? 'Edit term' : 'Add a term'}
        subtitle={selectedYear ? `${selectedYear.name} · ${niceDate(selectedYear.startDate)} – ${niceDate(selectedYear.endDate)}` : undefined}
        footer={(
          <>
            <button onClick={closeTermModal} disabled={savingTerm} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button onClick={handleSaveTerm} disabled={savingTerm} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {savingTerm && <Loader2 size={14} className="animate-spin" />}
              {savingTerm ? 'Saving…' : editTermId ? 'Save changes' : 'Add term'}
            </button>
          </>
        )}
      >
        {termServerError && (
          <div role="alert" className="flex gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div><p className="font-semibold">This term could not be saved</p><p className="mt-0.5">{termServerError}</p></div>
          </div>
        )}
        <Field label="Which term?" required htmlFor="term-name" error={termV.errors.name}>
          <select
            id="term-name"
            value={termForm.name}
            onChange={e => {
              const selectedName = e.target.value;
              const next = { ...termForm, name: selectedName, term: selectedName.replace(/\s+/g, '_') };
              setTermForm(next);
              if (termV.errors.name) termV.validateField('name', selectedName, next);
            }}
            onBlur={() => termV.validateField('name', termForm.name, termForm)}
            className={inputClass(!!termV.errors.name)}
          >
            <option value="" disabled>Select a term</option>
            {['First Term', 'Second Term', 'Third Term'].map(term => <option key={term} value={term}>{term}</option>)}
          </select>
        </Field>
        <Field label="Term starts" required htmlFor="term-start" error={termV.errors.startDate}>
          <input id="term-start" type="date" value={termForm.startDate}
            min={toDay(selectedYear?.startDate) || undefined} max={toDay(selectedYear?.endDate) || undefined}
            onChange={e => { const next = { ...termForm, startDate: e.target.value }; setTermForm(next); if (termV.errors.startDate) termV.validateField('startDate', next.startDate, next); if (termV.errors.endDate) termV.validateField('endDate', next.endDate, next); }}
            onBlur={() => termV.validateField('startDate', termForm.startDate, termForm)}
            className={inputClass(!!termV.errors.startDate)} />
        </Field>
        <Field label="Term ends" required htmlFor="term-end" error={termV.errors.endDate}>
          <input id="term-end" type="date" value={termForm.endDate}
            min={termForm.startDate || toDay(selectedYear?.startDate) || undefined} max={toDay(selectedYear?.endDate) || undefined}
            onChange={e => { const next = { ...termForm, endDate: e.target.value }; setTermForm(next); if (termV.errors.endDate) termV.validateField('endDate', next.endDate, next); if (termV.errors.startDate) termV.validateField('startDate', next.startDate, next); }}
            onBlur={() => termV.validateField('endDate', termForm.endDate, termForm)}
            className={inputClass(!!termV.errors.endDate)} />
        </Field>
        <p className="text-[12px] text-gray-400"><span className="text-red-400">*</span> Required. Terms must sit inside the academic year and cannot overlap each other.</p>
      </Drawer>

      <ConfirmDestructiveDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        verb="Delete"
        noun={deleteTarget?.type === 'year' ? 'academic year' : 'term'}
        recordName={deleteTarget?.item?.name}
        consequence={deleteTarget?.type === 'year'
          ? 'This only works when the year has no terms and nothing is using it.'
          : 'This only works when nothing (events, fees, scores) is using the term.'}
        onConfirm={(reason) => (deleteTarget?.type === 'year'
          ? confirmDeleteYear(reason, deleteTarget.item)
          : confirmDeleteTerm(reason, deleteTarget.item))}
      />

    </div>
  );
}
