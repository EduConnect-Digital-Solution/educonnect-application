import React, { useState } from 'react';
import { useTimetable } from '../TimetableContext';
import { Copy, AlertCircle, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../../../components/ui/alert-dialog';

/**
 * DuplicateWizard
 * ───────────────────────────────
 * Modal dialog to copy a schedule from the currently selected class to another.
 */
export default function DuplicateWizard({ open, onOpenChange, resources }) {
  const { state, dispatch } = useTimetable();
  const { classes = [] } = resources || {};
  const [targetClassId, setTargetClassId] = useState('');

  if (!state.selectedClass || state.schedules.length === 0) return null;

  const targetClass = classes.find(c => c.id === targetClassId);

  const handleDuplicate = () => {
    if (!targetClass) return;

    dispatch({
      type: 'PASTE_SCHEDULES',
      targetClass,
      targetArm: null, // DuplicateWizard copies to a whole class; arm must be chosen after
      entries: state.schedules,
    });

    // Automatically switch to the target class
    dispatch({ type: 'SET_TARGET_CLASS', payload: targetClass });
    onOpenChange(false);
    setTargetClassId('');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader className="flex flex-row items-center justify-between">
          <AlertDialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-blue-600" />
            Duplicate Timetable
          </AlertDialogTitle>
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </AlertDialogHeader>

        <div className="py-2 space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Source: {state.selectedClass.name}</p>
            <p className="text-xs text-gray-500 mt-1">{state.schedules.length} scheduled periods</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Copy to class:</label>
            <select
              value={targetClassId}
              onChange={e => setTargetClassId(e.target.value)}
              className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Select a destination class...</option>
              {classes.filter(c => c.id !== state.selectedClass.id).map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-start gap-3 p-3 bg-blue-50 text-blue-800 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <p>Duplicating will completely replace any existing unsaved draft for the destination class.</p>
              <p className="mt-1 font-semibold">Note: Teacher assignments are NOT copied over, as teachers may differ between classes.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDuplicate}
            disabled={!targetClassId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Copy className="w-4 h-4" /> Duplicate & Switch
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
