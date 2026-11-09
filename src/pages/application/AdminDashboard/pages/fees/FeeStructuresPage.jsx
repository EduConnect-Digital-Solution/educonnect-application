import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import ScopeBar from '../../components/ScopeBar.jsx';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import { DashboardSkeleton, pushToast } from '../../../../../components/patterns';
import { getSchoolClasses } from '../../services/classAPIs.js';
import { getFeeStructures } from '../../services/feeAPIs.js';
import FeeStructuresTab from '../../fees/components/FeeStructuresTab.jsx';

function FeeStructuresContent() {
    const { loading: scopeLoading, currentYear, currentTerm } = useAcademic();
    const showToast = (message, type) => pushToast({ message, type });

    const [classes, setClasses] = useState([]);
    const [structures, setStructures] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // Classes are reference data — fetch once.
    useEffect(() => {
        getSchoolClasses()
            .then(res => { if (res?.success) setClasses(res.data?.classes ?? []); })
            .catch(err => console.error('[FeeStructures] classes failed:', err));
    }, []);

    // Structures are scoped to the active year/term.
    useEffect(() => {
        if (scopeLoading) return;
        if (!currentYear?.id) {
            setLoadingData(false);
            return;
        }
        let cancelled = false;
        setLoadingData(true);
        getFeeStructures({
            academicYearId: currentYear.id,
            ...(currentTerm?.id ? { termId: currentTerm.id } : {}),
        })
            .then(res => { if (!cancelled && res?.success) setStructures(res.data?.feeStructures ?? []); })
            .catch(err => console.error('[FeeStructures] structures failed:', err))
            .finally(() => { if (!cancelled) setLoadingData(false); });
        return () => { cancelled = true; };
    }, [currentYear?.id, currentTerm?.id, scopeLoading]);

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
            <FeeStructuresTab
                showToast={showToast}
                classes={classes}
                currentYear={currentYear}
                currentTerm={currentTerm}
                structures={structures}
                setStructures={setStructures}
            />
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
