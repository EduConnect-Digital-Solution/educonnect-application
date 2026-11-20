import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import ScopeBar from '../../components/ScopeBar.jsx';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import { DashboardSkeleton, EmptyState, pushToast } from '../../../../../components/patterns';
import { getFeeAnalytics } from '../../services/feeAPIs.js';
import FeeOverviewTab from '../../fees/components/FeeOverviewTab.jsx';

function FeeOverviewContent() {
    const { loading: scopeLoading, currentYear, currentTerm } = useAcademic();
    const showToast = (message, type) => pushToast({ message, type });

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [attempt, setAttempt] = useState(0);

    // Reload analytics whenever the academic scope changes.
    useEffect(() => {
        if (!currentYear?.id) return;
        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        getFeeAnalytics({
            academicYearId: currentYear.id,
            ...(currentTerm?.id ? { termId: currentTerm.id } : {}),
        })
            .then(res => { if (!cancelled && res?.success) setAnalytics(res.data); })
            .catch(err => { if (!cancelled) setLoadError(err?.response?.data?.message || err?.message || 'Could not load the fee overview.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [currentYear?.id, currentTerm?.id, attempt]);

    if (scopeLoading || loading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="flex flex-col h-full gap-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
                    <p className="text-sm text-gray-500 mt-1">Summary of fees, collections, and outstanding balances.</p>
                </div>
                <ScopeBar />
            </div>
            {loadError ? (
                <EmptyState variant="error" description={loadError} onRetry={() => setAttempt(n => n + 1)} />
            ) : (
                <FeeOverviewTab analytics={analytics} showToast={showToast} />
            )}
        </div>
    );
}

export default function FeeOverviewPage() {
    return (
        <AdminLayout>
            <FeeOverviewContent />
        </AdminLayout>
    );
}
