import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import ScopeBar from '../../components/ScopeBar.jsx';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import { DashboardSkeleton } from '../../../../../components/patterns';
import LoadErrorNotice from './LoadErrorNotice.jsx';
import { getSchoolClasses } from '../../services/classAPIs.js';
import FeeReportsTab from '../../fees/components/FeeReportsTab.jsx';

function FeeReportsContent() {
    const { loading: scopeLoading, currentYear, currentTerm } = useAcademic();

    const [classes, setClasses] = useState([]);
    const [classesError, setClassesError] = useState(null);
    const [classesAttempt, setClassesAttempt] = useState(0);

    useEffect(() => {
        setClassesError(null);
        getSchoolClasses()
            .then(res => { if (res?.success) setClasses(res.data?.classes ?? []); })
            .catch(() => setClassesError('Classes could not be loaded, so the class filter is empty.'));
    }, [classesAttempt]);

    if (scopeLoading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="flex flex-col h-full gap-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                    <p className="text-sm text-gray-500 mt-1">Financial reports, arrears summaries, and collection analytics.</p>
                </div>
                <ScopeBar />
            </div>
            {classesError && <LoadErrorNotice message={classesError} onRetry={() => setClassesAttempt(n => n + 1)} />}
            <FeeReportsTab classes={classes} currentYear={currentYear} currentTerm={currentTerm} />
        </div>
    );
}

export default function FeeReportsPage() {
    return (
        <AdminLayout>
            <FeeReportsContent />
        </AdminLayout>
    );
}
