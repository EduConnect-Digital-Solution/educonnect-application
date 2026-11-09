import React, { useState, useEffect } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter
} from '../../../../components/ui/alert-dialog';
import {formatYear} from "../utils/formatters";

export default function AcademicCalendarBuilder() {
  // Academic years + terms are this page's own data — fetched directly here.
  const { refresh: refreshAcademic } = useAcademic();
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [isYearsLoading, setIsYearsLoading] = useState(true);
  const [isTermsLoading, setIsTermsLoading] = useState(false);



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
    getTerms(selectedViewYearId)
      .then(res => { if (!cancelled && res?.success) setTerms(res.data?.terms ?? []); })
      .catch(e => console.error('Failed to load terms', e))
      .finally(() => { if (!cancelled) setIsTermsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedViewYearId]);

  const loadYears = async () => {
    setIsYearsLoading(true);
    try {
      const res = await getAcademicYears();
      if (res?.success) setAcademicYears(res.data?.years ?? []);
    } catch (e) {
      console.error('Failed to load academic years', e);
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

  const handleCreateYear = async () => {
    const payload = {
      years: [
        {
          year: `${yearForm.startYear}-${yearForm.endYear}`,
          name: `${yearForm.startYear}/${yearForm.endYear} Academic Year`,
          startDate: yearForm.startDate,
          endDate: yearForm.endDate,
          isCurrent: false, // Temporary till Explanation is provided
        }
      ]
    };
    if (editYearId) {
      const res = await updateAcademicYear(editYearId, payload);
      if (res.success) {
        const updated = res.data.academicYear;
        setAcademicYears(prev => prev.map(y => (y.id === updated.id ? updated : y)));
        setShowYearModal(false);
        setEditYearId(null);
      }
    } else {
      const res = await createAcademicYear(payload);
      if (res.success) {
        const created = res.data.academicYear;
        setAcademicYears(prev => [...prev, created]);
        setShowYearModal(false);
        if (!selectedViewYearId) setSelectedViewYearId(created.id);
      }
    }
  };

  const handleDeleteYear = async (id) => {
    if (confirm('Delete this academic year? All associated terms and schedules may be affected.')) {
      const res = await deleteAcademicYear(id);
      if (res.success) {
        setAcademicYears(prev => prev.filter(y => y.id !== id));
        if (selectedViewYearId === id) setSelectedViewYearId(null);
      }
    }
  };

  const handleCreateTerm = async () => {
    if (!selectedViewYearId) return;
    // const payload = {
    //   years: [
    //     {
    //       year: `${yearForm.startYear}-${yearForm.endYear}`,
    //       name: `${yearForm.startYear}/${yearForm.endYear} Academic Year`,
    //       startDate: yearForm.startDate,
    //       endDate: yearForm.endDate,
    //       isCurrent: false, // Temporary till Explanation is provided
    //     }
    //   ]
    // };
    const payload = {
      terms: [
        {
          ...termForm,
          academicYearId: selectedViewYearId,
          "termNumber": 1, // Temporary till Explanation is provided
          isCurrent: false, // Temporary till Explanation is provided
        }
      ]
    };
    
    if (editTermId) {
      const res = await updateTerm(editTermId, payload);
      if (res.success) {
        const updated = res.data.term;
        setTerms(prev => prev.map(t => (t.id === updated.id ? updated : t)));
        setShowTermModal(false);
        setEditTermId(null);
      }
    } else {
      const res = await createTerm(payload);
      if (res.success) {
        setTerms(prev => [...prev, res.data.term]);
        setShowTermModal(false);
      }
    }
  };

  const handleDeleteTerm = async (id) => {
    if (confirm('Delete this term? All associated schedules will be affected.')) {
      const res = await deleteTerm(id);
      if (res.success) setTerms(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleSetActiveContext = async (yearId, termId) => {
    const res = await setAcademicContext(yearId);
    if (res.success) {
      fetchProfile();        // Refresh local active badges
      refreshAcademic();     // Propagate to the global academic scope
    }
  };

  const handleSetActiveTerm = async (termId) => {
    const res = await setCurrentTerm(termId);
    if (res.success) {
      fetchProfile();        // Refresh local active badges
      refreshAcademic();     // Propagate to the global academic scope
    }
  };

  const openEditYear = (y) => {
    const [sy, ey] = y.name.split('/');
    setYearForm({ ...y, startYear: parseInt(sy, 10), endYear: parseInt(ey, 10) });
    setEditYearId(y.id);
    setShowYearModal(true);
  };

  const openEditTerm = (t) => {
    setTermForm({ name: t.name, startDate: t.startDate || '', endDate: t.endDate || '' });
    setEditTermId(t.id);
    setShowTermModal(true);
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
                  onClick={() => {
                    setEditYearId(null);
                    setYearForm({ startYear: currentYearNum, endYear: currentYearNum + 1, startDate: '', endDate: '' });
                    setShowYearModal(true);
                  }}
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
                    <button onClick={() => setShowYearModal(true)} className="text-blue-600 font-medium text-sm hover:underline">Create First Year</button>
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
                                          onClick={() => handleSetActiveContext(y.id, null)}
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
                                      onClick={() => handleDeleteYear(y.id)}
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
                      onClick={() => {
                        setEditTermId(null);
                        setTermForm({ name: '', startDate: '', endDate: '' });
                        setShowTermModal(true);
                      }}
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
                    <button onClick={() => setShowTermModal(true)} className="text-blue-600 font-medium text-sm hover:underline">Add First Term</button>
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
                                  <button onClick={() => handleDeleteTerm(t.id)} className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-600 px-2 py-1 bg-gray-50 hover:bg-red-50 rounded transition"><Trash2 size={12}/> Delete</button>
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
      {/* --- Modals --- */}
      
      {/* Create/Edit Year Modal */}
      <AlertDialog open={showYearModal} onOpenChange={setShowYearModal}>
        <AlertDialogContent className="sm:max-w-[450px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{editYearId ? 'Edit Academic Year' : 'Create Academic Year'}</AlertDialogTitle>
            <AlertDialogDescription>
              Define the overarching academic year structure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase mb-1 block">Start Year</label>
                <select 
                  value={yearForm.startYear} 
                  onChange={e => {
                    const sy = parseInt(e.target.value, 10);
                    setYearForm({...yearForm, startYear: sy, endYear: Math.max(yearForm.endYear, sy + 1)});
                  }} 
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                >
                  {Array.from({length: 10}, (_, i) => currentYearNum - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase mb-1 block">End Year</label>
                <select 
                  value={yearForm.endYear} 
                  onChange={e => setYearForm({...yearForm, endYear: parseInt(e.target.value, 10)})} 
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20"
                >
                  {Array.from({length: 10}, (_, i) => yearForm.startYear + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase mb-1 block">Expected Start Date</label>
                <input type="date" value={yearForm.startDate} onChange={e => setYearForm({...yearForm, startDate: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase mb-1 block">Expected End Date</label>
                <input type="date" value={yearForm.endDate} onChange={e => setYearForm({...yearForm, endDate: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateYear} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editYearId ? 'Save Changes' : 'Create Year'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Term Modal */}
      <AlertDialog open={showTermModal} onOpenChange={setShowTermModal}>
        <AlertDialogContent className="sm:max-w-[450px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{editTermId ? 'Edit Term' : 'Add Term'}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedViewYearId && `Adding term to ${academicYears.find(y => y.id === selectedViewYearId)?.name}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs font-bold text-gray-700 uppercase mb-1 block">Term Name</label>
              <select
                  value={termForm.name}
                  onChange={e => {
                    const selectedName = e.target.value;
                    // Converts "First Term" to "first_term"
                    const termKey = selectedName.replace(/\s+/g, '_');

                    setTermForm({
                      ...termForm,
                      name: selectedName,
                      term: termKey
                    });
                  }}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="" disabled>Select a term</option>
                {["First Term", "Second Term", "Third Term"].map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase mb-1 block">Start Date</label>
                <input type="date" value={termForm.startDate} onChange={e => setTermForm({...termForm, startDate: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase mb-1 block">End Date</label>
                <input type="date" value={termForm.endDate} onChange={e => setTermForm({...termForm, endDate: e.target.value})} className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateTerm} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editTermId ? 'Save Changes' : 'Create Term'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
