import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2, Lock, ArrowRight, Clock, Sparkles, Eye,
    Rocket, PartyPopper,
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { useAuth } from '../../../../../contexts/AuthContext.jsx';
import { getOnboardingState, markGoLive } from '../../services/onboardingAPIs.js';
import useSchoolBrand from '../../hooks/useSchoolBrand.js';
import { CardGridSkeleton, pushToast } from '../../../../../components/patterns';
import ProgressRing from './ProgressRing.jsx';

import PreviewSampleModal from './PreviewSampleModal.jsx';
import GoLiveCelebration from './GoLiveCelebration.jsx';

/**
 * SetupChecklistPage — the platform's front door.
 * Plain useState + useEffect; reads the single source of truth
 * (onboardingAPIs.getOnboardingState) on mount and whenever the window
 * regains focus, so returning from a builder reflects new progress.
 */
export default function SetupChecklistPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const brand = useSchoolBrand();
    const schoolName = brand?.name || 'your school';

    const [state, setState] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showPreview, setShowPreview] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    const load = useCallback(async () => {
        try {
            const next = await getOnboardingState();
            setState(next);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load on mount, and refresh when the admin returns to this tab
    // (e.g. after completing a step in another part of the app).
    useEffect(() => {
        load();
        const onFocus = () => load();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [load]);

    const handleGoLive = () => {
        markGoLive();
        setShowCelebration(true);
        pushToast({ message: `${schoolName} is now live!` });
        load();
    };

    const firstName = user?.firstName ? `, ${user.firstName}` : '';

    return (
        <AdminLayout>
            <div className="  mx-auto px-2 py-4">
                {/* ── Welcome header ── */}
                <div className="bg-linear-to-br from-blue-600 to-blue-500 rounded-2xl p-7 text-white shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        <div className="min-w-0">
                            <p className="text-[12px] font-semibold uppercase tracking-widest text-blue-100">Welcome{firstName}</p>
                            <h1 className="text-2xl font-bold mt-1 truncate">Welcome to {schoolName}</h1>
                            <p className="text-[13px] text-blue-50 mt-2 leading-relaxed max-w-md">
                                Let's get {schoolName} running. Estimated setup time: <span className="font-semibold">~45 minutes</span> across a few sessions — your progress saves automatically.
                            </p>
                        </div>
                        <div className="flex flex-col items-center shrink-0">
                            <ProgressRing percent={state?.percent ?? 0} size={76} stroke={6}>
                                <span className="text-white text-sm font-bold">{state?.percent ?? 0}%</span>
                            </ProgressRing>
                            <p className="text-[11px] text-blue-100 mt-1.5 font-medium">
                                {state ? `${state.doneCount} of ${state.total} done` : '…'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-5">
                        <button onClick={() => setShowPreview(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[13px] font-semibold transition-colors backdrop-blur">
                            <Eye size={14} /> Preview a filled school
                        </button>
                    </div>
                </div>

                {/* ── Steps ── */}
                {loading && !state ? (
                    <div className="mt-6"><CardGridSkeleton cards={6} /></div>
                ) : (
                    <>
                        <div className="mt-6 grid lg:grid-cols-3 grid-cols-1 gap-4 space-y-3">
                            {state.steps.map((step, i) => (
                                <StepCard
                                    key={step.id}
                                    index={i + 1}
                                    step={step}
                                    onStart={() => navigate(step.route)}
                                />
                            ))}
                        </div>

                        {/* ── Go Live capstone ───────────────────────────── */}
                        <GoLiveCard
                            complete={state.complete}
                            alreadyLive={!!state.goLive}
                            onGoLive={handleGoLive}
                            onCelebrate={() => setShowCelebration(true)}
                        />
                    </>
                )}
            </div>


            {showPreview && <PreviewSampleModal onClose={() => setShowPreview(false)} />}
            {showCelebration && (
                <GoLiveCelebration schoolName={schoolName} onClose={() => setShowCelebration(false)} />
            )}
        </AdminLayout>
    );
}

// const checkMark = () => {
//     return (
//
//     )
// }

/* ─── Step card ──────────────── */
function StepCard({ index, step, onStart }) {
    const { done, locked } = step;

    return (
        <div className={`bg-white border rounded-2xl p-5 transition-all ${
            done ? 'border-green-200' : locked ? 'border-gray-100 opacity-70' : 'border-gray-200 hover:border-blue-200 hover:shadow-sm'
        }`}>
            <div className="flex items-start gap-4">
                {/* Status indicator + ring */}
                <div className="shrink-0">
                    {done
                        ?   <div className="w-11 h-11 rounded-full bg-green-50 flex items-center justify-center">
                                {/*<checkMark size={22} className="text-green-500" />*/}
                                <div className="text-green-500  w-5">
                                    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 12L11 14L15.5 9.5M7.33377 3.8187C8.1376 3.75455 8.90071 3.43846 9.51447 2.91542C10.9467 1.69486 13.0533 1.69486 14.4855 2.91542C15.0993 3.43846 15.8624 3.75455 16.6662 3.8187C18.5421 3.96839 20.0316 5.45794 20.1813 7.33377C20.2455 8.1376 20.5615 8.90071 21.0846 9.51447C22.3051 10.9467 22.3051 13.0533 21.0846 14.4855C20.5615 15.0993 20.2455 15.8624 20.1813 16.6662C20.0316 18.5421 18.5421 20.0316 16.6662 20.1813C15.8624 20.2455 15.0993 20.5615 14.4855 21.0846C13.0533 22.3051 10.9467 22.3051 9.51447 21.0846C8.90071 20.5615 8.1376 20.2455 7.33377 20.1813C5.45794 20.0316 3.96839 18.5421 3.8187 16.6662C3.75455 15.8624 3.43846 15.0993 2.91542 14.4855C1.69486 13.0533 1.69486 10.9467 2.91542 9.51447C3.43846 8.90071 3.75455 8.1376 3.8187 7.33377C3.96839 5.45794 5.45794 3.96839 7.33377 3.8187Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>

                            </div>
                        : locked
                            ? <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center"><Lock size={18} className="text-gray-400" /></div>
                            : <ProgressRing percent={0} size={44}><span className="text-[11px] font-bold text-gray-400">{index}</span></ProgressRing>}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-bold text-gray-900">{step.title}</h3>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                            <Clock size={11} /> ~{step.estMin} min
                        </span>

                        {done && <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">Done</span>}
                    </div>
                    <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">{step.description}</p>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                        <span className="font-semibold uppercase tracking-wider">Unlocks:</span> {step.unlocks}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 mt-3.5">
                        {locked ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-[12px] font-semibold text-gray-400">
                                <Lock size={12} /> Requires {step.dependsOnTitle}
                            </span>
                        ) : (
                            <button onClick={onStart}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                                    done ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}>
                                {done ? 'Review' : 'Continue setup'} <ArrowRight size={13} />
                            </button>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Go Live capstone card ──── */
function GoLiveCard({ complete, alreadyLive, onGoLive, onCelebrate }) {
    if (alreadyLive) {
        return (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <PartyPopper size={20} className="text-green-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-[15px] font-bold text-gray-900">Your school is live</h3>
                    <p className="text-[13px] text-gray-500">Your dashboard is now your home. This checklist stays available for 7 days.</p>
                </div>
                <button onClick={onCelebrate} className="px-3.5 py-2 rounded-lg bg-white border border-green-200 text-[13px] font-semibold text-green-700 hover:bg-green-100">
                    What's next
                </button>
            </div>
        );
    }

    return (
        <div className={`mt-4 rounded-2xl p-5 flex items-center gap-4 border ${
            complete ? 'bg-gradient-to-br from-blue-600 to-blue-500 border-transparent text-white' : 'bg-white border-gray-100 opacity-70'
        }`}>
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${complete ? 'bg-white/20' : 'bg-gray-100'}`}>
                {complete ? <Rocket size={20} className="text-white" /> : <Sparkles size={18} className="text-gray-400" />}
            </div>
            <div className="flex-1">
                <h3 className={`text-[15px] font-bold ${complete ? 'text-white' : 'text-gray-400'}`}>Go live</h3>
                <p className={`text-[13px] ${complete ? 'text-blue-50' : 'text-gray-400'}`}>
                    {complete ? 'Every step is done — launch your school.' : 'Finish all steps above to launch your school.'}
                </p>
            </div>
            <button onClick={onGoLive} disabled={!complete}
                className={`px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors ${
                    complete ? 'bg-white text-blue-700 hover:bg-blue-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}>
                Go live
            </button>
        </div>
    );
}
