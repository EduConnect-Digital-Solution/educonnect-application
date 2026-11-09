import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import ScopeBar from '../../components/ScopeBar.jsx';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import { DashboardSkeleton } from '../../../../../components/patterns';
import { getSchoolClasses } from '../../services/classAPIs.js';
import FeeReportsTab from '../../fees/components/FeeReportsTab.jsx';

function FeeReportsContent() {
    const { loading: scopeLoading, currentYear, currentTerm } = useAcademic();

    const [classes, setClasses] = useState([]);

    useEffect(() => {
        getSchoolClasses()
            .then(res => { if (res?.success) setClasses(res.data?.classes ?? []); })
            .catch(err => console.error('[FeeReports] classes failed:', err));
    }, []);

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
