import React, { useState } from 'react';
import { ChevronDown, Check, CornerUpLeft, ClipboardCheck, Loader2 } from 'lucide-react';
import StatusChip from './StatusChip.jsx';
import Timeline from './Timeline.jsx';
import EmptyState from './EmptyState.jsx';
// (statusTone/CHIP_TONES come via StatusChip + Timeline, not needed directly here)

/**
 * ApprovalInbox — the single approval experience.
 *
 * Approvals are never scattered across modules; they queue here, grouped by
 * type. Every decision records who, when, why — forever.
 *
 * groups: [{
 *   id, label, description,
 *   items: [{
 *     id, title, subtitle, status, submittedBy, submittedAt,
 *     detail (node), history ([Timeline items]),
 *     onApprove(comment?), onReturn(comment),
 *   }],
 * }]
 */
export default function ApprovalInbox({ groups = [], onBulkApprove }) {
    const [openItems, setOpenItems] = useState({});
    const [comments, setComments] = useState({});
    const [busy, setBusy] = useState({});

    const totalItems = groups.reduce((n, g) => n + g.items.length, 0);

    const toggle = (id) => setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));

    const act = async (item, kind) => {
        const comment = (comments[item.id] ?? '').trim();
        if (kind === 'return' && !comment) {
            setComments(prev => ({ ...prev, [`${item.id}:error`]: 'A comment is required when returning.' }));
            return;
        }
        setBusy(prev => ({ ...prev, [item.id]: true }));
        try {
            if (kind === 'approve') await item.onApprove?.(comment);
            else await item.onReturn?.(comment);
        } finally {
            setBusy(prev => ({ ...prev, [item.id]: false }));
        }
    };

    if (totalItems === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-2xl">
                <EmptyState
                    variant="first-use"
                    icon={ClipboardCheck}
                    title="Nothing waiting on you"
                    description="Result sheets, fee waivers, excuse notes, promotion lists, and report cards will queue here for your sign-off as those workflows go live."
                />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {groups.filter(g => g.items.length > 0).map(group => (
                <section key={group.id}>
                    <div className="flex items-center justify-between mb-2.5 px-1">
                        <div>
                            <h2 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
                                {group.label}
                                <span className="h-[18px] min-w-[18px] px-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">
                                    {group.items.length}
                                </span>
                            </h2>
                            {group.description && <p className="text-[12px] text-gray-400">{group.description}</p>}
                        </div>
                        {onBulkApprove && group.items.length > 1 && (
                            <button
                                onClick={() => onBulkApprove(group)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-[12px] font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                <Check size={13} /> Approve all {group.items.length}
                            </button>
                        )}
                    </div>

                    <div className="space-y-2">
                        {group.items.map(item => {
                            const open = !!openItems[item.id];
                            const isBusy = !!busy[item.id];
                            const commentError = comments[`${item.id}:error`];
                            return (
                                <div key={item.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                                    {/* Card header */}
                                    <button onClick={() => toggle(item.id)}
                                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/60 transition-colors">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] font-bold text-gray-900 truncate">{item.title}</p>
                                            <p className="text-[12px] text-gray-400 truncate">
                                                {item.subtitle}
                                                {item.submittedBy && <> · submitted by <span className="font-medium text-gray-500">{item.submittedBy}</span></>}
                                            </p>
                                        </div>
                                        {item.status && <StatusChip status={item.status} />}
                                        <ChevronDown size={16} className={`text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Expanded body */}
                                    {open && (
                                        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                                            {item.detail}

                                            {item.history?.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">History</p>
                                                    <Timeline items={item.history} />
                                                </div>
                                            )}

                                            <div>
                                                <textarea
                                                    value={comments[item.id] ?? ''}
                                                    onChange={e => setComments(prev => ({ ...prev, [item.id]: e.target.value, [`${item.id}:error`]: null }))}
                                                    rows={2}
                                                    placeholder="Comment (required when returning)…"
                                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-blue-400 text-sm outline-none resize-none"
                                                />
                                                {commentError && <p className="mt-1 text-[11px] font-medium text-red-500">{commentError}</p>}
                                            </div>

                                            <div className="flex gap-2.5">
                                                <button
                                                    disabled={isBusy}
                                                    onClick={() => act(item, 'return')}
                                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                                                    <CornerUpLeft size={13} /> Return with comment
                                                </button>
                                                <button
                                                    disabled={isBusy}
                                                    onClick={() => act(item, 'approve')}
                                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-white text-[13px] font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
                                                    {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                                    Approve
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}
