import React from 'react';
import { CircleDot } from 'lucide-react';
import { CHIP_TONES } from './statusTokens.js';

/**
 * Timeline — the reusable lifecycle/activity trail.
 * Trust comes from visible history: every entry shows who, when, what, and why.
 *
 * items: [{ title, user, at, comment, tone, icon }]
 *   title   — what happened ("Submitted", "Returned with comment")
 *   user    — who did it
 *   at      — ISO date/string
 *   comment — the "why", shown as a quoted note
 *   tone    — chip tone for the marker (gray|blue|amber|green|red|purple)
 *   icon    — optional lucide icon override
 */

function formatWhen(at) {
    if (!at) return '';
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return String(at);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Timeline({ items = [], emptyLabel = 'No activity recorded yet.' }) {
    if (!items.length) {
        return <p className="text-[13px] text-gray-400 py-3">{emptyLabel}</p>;
    }

    return (
        <ol className="relative space-y-0">
            {items.map((item, i) => {
                const toneClass = CHIP_TONES[item.tone ?? 'gray'];
                const Icon = item.icon ?? CircleDot;
                const last = i === items.length - 1;
                return (
                    <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                        {/* rail */}
                        {!last && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-gray-100" />}
                        <span className={`relative z-10 w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${toneClass}`}>
                            <Icon size={13} />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                            <p className="text-[13px] font-semibold text-gray-800 leading-snug">{item.title}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                {item.user && <span className="font-medium text-gray-500">{item.user}</span>}
                                {item.user && item.at && ' · '}
                                {formatWhen(item.at)}
                            </p>
                            {item.comment && (
                                <p className="mt-1.5 text-[12px] text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 leading-relaxed">
                                    “{item.comment}”
                                </p>
                            )}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
