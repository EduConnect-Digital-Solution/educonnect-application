import React from 'react';

/**
 * Skeletons — skeleton-first loading for every page shape.
 * The full-screen branded spinner is for application boot ONLY;
 * everything else preserves layout and shimmers.
 */

export const Shimmer = ({ className = '', style }) => (
    <div className={`bg-gray-100 rounded animate-pulse ${className}`} style={style} />
);

/** Table page: toolbar + header + N rows. */
export function TableSkeleton({ rows = 8, withToolbar = true }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {withToolbar && (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                    <Shimmer className="h-9 w-64" />
                    <Shimmer className="h-8 w-24 rounded-full" />
                    <Shimmer className="h-8 w-24 rounded-full" />
                    <div className="flex-1" />
                    <Shimmer className="h-9 w-28" />
                </div>
            )}
            <div className="px-4 py-3 border-b border-gray-100 flex gap-6">
                {[96, 160, 80, 64, 56].map((w, i) => <Shimmer key={i} className="h-3.5" style={{ width: w }} />)}
            </div>
            <div className="divide-y divide-gray-50">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                        <Shimmer className="w-9 h-9 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Shimmer className="h-3.5 w-1/3" />
                            <Shimmer className="h-3 w-1/4" />
                        </div>
                        <Shimmer className="h-5 w-16 rounded-full" />
                        <Shimmer className="h-3.5 w-20 hidden md:block" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Detail page: header + stats strip + tabs + body + rail. */
export function DetailSkeleton() {
    return (
        <div className="space-y-4">
            <Shimmer className="h-4 w-48" />
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                    <Shimmer className="w-16 h-16 rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-2.5">
                        <Shimmer className="h-5 w-56" />
                        <Shimmer className="h-3.5 w-36" />
                    </div>
                    <Shimmer className="h-9 w-28" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-gray-100">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Shimmer className="h-3 w-16" />
                            <Shimmer className="h-5 w-20" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                    <div className="flex gap-5">
                        {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-4 w-20" />)}
                    </div>
                    {Array.from({ length: 6 }).map((_, i) => <Shimmer key={i} className="h-4 w-full" />)}
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex gap-3">
                            <Shimmer className="w-7 h-7 rounded-full shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <Shimmer className="h-3.5 w-3/4" />
                                <Shimmer className="h-3 w-1/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/** Dashboard: metric tiles + two content cards. */
export function DashboardSkeleton() {
    return (
        <div className="space-y-6 p-2">
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
                        <Shimmer className="w-8 h-8 rounded-lg" />
                        <Shimmer className="h-3.5 w-24" />
                        <Shimmer className="h-7 w-14" />
                    </div>
                ))}
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                    <Shimmer className="h-4 w-32" />
                    <Shimmer className="h-48 w-full" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                    <Shimmer className="h-4 w-28" />
                    {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-12 w-full rounded-xl" />)}
                </div>
            </div>
        </div>
    );
}

/** Generic card grid (e.g., settings, library tiles). */
export function CardGridSkeleton({ cards = 6 }) {
    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: cards }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
                    <Shimmer className="w-10 h-10 rounded-xl" />
                    <Shimmer className="h-4 w-2/3" />
                    <Shimmer className="h-3 w-full" />
                    <Shimmer className="h-3 w-4/5" />
                </div>
            ))}
        </div>
    );
}

/**
 * Finance page: 3 summary stat cards + toolbar + table rows.
 * Matches the layout of FeeInvoicesTab / FeePaymentsTab.
 */
export function FinanceTableSkeleton({ statCards = 3, rows = 8 }) {
    return (
        <div className="space-y-5">
            {/* Summary stat cards */}
            <div className={`grid gap-4 grid-cols-1 sm:grid-cols-${statCards}`}>
                {Array.from({ length: statCards }).map((_, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
                        <Shimmer className="h-3 w-28" />
                        <Shimmer className="h-7 w-36" />
                    </div>
                ))}
            </div>
            {/* Table */}
            <TableSkeleton rows={rows} withToolbar />
        </div>
    );
}
