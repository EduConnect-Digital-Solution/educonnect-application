import React, { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronDown, Check } from 'lucide-react';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';

/**
 * ScopePill — the always-visible academic scope (Year · Term).
 * Opens a popover to switch the global scope; every page reads it via useAcademic().
 */
export default function ScopePill() {
    const { loading, academicYears, currentYear, terms, currentTerm, selectYear, selectTerm } = useAcademic();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    if (loading) {
        return <div className="h-8 w-36 rounded-full bg-gray-100 animate-pulse" />;
    }

    const isReadOnly = !!currentTerm && !currentTerm.isCurrent;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className={`flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-full border text-xs font-semibold transition-colors ${
                    isReadOnly
                        ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
                title="Academic scope — every page reflects this year and term"
            >
                <CalendarDays size={13} className={isReadOnly ? 'text-amber-500' : 'text-blue-500'} />
                <span className="whitespace-nowrap">
                    {currentYear?.name ?? 'No academic year'}
                    {currentTerm && <span className="text-gray-400 font-medium"> · </span>}
                    {currentTerm?.name}
                </span>
                <ChevronDown size={13} className="text-gray-400" />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-900">Academic scope</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Every page reflects the year and term selected here.</p>
                    </div>

                    <div className="max-h-44 overflow-y-auto py-1">
                        <p className="px-4 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Year</p>
                        {academicYears.map(y => (
                            <button
                                key={y.id}
                                onClick={() => selectYear(y.id)}
                                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                                    currentYear?.id === y.id ? 'text-blue-700 font-semibold bg-blue-50/60' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span>{y.name}{y.isActive ? <span className="ml-1.5 text-[10px] font-bold text-green-600 uppercase">Active</span> : null}</span>
                                {currentYear?.id === y.id && <Check size={14} className="text-blue-500" />}
                            </button>
                        ))}
                        {academicYears.length === 0 && (
                            <p className="px-4 py-2 text-xs text-gray-400">No academic years yet.</p>
                        )}
                    </div>

                    <div className="max-h-44 overflow-y-auto py-1 border-t border-gray-100">
                        <p className="px-4 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Term</p>
                        {terms.map(t => (
                            <button
                                key={t.id}
                                onClick={() => { selectTerm(t.id); setOpen(false); }}
                                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                                    currentTerm?.id === t.id ? 'text-blue-700 font-semibold bg-blue-50/60' : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span>{t.name}{t.isCurrent ? <span className="ml-1.5 text-[10px] font-bold text-green-600 uppercase">Current</span> : null}</span>
                                {currentTerm?.id === t.id && <Check size={14} className="text-blue-500" />}
                            </button>
                        ))}
                        {terms.length === 0 && (
                            <p className="px-4 py-2 text-xs text-gray-400">No terms in this year yet.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * ReadOnlyScopeBanner — persistent contextual banner shown under the topbar
 * whenever the selected term is not the school's current term.
 */
export function ReadOnlyScopeBanner() {
    const { currentYear, currentTerm, terms, selectTerm } = useAcademic();

    if (!currentTerm || currentTerm.isCurrent) return null;

    const liveTerm = terms.find(t => t.isCurrent);

    return (
        <div className="flex items-center justify-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800">
            <span className="text-xs font-semibold">
                Viewing {currentYear?.name ?? ''} — {currentTerm.name} <span className="font-bold">(read only)</span>
            </span>
            {liveTerm && (
                <button
                    onClick={() => selectTerm(liveTerm.id)}
                    className="text-xs font-bold underline underline-offset-2 hover:text-amber-950 transition-colors"
                >
                    Return to current term
                </button>
            )}
        </div>
    );
}
