import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import ScopeBar from '../../components/ScopeBar.jsx';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import { DashboardSkeleton, EmptyState, pushToast } from '../../../../../components/patterns';
import LoadErrorNotice from './LoadErrorNotice.jsx';
import { getSchoolClasses } from '../../services/classAPIs.js';
import { getFeeStructures } from '../../services/feeAPIs.js';
import FeeStructuresTab from '../../fees/components/FeeStructuresTab.jsx';

function FeeStructuresContent() {
    const { loading: scopeLoading, currentYear, currentTerm } = useAcademic();
    const showToast = (message, type) => pushToast({ message, type });

    const [classes, setClasses] = useState([]);
    const [structures, setStructures] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [classesError, setClassesError] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const [classesAttempt, setClassesAttempt] = useState(0);

    // Classes are reference data — fetch once (again on retry).
    useEffect(() => {
        setClassesError(null);
        getSchoolClasses()
            .then(res => { if (res?.success) setClasses(res.data?.classes ?? []); })
            .catch(() => setClassesError('Classes could not be loaded, so class lists below are empty.'));
    }, [classesAttempt]);

    // Structures are scoped to the active year/term.
    useEffect(() => {
        if (scopeLoading) return;
        if (!currentYear?.id) {
            setLoadingData(false);
            return;
        }
        let cancelled = false;
        setLoadingData(true);
        setLoadError(null);
        getFeeStructures({
            academicYearId: currentYear.id,
            ...(currentTerm?.id ? { termId: currentTerm.id } : {}),
        })
            .then(res => { if (!cancelled && res?.success) setStructures(res.data?.feeStructures ?? []); })
            .catch(err => { if (!cancelled) setLoadError(err?.response?.data?.message || err?.message || 'Could not load fee structures.'); })
            .finally(() => { if (!cancelled) setLoadingData(false); });
        return () => { cancelled = true; };
    }, [currentYear?.id, currentTerm?.id, scopeLoading, attempt]);

    if (scopeLoading || loadingData) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="flex flex-col h-full gap-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Fee Structures</h1>
                    <p className="text-sm text-gray-500 mt-1">Define and manage fee templates per class and term.</p>
                </div>
                <ScopeBar />
            </div>
            {classesError && <LoadErrorNotice message={classesError} onRetry={() => setClassesAttempt(n => n + 1)} />}
            {loadError ? (
                <EmptyState variant="error" description={loadError} onRetry={() => setAttempt(n => n + 1)} />
            ) : (
            <FeeStructuresTab
                showToast={showToast}
                classes={classes}
                currentYear={currentYear}
                currentTerm={currentTerm}
                structures={structures}
                setStructures={setStructures}
            />
            )}
        </div>
    );
}

export default function FeeStructuresPage() {
    return (
        <AdminLayout>
            <FeeStructuresContent />
        </AdminLayout>
    );
}
