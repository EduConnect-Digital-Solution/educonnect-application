import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

/**
 * ConfirmDestructiveDialog — the platform standard for destructive actions.
 *
 * Every destructive action must: confirm, type the record name, give a reason.
 * The reason is passed to onConfirm so the caller records it in audit history.
 *
 * <ConfirmDestructiveDialog
 *     open={open} onClose={...}
 *     verb="Delete" noun="student"
 *     recordName="Ada Okafor"
 *     consequence="Their record will be removed from rosters and reports."
 *     onConfirm={async (reason) => { … }}
 * />
 */
export default function ConfirmDestructiveDialog({
    open,
    onClose,
    verb = 'Delete',
    noun = 'record',
    recordName,
    consequence,
    requireReason = true,
    onConfirm,
}) {
    const [typed, setTyped] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) { setTyped(''); setReason(''); setBusy(false); setError(null); }
    }, [open]);

    if (!open) return null;

    const nameMatches = typed.trim() === String(recordName ?? '').trim();
    const canConfirm = nameMatches && (!requireReason || reason.trim().length > 0) && !busy;

    const handleConfirm = async () => {
        setBusy(true);
        setError(null);
        try {
            await onConfirm?.(reason.trim());
            onClose?.();
        } catch (e) {
            setError(e?.message || `Failed to ${verb.toLowerCase()} ${noun}.`);
            setBusy(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-gray-900/40" onClick={() => !busy && onClose?.()} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start gap-3 p-5 border-b border-gray-100">
                    <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                        <AlertTriangle size={17} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-[15px] font-bold text-gray-900">{verb} {noun}?</h2>
                        <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
                            You are about to {verb.toLowerCase()} <span className="font-semibold text-gray-800">{recordName}</span>.
                            {consequence && <> {consequence}</>} This action is recorded in the audit history.
                        </p>
                    </div>
                    <button onClick={() => !busy && onClose?.()} className="p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                            Type <span className="text-gray-700 normal-case font-bold">{recordName}</span> to confirm
                        </label>
                        <input
                            value={typed}
                            onChange={e => setTyped(e.target.value)}
                            placeholder={recordName}
                            autoFocus
                            className={`w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors ${
                                typed && !nameMatches
                                    ? 'border-red-300 focus:border-red-400 bg-red-50/40'
                                    : 'border-gray-200 focus:border-blue-400 bg-white'
                            }`}
                        />
                        {typed && !nameMatches && (
                            <p className="mt-1 text-[11px] font-medium text-red-500">Name doesn't match yet.</p>
                        )}
                    </div>

                    {requireReason && (
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                Reason <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                rows={2}
                                placeholder={`Why are you ${verb.toLowerCase().replace(/e$/, '')}ing this ${noun}?`}
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-400 text-sm outline-none resize-none"
                            />
                        </div>
                    )}

                    {error && (
                        <p className="text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                    )}
                </div>

                <div className="flex gap-2.5 px-5 py-4 bg-gray-50/70 border-t border-gray-100">
                    <button
                        onClick={() => !busy && onClose?.()}
                        className="flex-1 py-2.5 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!canConfirm}
                        onClick={handleConfirm}
                        className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        {busy && <Loader2 size={14} className="animate-spin" />}
                        {verb}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
