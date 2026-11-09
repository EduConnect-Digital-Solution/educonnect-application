import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X,
    Download, Columns3, Rows3, Filter, Bookmark, Check, Plus,
} from 'lucide-react';
import EmptyState from './EmptyState.jsx';
import { TableSkeleton } from './Skeletons.jsx';

/**
 * WorkbenchTable — THE list experience for the whole platform.
 *
 * Never build another table. Students, Staff, Invoices, Attendance,
 * Announcements — same component, same behaviours:
 * sticky header · sort · search · filter chips · bulk select + floating
 * action bar · density · pagination · skeletons · export · column
 * visibility · saved views · total count · row click → detail page.
 *
 * columns: [{ id, header, accessor(row), render?(row), sortable?, align?, hideable?, width? }]
 * filters: [{ id, label, options:[{value,label}], getValue(row) }]
 * bulkActions: [{ id, label, icon?, onClick(selectedRows) }]
 */

function defaultExportCSV(columns, rows, title) {
    const visible = columns.filter(c => c.accessor);
    const head = visible.map(c => `"${c.header}"`).join(',');
    const body = rows.map(r =>
        visible.map(c => {
            const v = c.accessor(r);
            return `"${String(v ?? '').replace(/"/g, '""')}"`;
        }).join(',')
    ).join('\n');
    const blob = new Blob([`${head}\n${body}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(title || 'export').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}

function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

export default function WorkbenchTable({
    title,
    storageKey,                  // enables saved views / column / density persistence
    columns = [],
    rows = [],
    rowKey = (r) => r.id,
    loading = false,
    error = null,
    onRetry,
    searchPlaceholder = 'Search…',
    searchKeys = [],             // row fields (or accessor fns) used by search
    filters = [],
    bulkActions = [],
    primaryAction,               // { label, icon, onClick }
    onRowClick,                  // row click opens the DETAIL PAGE — never a modal
    onExport,                    // optional override; default = CSV of filtered rows
    emptyState = {},             // first-use empty state props (title, description, action, prerequisite)
    pageSizeOptions = [10, 25, 50],
}) {
    const prefsKey = storageKey ? `wb:${storageKey}` : null;
    const prefs = prefsKey ? loadJSON(prefsKey, {}) : {};

    const [search, setSearch] = useState('');
    const [sort, setSort] = useState(prefs.sort ?? null);                 // { id, dir }
    const [activeFilters, setActiveFilters] = useState({});              // { filterId: value }
    const [selected, setSelected] = useState(() => new Set());
    const [density, setDensity] = useState(prefs.density ?? 'normal');   // 'normal' | 'compact'
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(prefs.pageSize ?? pageSizeOptions[0]);
    const [hiddenCols, setHiddenCols] = useState(() => new Set(prefs.hiddenCols ?? []));
    const [savedViews, setSavedViews] = useState(prefs.views ?? []);
    const [openMenu, setOpenMenu] = useState(null);                      // 'columns' | 'views' | filterId
    const menuRef = useRef(null);

    // Persist prefs
    useEffect(() => {
        if (!prefsKey) return;
        localStorage.setItem(prefsKey, JSON.stringify({
            sort, density, pageSize, hiddenCols: [...hiddenCols], views: savedViews,
        }));
    }, [prefsKey, sort, density, pageSize, hiddenCols, savedViews]);

    // Close menus on outside click
    useEffect(() => {
        const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    /* ── Pipeline: filter → search → sort ──────────────────────────────── */
    const filtered = useMemo(() => {
        let out = rows;
        for (const f of filters) {
            const val = activeFilters[f.id];
            if (val != null && val !== '') {
                out = out.filter(r => {
                    const got = f.getValue(r);
                    // array getter → membership match; scalar → strict equality
                    return Array.isArray(got)
                        ? got.map(String).includes(String(val))
                        : String(got) === String(val);
                });
            }
        }
        const q = search.trim().toLowerCase();
        if (q) {
            out = out.filter(r => searchKeys.some(k => {
                const v = typeof k === 'function' ? k(r) : r[k];
                return String(v ?? '').toLowerCase().includes(q);
            }));
        }
        if (sort) {
            const col = columns.find(c => c.id === sort.id);
            if (col?.accessor) {
                out = [...out].sort((a, b) => {
                    const av = col.accessor(a), bv = col.accessor(b);
                    const cmp = typeof av === 'number' && typeof bv === 'number'
                        ? av - bv
                        : String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
                    return sort.dir === 'asc' ? cmp : -cmp;
                });
            }
        }
        return out;
    }, [rows, filters, activeFilters, search, searchKeys, sort, columns]);

    useEffect(() => { setPage(1); }, [search, activeFilters, pageSize]);
    useEffect(() => { setSelected(new Set()); }, [rows]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
    const visibleColumns = columns.filter(c => !hiddenCols.has(c.id));

    const activeFilterEntries = Object.entries(activeFilters).filter(([, v]) => v != null && v !== '');
    const hasActiveQuery = !!search.trim() || activeFilterEntries.length > 0;

    /* ── Selection ───────── */
    const pageKeys = pageRows.map(rowKey);
    const allPageSelected = pageKeys.length > 0 && pageKeys.every(k => selected.has(k));
    const toggleAll = () => {
        const next = new Set(selected);
        if (allPageSelected) pageKeys.forEach(k => next.delete(k));
        else pageKeys.forEach(k => next.add(k));
        setSelected(next);
    };
    const toggleRow = (key) => {
        const next = new Set(selected);
        if (next.has(key)) next.delete(key); else next.add(key);
        setSelected(next);
    };
    const selectedRows = useMemo(
        () => rows.filter(r => selected.has(rowKey(r))),
        [rows, selected, rowKey]
    );

    /* ── Saved views ─────── */
    const saveCurrentView = () => {
        const name = window.prompt('Name this view (e.g. "JSS1 inactive")');
        if (!name?.trim()) return;
        setSavedViews(prev => [...prev.filter(v => v.name !== name.trim()),
            { name: name.trim(), search, activeFilters, sort }]);
    };
    const applyView = (view) => {
        setSearch(view.search ?? '');
        setActiveFilters(view.activeFilters ?? {});
        setSort(view.sort ?? null);
        setOpenMenu(null);
    };

    const clearAll = useCallback(() => { setSearch(''); setActiveFilters({}); }, []);

    const handleSort = (col) => {
        if (!col.sortable) return;
        setSort(prev => prev?.id === col.id
            ? (prev.dir === 'asc' ? { id: col.id, dir: 'desc' } : null)
            : { id: col.id, dir: 'asc' });
    };

    const cellPad = density === 'compact' ? 'px-4 py-2' : 'px-4 py-3.5';

    /* ── States ──────────── */
    if (loading) return <TableSkeleton />;

    if (error) {
        return (
            <div className="bg-white border border-gray-200 rounded-2xl">
                <EmptyState variant="error" description={typeof error === 'string' ? error : 'We couldn’t load this list.'} onRetry={onRetry} />
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-visible" ref={menuRef}>
            {/* ── Toolbar ── */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:border-blue-400 outline-none text-sm"
                    />
                </div>

                {/* Filter dropdowns as chips */}
                {filters.map(f => (
                    <div key={f.id} className="relative">
                        <button
                            onClick={() => setOpenMenu(openMenu === f.id ? null : f.id)}
                            className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[12px] font-semibold transition-colors ${
                                activeFilters[f.id]
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Filter size={12} />
                            {activeFilters[f.id]
                                ? `${f.label}: ${f.options.find(o => String(o.value) === String(activeFilters[f.id]))?.label ?? activeFilters[f.id]}`
                                : f.label}
                        </button>
                        {openMenu === f.id && (
                            <div className="absolute left-0 mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1 max-h-64 overflow-y-auto">
                                {f.options.map(o => (
                                    <button
                                        key={o.value}
                                        onClick={() => {
                                            setActiveFilters(prev => ({ ...prev, [f.id]: String(prev[f.id]) === String(o.value) ? null : o.value }));
                                            setOpenMenu(null);
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50"
                                    >
                                        {o.label}
                                        {String(activeFilters[f.id]) === String(o.value) && <Check size={13} className="text-blue-500" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                <div className="flex-1" />

                {/* Saved views */}
                {storageKey && (
                    <div className="relative">
                        <button
                            onClick={() => setOpenMenu(openMenu === 'views' ? null : 'views')}
                            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 bg-white text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
                            title="Saved views"
                        >
                            <Bookmark size={13} /> Views
                        </button>
                        {openMenu === 'views' && (
                            <div className="absolute right-0 mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1">
                                {savedViews.map(v => (
                                    <button key={v.name} onClick={() => applyView(v)}
                                        className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 group">
                                        <span className="truncate">{v.name}</span>
                                        <X size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500"
                                           onClick={(e) => { e.stopPropagation(); setSavedViews(prev => prev.filter(x => x.name !== v.name)); }} />
                                    </button>
                                ))}
                                {savedViews.length === 0 && <p className="px-3 py-2 text-[12px] text-gray-400">No saved views yet.</p>}
                                <button onClick={saveCurrentView}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-blue-600 hover:bg-blue-50 border-t border-gray-100">
                                    <Plus size={13} /> Save current view
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Column visibility */}
                <div className="relative">
                    <button
                        onClick={() => setOpenMenu(openMenu === 'columns' ? null : 'columns')}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 bg-white text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
                        title="Show / hide columns"
                    >
                        <Columns3 size={13} />
                    </button>
                    {openMenu === 'columns' && (
                        <div className="absolute right-0 mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1">
                            {columns.filter(c => c.hideable !== false).map(c => (
                                <button key={c.id}
                                    onClick={() => setHiddenCols(prev => {
                                        const next = new Set(prev);
                                        if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                                        return next;
                                    })}
                                    className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50">
                                    {c.header}
                                    {!hiddenCols.has(c.id) && <Check size={13} className="text-blue-500" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Density */}
                <button
                    onClick={() => setDensity(d => d === 'compact' ? 'normal' : 'compact')}
                    className={`flex items-center h-9 px-3 rounded-lg border text-[12px] font-semibold transition-colors ${
                        density === 'compact' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Toggle density"
                >
                    <Rows3 size={13} />
                </button>

                {/* Export */}
                <button
                    onClick={() => onExport ? onExport(filtered) : defaultExportCSV(columns, filtered, title)}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 bg-white text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
                >
                    <Download size={13} /> Export
                </button>

                {primaryAction && (
                    <button
                        onClick={primaryAction.onClick}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 shadow-sm transition-colors"
                    >
                        {primaryAction.icon && <primaryAction.icon size={15} />}
                        {primaryAction.label}
                    </button>
                )}
            </div>

            {/* ── Active filter chips row ──────────────────────────────── */}
            {activeFilterEntries.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mr-1">Filters:</span>
                    {activeFilterEntries.map(([id, val]) => {
                        const f = filters.find(x => x.id === id);
                        const label = f?.options.find(o => String(o.value) === String(val))?.label ?? val;
                        return (
                            <button key={id}
                                onClick={() => setActiveFilters(prev => ({ ...prev, [id]: null }))}
                                className="flex items-center gap-1 h-6 px-2 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-semibold text-blue-700 hover:bg-blue-100">
                                {f?.label}: {label} <X size={11} />
                            </button>
                        );
                    })}
                    <button onClick={clearAll} className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 ml-1">
                        Clear all
                    </button>
                </div>
            )}

            {/* ── Table ──── */}
            {filtered.length === 0 ? (
                hasActiveQuery
                    ? <EmptyState variant="filtered" onClearFilters={clearAll} compact />
                    : <EmptyState variant="first-use" compact {...emptyState} />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur">
                            <tr className="border-b border-gray-100">
                                {bulkActions.length > 0 && (
                                    <th className="w-10 px-4 py-2.5">
                                        <input type="checkbox" checked={allPageSelected} onChange={toggleAll}
                                            className="w-3.5 h-3.5 rounded border-gray-300 accent-blue-600 cursor-pointer" />
                                    </th>
                                )}
                                {visibleColumns.map(col => (
                                    <th key={col.id}
                                        onClick={() => handleSort(col)}
                                        className={`${cellPad} text-left text-[11px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap select-none ${
                                            col.sortable ? 'cursor-pointer hover:text-gray-600' : ''
                                        } ${col.align === 'right' ? 'text-right' : ''}`}
                                        style={col.width ? { width: col.width } : undefined}>
                                        <span className="inline-flex items-center gap-1">
                                            {col.header}
                                            {sort?.id === col.id && (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {pageRows.map(row => {
                                const key = rowKey(row);
                                const isSelected = selected.has(key);
                                return (
                                    <tr key={key}
                                        onClick={() => onRowClick?.(row)}
                                        className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${
                                            isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50/70'
                                        }`}>
                                        {bulkActions.length > 0 && (
                                            <td className="w-10 px-4" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={isSelected} onChange={() => toggleRow(key)}
                                                    className="w-3.5 h-3.5 rounded border-gray-300 accent-blue-600 cursor-pointer" />
                                            </td>
                                        )}
                                        {visibleColumns.map(col => (
                                            <td key={col.id} className={`${cellPad} text-sm text-gray-700 ${col.align === 'right' ? 'text-right' : ''}`}>
                                                {col.render ? col.render(row) : String(col.accessor?.(row) ?? '')}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Footer: count + pagination ───────────────────────────── */}
            {filtered.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-gray-100">
                    <p className="text-[12px] font-medium text-gray-400">
                        {filtered.length === rows.length
                            ? `${rows.length} record${rows.length === 1 ? '' : 's'}`
                            : `${filtered.length} of ${rows.length} records`}
                    </p>
                    <div className="flex-1" />
                    <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
                        className="h-8 px-2 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-600 bg-white">
                        {pageSizeOptions.map(n => <option key={n} value={n}>{n} / page</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50">
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-[12px] font-semibold text-gray-600 px-2">{page} / {totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50">
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Floating bulk action bar ─────────────────────────────── */}
            {selected.size > 0 && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white rounded-xl shadow-2xl pl-4 pr-2 py-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <span className="text-[13px] font-bold whitespace-nowrap">{selected.size} selected</span>
                    <div className="w-px h-5 bg-white/20 mx-1" />
                    {bulkActions.map(action => (
                        <button key={action.id}
                            onClick={() => action.onClick(selectedRows)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold hover:bg-white/10 transition-colors whitespace-nowrap">
                            {action.icon && <action.icon size={13} />}
                            {action.label}
                        </button>
                    ))}
                    <button onClick={() => setSelected(new Set())}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
