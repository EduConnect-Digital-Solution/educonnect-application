import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * FormKit — the platform's form COMPONENTS (Field, FormSection, Drawer).
 * Logic helpers (inputClass, useFieldErrors, useFormDraft) live in
 * formHelpers.js; both are re-exported from the patterns barrel.
 *
 * Rules these encode:
 *   • ≤5 fields → modal/Drawer; more → dedicated page with FormSections (or a Wizard)
 *   • validation runs on blur; errors render beside the field, never only as a toast
 *   • long forms autosave drafts (useFormDraft)
 */

/* ── Field ───────────────────── */
export function Field({
    label,
    required,
    hint,
    error,
    children,           // the input element; Field decorates, doesn't own state
    htmlFor,
}) {
    return (
        <div>
            <label htmlFor={htmlFor} className="flex items-center gap-1 text-[12px] font-semibold text-gray-700 mb-1.5">
                {label}
                {required && <span className="text-red-400">*</span>}
                {hint && <span className="text-[11px] font-normal text-gray-400 ml-1">({hint})</span>}
            </label>
            {children}
            {error && (
                <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p>
            )}
        </div>
    );
}

/* ── FormSection (large forms group fields under named sections) ───────────── */
export function FormSection({ title, description, children }) {
    return (
        <section className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="mb-4">
                <h3 className="text-[14px] font-bold text-gray-900">{title}</h3>
                {description && <p className="text-[12px] text-gray-400 mt-0.5">{description}</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">{children}</div>
        </section>
    );
}

/* ── Drawer — the home of small-to-medium forms ────────────────────────────── */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-md' }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} />
            <div className={`absolute inset-y-0 right-0 w-full ${width} bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200`}>
                <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                    <div>
                        <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
                        {subtitle && <p className="text-[12px] text-gray-400 mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors">
                        <X size={17} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">{children}</div>
                {footer && (
                    <div className="flex gap-2.5 px-5 py-4 border-t border-gray-100 bg-gray-50/60 shrink-0">{footer}</div>
                )}
            </div>
        </div>,
        document.body
    );
}

/* ── Leaving a half-filled form ────────────────────────────────────────────────
 * Shown instead of closing when the form has unsaved entries. The draft is already
 * kept on this device, so "Close" is safe; "Discard" is the only way to lose it.
 */
export function LeaveFormPrompt({ open, onKeepEditing, onClose, onDiscard, hasDraft = true }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onKeepEditing?.(); } };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [open, onKeepEditing]);

    if (!open) return null;
    return createPortal(
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="leave-form-title">
            <div className="absolute inset-0 bg-gray-900/30" onClick={onKeepEditing} />
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5">
                <h2 id="leave-form-title" className="text-[15px] font-bold text-gray-900">Leave this form?</h2>
                <p className="text-[13px] text-gray-500 mt-1.5">
                    {hasDraft
                        ? 'What you typed is kept as a draft on this device for 7 days. It will be here when you open the form again.'
                        : 'What you typed has not been saved.'}
                </p>
                <div className="flex flex-col-reverse sm:flex-row gap-2 mt-5">
                    <button type="button" onClick={onDiscard} className="sm:mr-auto px-3 py-2 text-sm font-semibold rounded-lg text-red-600 hover:bg-red-50">
                        Discard
                    </button>
                    {hasDraft && (
                        <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                            Close, keep draft
                        </button>
                    )}
                    <button type="button" autoFocus onClick={onKeepEditing} className="px-3 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                        Keep editing
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

/** Notice at the top of a form that was reopened from a saved draft. */
export function DraftRestoredNotice({ savedAtLabel, onStartOver }) {
    return (
        <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            <span>Restored your unsaved draft from {savedAtLabel}.</span>
            <button type="button" onClick={onStartOver} className="shrink-0 font-semibold underline">Start over</button>
        </div>
    );
}

