import React from 'react';
import { Link } from 'react-router-dom';
import { Inbox, SearchX, AlertTriangle, ArrowRight, RotateCw } from 'lucide-react';

/**
 * EmptyState — no screen in the platform is ever blank.
 *
 * Three variants:
 *   first-use — what the feature does + the named, linked prerequisite
 *   filtered  — no results for the active filters + one-click clear
 *   error     — honest failure + retry
 */
export default function EmptyState({
    variant = 'first-use',          // 'first-use' | 'filtered' | 'error'
    icon,                            // optional override
    title,
    description,
    /** first-use: { label, to } or { label, onClick } */
    action,
    /** first-use: named missing prerequisite, e.g. { label: 'Create classes first', to: '…' } */
    prerequisite,
    /** filtered */
    onClearFilters,
    /** error */
    onRetry,
    compact = false,
}) {
    const defaults = {
        'first-use': { icon: Inbox,        title: 'Nothing here yet' },
        filtered:    { icon: SearchX,      title: 'No results match your filters' },
        error:       { icon: AlertTriangle, title: 'Something went wrong' },
    }[variant] ?? {};

    const Icon = icon ?? defaults.icon ?? Inbox;
    const heading = title ?? defaults.title;

    const iconTone = variant === 'error'
        ? 'bg-red-50 text-red-400'
        : variant === 'filtered'
            ? 'bg-gray-100 text-gray-400'
            : 'bg-blue-50 text-blue-500';

    return (
        <div className={`flex flex-col items-center justify-center text-center px-6 ${compact ? 'py-10' : 'py-16'}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${iconTone}`}>
                <Icon size={22} />
            </div>

            <h3 className="text-[15px] font-bold text-gray-900">{heading}</h3>
            {description && (
                <p className="mt-1.5 text-[13px] text-gray-500 leading-relaxed max-w-sm">{description}</p>
            )}

            {/* first-use: prerequisite called out by name, deep-linked */}
            {variant === 'first-use' && prerequisite && (
                <Link
                    to={prerequisite.to}
                    className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[13px] font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                >
                    {prerequisite.label}
                    <ArrowRight size={13} />
                </Link>
            )}

            {variant === 'first-use' && action && (
                action.to ? (
                    <Link
                        to={action.to}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 shadow-sm transition-colors"
                    >
                        {action.label}
                    </Link>
                ) : (
                    <button
                        onClick={action.onClick}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 shadow-sm transition-colors"
                    >
                        {action.label}
                    </button>
                )
            )}

            {variant === 'filtered' && onClearFilters && (
                <button
                    onClick={onClearFilters}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Clear filters
                </button>
            )}

            {variant === 'error' && (
                <div className="mt-4 flex items-center gap-2">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors"
                        >
                            <RotateCw size={13} /> Retry
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
