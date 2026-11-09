import React, { useState } from 'react';
import { useTimetable } from '../TimetableContext';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import { checkConflicts, publishTimetable } from '../timetableAPIs';
import { AlertTriangle, CheckCircle2, Lock, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../../../components/ui/alert-dialog';

/**
 * PublishScheduler
 * ───────────────────────────────
 * Publish workflow component.
 * 1. Checks for conflicts locally and via backend.
 * 2. Blocks publish if errors exist.
 * 3. Shows summary (slots filled, warnings).
 * 4. Calls publish API and updates state on success.
 */
export default function PublishScheduler({ open, onOpenChange }) {
  const { state, dispatch, hasErrors, conflicts } = useTimetable();
  const { currentYear, currentTerm } = useAcademic();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);

  const warningsCount = conflicts.filter(c => c.severity === 'warning').length;
  const blocksCount = state.schedules.length;

  const handlePublish = async () => {
    if (hasErrors) return; // Guard
    try {
      setPublishing(true);
      setError(null);

      const armId = state.selectedArm?.id ?? null;

      // Build periods array with only the configuration metadata
      const periodPayload = state.periodConfig ? [state.periodConfig] : [];

      // 1. Backend validation (fail-safe)
      const checkRes = await checkConflicts({
        academicYearId: currentYear.id,
        termId: currentTerm.id,
        classId: state.selectedClass.id,
        armId,
        periods: periodPayload,
        schedules: state.schedules,
      });

      if (checkRes.data?.conflicts?.some(c => c.severity === 'error')) {
        throw new Error('Backend validation rejected the timetable due to conflicts.');
      }

      // 2. Publish
      const payload = {
        academicYearId: currentYear.id,
        termId: currentTerm.id,
        classId: state.selectedClass.id,
        armId,
        periods: periodPayload,
        schedules: state.schedules,
      };

      const res = await publishTimetable(payload);

      if (res.success) {
        dispatch({ type: 'SET_PUBLISHED', publishedAt: res.data.publishedAt });
        onOpenChange(false);
      } else {
        throw new Error('Failed to publish timetable.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            Publish Timetable
          </AlertDialogTitle>
          <AlertDialogDescription>
            Publishing this timetable will lock it and make it live for teachers and students.
            Ensure everything is correct before proceeding.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{blocksCount}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">Periods Scheduled</p>
            </div>
            <div className={`${warningsCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'} p-3 rounded-lg border`}>
              <p className={`text-2xl font-bold ${warningsCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{warningsCount}</p>
              <p className={`text-xs font-semibold uppercase tracking-wider mt-1 ${warningsCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>Warnings</p>
            </div>
          </div>

          {hasErrors ? (
            <div className="flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Cannot publish due to conflicts.</p>
                <p className="opacity-80 mt-1">Please resolve all error-level conflicts in the inspector before publishing.</p>
              </div>
            </div>
          ) : warningsCount > 0 ? (
           <div className="flex items-start gap-3 p-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Publishing with warnings.</p>
                <p className="opacity-80 mt-1">There are active warnings. You can still publish, but you may want to review them first.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Ready to publish.</p>
                <p className="opacity-80 mt-1">No conflicts detected.</p>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">{error}</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={publishing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={e => {
              e.preventDefault();
              handlePublish();
            }}
            disabled={hasErrors || publishing}
            className={`${hasErrors ? 'opacity-50 cursor-not-allowed' : ''} bg-blue-600 hover:bg-blue-700`}
          >
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              'Publish Timetable'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
