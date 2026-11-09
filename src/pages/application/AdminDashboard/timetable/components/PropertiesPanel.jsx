import React, { useState } from 'react';
import { useTimetable } from '../TimetableContext';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import { Save, Lock, AlertTriangle, AlertCircle, Edit2, X, RefreshCw, ChevronDown, Trash2 } from 'lucide-react';
import ConflictInspector from './ConflictInspector';
import PublishScheduler from './PublishScheduler';
import DuplicateWizard from './DuplicateWizard';
import {deleteTimetableDraft} from "../timetableAPIs.js";

/**
 * PropertiesPanel
 * ───────────────────────────────
 * The right-hand inspector panel.
 * Shows context-sensitive details based on selection, plus global publish controls.
 */
export default function PropertiesPanel({ resources }) {
  const { state, dispatch, hasErrors, conflicts } = useTimetable();
  const { currentTerm } = useAcademic();
  const [showPublish, setShowPublish] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { selectedEntry, isPublished, lastSavedAt, isSaving } = state;

  const handleStartAfresh = async () => {
    if (!confirm('Are you sure you want to delete this draft and start entirely from scratch? This will destroy all scheduled blocks and reset the grid structure.')) return;
    
    setIsDeleting(true);
    try {
      await deleteTimetableDraft(state.selectedClass.id, currentTerm.id);
      dispatch({ type: 'CLEAR_PERIODS_AND_SCHEDULES' });
    } catch (err) {
      console.error(err);
      alert('Failed to delete draft.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full shrink-0 overflow-y-auto hidden xl:flex">
      
      {/* Top Header Controls */}
      <div className="p-4 border-b border-gray-100 shrink-0 space-y-4 bg-gray-50/50">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Properties</h2>
          {isPublished ? (
             <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 rounded-full flex items-center gap-1">
               <Lock size={10} /> Published
             </span>
          ) : (
            <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 rounded-full flex items-center gap-1">
               <Edit2 size={10} /> Draft
             </span>
          )}
        </div>

        {/* Global Controls */}
        <div className="flex flex-col gap-2">
          {isPublished ? (
            <button
               onClick={() => {
                 if (confirm('Unlock this timetable? This will switch it back to a draft state, but WILL NOT unpublish the current live version until you publish again.')) {
                   dispatch({ type: 'SET_DRAFT', schedules: state.schedules, draftId: state.draftId });
                 }
               }}
               className="w-full py-2 bg-white text-gray-700 border border-gray-300 font-medium text-sm rounded-lg hover:bg-gray-50 flex justify-center items-center gap-2"
            >
              <Edit2 size={14} /> Unlock to Edit
            </button>
          ) : (
            <button
               onClick={() => setShowPublish(true)}
               disabled={!state.selectedClass || state.schedules.length === 0}
               className="w-full py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-sm"
            >
              <Save size={14} /> Publish Timetable
            </button>
          )}

          {!isPublished && (
            <button
              onClick={() => setShowDuplicate(true)}
              disabled={!state.selectedClass || state.schedules.length === 0}
              className="w-full py-1.5 text-xs text-gray-600 font-medium hover:bg-gray-100 rounded flex justify-center items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={12} /> Duplicate to another class
            </button>
          )}

          {!isPublished && (
             <button
              onClick={handleStartAfresh}
              disabled={isDeleting}
              className="w-full py-1.5 text-xs text-red-600 font-medium hover:bg-red-50 rounded flex justify-center items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isDeleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />} 
              Start Afresh (Delete Draft)
            </button>
          )}

          {/* Sync indicator */}
          {!isPublished && (lastSavedAt || isSaving) && (
            <p className="text-[10px] text-gray-400 text-center font-medium mt-1 flex justify-center items-center gap-1">
              {isSaving ? (
                <><RefreshCw size={10} className="animate-spin" /> Saving draft...</>
              ) : (
                `Draft saved ${new Date(lastSavedAt).toLocaleTimeString()}`
              )}
            </p>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-6">

        {/* Selected block properties (contextual) */}
        {selectedEntry ? (
          <SelectionEditor entry={selectedEntry} dispatch={dispatch} state={state} resources={resources} />
        ) : (
           <div className="p-4 bg-gray-50 border border-gray-100 border-dashed rounded-xl text-center">
             <p className="text-xs text-gray-500">Select a schedule block on the grid to edit its properties.</p>
           </div>
        )}

        {/* Global Conflicts Inspector */}
        <div>
          <div className="flex items-center justify-between mb-3 border-t border-gray-100 pt-4">
             <h3 className="font-bold text-gray-800 text-sm">Conflict Inspector</h3>
             {conflicts.length > 0 && (
               <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{conflicts.length}</span>
             )}
          </div>
          <ConflictInspector 
            conflicts={conflicts} 
            onJumpTo={(id) => dispatch({ type: 'SELECT_ENTRY', id })} 
          />
        </div>

      </div>

      {/* Modals */}
      <PublishScheduler open={showPublish} onOpenChange={setShowPublish} />
      <DuplicateWizard open={showDuplicate} onOpenChange={setShowDuplicate} resources={resources} />
    </div>
  );
}

// ─── Inline Editor for Selected Entry ────
function SelectionEditor({ entry, dispatch, state, resources }) {
  const isReadOnly = state.isPublished;
  const { teachers = [], rooms = [] } = resources || {};

  const handleChange = (field, value) => {
    dispatch({
      type: 'UPDATE_SCHEDULE_ENTRY',
      payload: { id: entry.id, [field]: value }
    });
  };

  const handleTeacherChange = (e) => {
    const tid = e.target.value;
    const t = teachers.find(x => x.id === tid);
    dispatch({
      type: 'UPDATE_SCHEDULE_ENTRY',
      payload: { id: entry.id, teacherId: tid || null, teacherName: t ? t.name : null }
    });
  };

  const handleRoomChange = (e) => {
    const r = e.target.value;
    dispatch({
      type: 'UPDATE_SCHEDULE_ENTRY',
      payload: { id: entry.id, roomId: r || null, roomName: r || null }
    });
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-200">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-1">Editing Settings</div>
          <h3 className="font-bold text-gray-900 leading-tight">{entry.subjectName}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{entry.dayOfWeek}, {entry.startTime} – {entry.endTime}</p>
        </div>
        <button 
          onClick={() => dispatch({ type: 'DESELECT_ENTRY' })}
          className="p-1 hover:bg-gray-100 rounded text-gray-400"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3">
        {/* Subject (readonly field for now, drag-replace to change) */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Subject</label>
          <div className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 font-medium">
            {entry.subjectName}
          </div>
        </div>

        {/* Teacher */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Assigned Teacher</label>
          <select
            disabled={isReadOnly}
            value={entry.teacherId || ''}
            onChange={handleTeacherChange}
            className="w-full p-2 bg-white border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-gray-50"
          >
            <option value="">-- Unassigned --</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Room */}
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Assigned Room</label>
          <select
            disabled={isReadOnly}
            value={entry.roomId || ''}
            onChange={handleRoomChange}
             className="w-full p-2 bg-white border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-gray-50"
          >
            <option value="">-- Unassigned --</option>
            {rooms.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
      
      {!isReadOnly && (
         <button 
           onClick={() => dispatch({ type: 'REMOVE_SCHEDULE_ENTRY', id: entry.id })}
           className="w-full py-2 mt-2 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 transition border border-red-100 flex justify-center items-center gap-1.5"
         >
           <X size={14} /> Remove from schedule
         </button>
      )}
    </div>
  );
}
