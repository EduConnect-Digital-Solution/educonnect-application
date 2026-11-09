import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import StatusChip from './StatusChip.jsx';
import Avatar from './Avatar.jsx';
import { DetailSkeleton } from './Skeletons.jsx';

/**
 * DetailPage — the universal detail experience.
 *
 * Every entity (student, staff, guardian, class, invoice, report card,
 * incident, announcement) renders through this template:
 *   header (avatar/icon · name · ID · status chip · breadcrumb · actions · overflow)
 *   stats strip (3–5 numbers)
 *   content tabs
 *   desktop right rail (metadata · timeline · notes)
 *
 * Row clicks land here. Never a row-detail modal.
 */
export default function DetailPage({
    loading = false,
    breadcrumb = [],            // [{ label, to? }] — last item is the current page
    avatar,                     // { name } → initials, or { icon: Icon, tone }
    title,
    subtitle,
    idLabel,                    // e.g. admission no. / invoice no.
    status,                     // string or { tone, label }
    primaryActions = [],        // [{ id, label, icon?, onClick, variant?:'primary'|'outline' }]
    overflowActions = [],       // [{ id, label, icon?, onClick, destructive? }]
    stats = [],                 // [{ label, value, hint?, tone? }]
    tabs = [],                  // [{ id, label, badge?, content }]
    rail,                       // right-rail node (metadata, <Timeline/>, notes)
    defaultTab,
}) {
    const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id);
    const [overflowOpen, setOverflowOpen] = useState(false);

    if (loading) return <DetailSkeleton />;

    const AvatarIcon = avatar?.icon;
    const current = tabs.find(t => t.id === activeTab) ?? tabs[0];

    return (
        <div className="space-y-4">
            {/* ── Breadcrumb ──────── */}
            {breadcrumb.length > 0 && (
                <nav className="flex items-center gap-1.5 px-1 text-[13px]">
                    {breadcrumb.map((crumb, i) => {
                        const last = i === breadcrumb.length - 1;
                        return (
                            <React.Fragment key={i}>
                                {crumb.to && !last ? (
                                    <Link to={crumb.to} className="font-semibold text-gray-500 hover:text-blue-700 transition-colors">
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className={`font-semibold ${last ? 'text-gray-900' : 'text-gray-500'}`}>{crumb.label}</span>
                                )}
                                {!last && <ChevronRight size={13} className="text-gray-300" />}
                            </React.Fragment>
                        );
                    })}
                </nav>
            )}

            {/* ── Header + stats strip ─────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-2xl">
                <div className="flex flex-wrap items-center gap-4 p-5">
                    {/* Avatar / icon — people use the shared Avatar; entities use an icon tile */}
                    {AvatarIcon ? (
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                            <AvatarIcon size={24} />
                        </div>
                    ) : (avatar?.name || avatar?.image) ? (
                        <Avatar name={avatar?.name ?? title} src={avatar?.image} size={56} rounded="lg" />
                    ) : null}

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-bold text-gray-900 truncate">{title}</h1>
                            {status && (typeof status === 'string'
                                ? <StatusChip status={status} />
                                : <StatusChip tone={status.tone}>{status.label}</StatusChip>)}
                        </div>
                        <p className="text-[13px] text-gray-400 mt-0.5 truncate">
                            {idLabel && <span className="font-semibold text-gray-500">{idLabel}</span>}
                            {idLabel && subtitle && ' · '}
                            {subtitle}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        {primaryActions.map(action => (
                            <button key={action.id} onClick={action.onClick}
                                className={`flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold transition-colors ${
                                    action.variant === 'outline'
                                        ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                }`}>
                                {action.icon && <action.icon size={14} />}
                                {action.label}
                            </button>
                        ))}
                        {overflowActions.length > 0 && (
                            <div className="relative">
                                <button onClick={() => setOverflowOpen(o => !o)}
                                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                                    <MoreHorizontal size={16} />
                                </button>
                                {overflowOpen && (
                                    <>
                                        <div className="fixed inset-0 z-20" onClick={() => setOverflowOpen(false)} />
                                        <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1">
                                            {overflowActions.map(action => (
                                                <button key={action.id}
                                                    onClick={() => { setOverflowOpen(false); action.onClick(); }}
                                                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
                                                        action.destructive ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
                                                    }`}>
                                                    {action.icon && <action.icon size={14} className={action.destructive ? '' : 'text-gray-400'} />}
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats strip */}
                {stats.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-t border-gray-100 divide-x divide-gray-50">
                        {stats.slice(0, 5).map(stat => (
                            <div key={stat.label} className="px-5 py-3.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{stat.label}</p>
                                <p className={`text-[15px] font-bold mt-0.5 truncate ${
                                    stat.tone === 'red' ? 'text-red-600'
                                    : stat.tone === 'green' ? 'text-green-600'
                                    : stat.tone === 'amber' ? 'text-amber-600'
                                    : 'text-gray-900'
                                }`}>
                                    {stat.value}
                                </p>
                                {stat.hint && <p className="text-[10px] text-gray-400 mt-0.5">{stat.hint}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Tabs + right rail ─ */}
            <div className="grid lg:grid-cols-3 gap-4 items-start">
                <div className={rail ? 'lg:col-span-2' : 'lg:col-span-3'}>
                    <div className="bg-white border border-gray-200 rounded-2xl">
                        {tabs.length > 0 && (
                            <div className="flex items-center gap-1 px-3 border-b border-gray-100 overflow-x-auto">
                                {tabs.map(tab => (
                                    <button key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`relative flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                                            current?.id === tab.id ? 'text-blue-700' : 'text-gray-500 hover:text-gray-800'
                                        }`}>
                                        {tab.label}
                                        {tab.badge != null && (
                                            <span className="h-[18px] min-w-[18px] px-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center">
                                                {tab.badge}
                                            </span>
                                        )}
                                        {current?.id === tab.id && (
                                            <span className="absolute inset-x-2 -bottom-px h-0.5 bg-blue-600 rounded-full" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="p-5">{current?.content}</div>
                    </div>
                </div>

                {rail && (
                    <aside className="bg-white border border-gray-200 rounded-2xl p-5 lg:sticky lg:top-[72px]">
                        {rail}
                    </aside>
                )}
            </div>
        </div>
    );
}
