import React, { useState, useEffect, useCallback } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, X, PartyPopper } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Wizard — the universal stepper framework.
 *
 * One major decision per step. Named steps, numbered progress, checkmarks,
 * Save & Exit with resume, a review step before commit, and a success screen.
 *
 * <Wizard
 *   storageKey="fee-structure"             // enables save & resume
 *   steps={[
 *     { id:'scope', title:'Scope', render:({data,update,errors})=>…, validate:(data)=>({field:'msg'})|null },
 *     …
 *   ]}
 *   renderReview={(data) => <SummaryView data={data} />}
 *   onSubmit={async (data) => { … }}
 *   success={{ title, description, links:[{label,to}] }}
 *   onExit={() => navigate(back)}
 *   initialData={{}}
 * />
 */
export default function Wizard({
    storageKey,
    steps = [],
    renderReview,
    onSubmit,
    success,
    onExit,
    initialData = {},
    submitLabel = 'Submit',
}) {
    const persistKey = storageKey ? `wizard:${storageKey}` : null;

    const [state, setState] = useState(() => {
        if (persistKey) {
            try {
                const saved = JSON.parse(localStorage.getItem(persistKey));
                if (saved?.data) return { stepIndex: saved.stepIndex ?? 0, data: { ...initialData, ...saved.data } };
            } catch { /* ignore */ }
        }
        return { stepIndex: 0, data: initialData };
    });
    const [errors, setErrors] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [done, setDone] = useState(false);

    const allSteps = renderReview
        ? [...steps, { id: '__review', title: 'Review', isReview: true }]
        : steps;
    const { stepIndex, data } = state;
    const step = allSteps[stepIndex];
    const isLast = stepIndex === allSteps.length - 1;

    // Persist on change (save & resume)
    useEffect(() => {
        if (!persistKey || done) return;
        localStorage.setItem(persistKey, JSON.stringify({ stepIndex, data }));
    }, [persistKey, stepIndex, data, done]);

    const update = useCallback((patch) => {
        setState(prev => ({ ...prev, data: { ...prev.data, ...patch } }));
        setErrors(null);
    }, []);

    const goTo = (index) => {
        // only allow jumping back, or forward through validated steps
        if (index < stepIndex) {
            setErrors(null);
            setState(prev => ({ ...prev, stepIndex: index }));
        }
    };

    const next = () => {
        if (step.validate) {
            const stepErrors = step.validate(data);
            if (stepErrors && Object.keys(stepErrors).length) {
                setErrors(stepErrors);
                return;
            }
        }
        setErrors(null);
        setState(prev => ({ ...prev, stepIndex: Math.min(prev.stepIndex + 1, allSteps.length - 1) }));
    };

    const back = () => {
        setErrors(null);
        setState(prev => ({ ...prev, stepIndex: Math.max(prev.stepIndex - 1, 0) }));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setSubmitError(null);
        try {
            await onSubmit?.(data);
            if (persistKey) localStorage.removeItem(persistKey);
            setDone(true);
        } catch (e) {
            setSubmitError(e?.message || 'Something went wrong — your progress is saved.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleExit = () => {
        // progress is already persisted — exiting is always safe
        onExit?.();
    };

    /* ── Success screen ────── */
    if (done) {
        return (
            <div className="flex justify-center py-12 px-4">
                <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="mx-auto w-14 h-14 rounded-full bg-green-50 text-green-500 flex items-center justify-center ring-8 ring-green-50/60">
                        <PartyPopper size={24} />
                    </div>
                    <h2 className="mt-4 text-lg font-bold text-gray-900">{success?.title ?? 'All done'}</h2>
                    {success?.description && (
                        <p className="mt-1.5 text-[13px] text-gray-500 leading-relaxed">{success.description}</p>
                    )}
                    {success?.links?.length > 0 && (
                        <div className="mt-6 flex flex-col gap-2">
                            {success.links.map((link, i) => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors ${
                                        i === 0
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* ── Stepper header ─────── */}
            <div className="flex items-center justify-between mb-6">
                <ol className="flex items-center gap-1 overflow-x-auto">
                    {allSteps.map((s, i) => {
                        const completed = i < stepIndex;
                        const current = i === stepIndex;
                        return (
                            <li key={s.id} className="flex items-center shrink-0">
                                <button
                                    onClick={() => goTo(i)}
                                    disabled={i > stepIndex}
                                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors ${
                                        completed ? 'cursor-pointer hover:bg-gray-100' : current ? '' : 'cursor-default'
                                    }`}
                                >
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${
                                        completed ? 'bg-blue-600 text-white'
                                        : current ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}>
                                        {completed ? <Check size={12} strokeWidth={3} /> : i + 1}
                                    </span>
                                    <span className={`text-[12px] font-semibold whitespace-nowrap ${
                                        current ? 'text-gray-900' : completed ? 'text-gray-600' : 'text-gray-300'
                                    }`}>
                                        {s.title}
                                    </span>
                                </button>
                                {i < allSteps.length - 1 && <span className="w-4 h-px bg-gray-200 mx-0.5 shrink-0" />}
                            </li>
                        );
                    })}
                </ol>

                {onExit && (
                    <button
                        onClick={handleExit}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
                        title="Your progress is saved — you can resume later"
                    >
                        <X size={13} /> Save & exit
                    </button>
                )}
            </div>

            {/* ── Step body ─── */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 min-h-[280px]">
                {step.isReview
                    ? renderReview(data)
                    : step.render({ data, update, errors: errors ?? {} })}
            </div>

            {submitError && (
                <p className="mt-3 text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {submitError}
                </p>
            )}

            {/* ── Footer nav ── */}
            <div className="flex items-center justify-between mt-5">
                <button
                    onClick={back}
                    disabled={stepIndex === 0}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft size={15} /> Back
                </button>

                {isLast ? (
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm"
                    >
                        {submitting && <Loader2 size={14} className="animate-spin" />}
                        {submitLabel}
                    </button>
                ) : (
                    <button
                        onClick={next}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Continue <ChevronRight size={15} />
                    </button>
                )}
            </div>
        </div>
    );
}
