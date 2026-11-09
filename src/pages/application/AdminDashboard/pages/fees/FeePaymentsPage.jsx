import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import ScopeBar from '../../components/ScopeBar.jsx';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import { TableSkeleton } from '../../../../../components/patterns';
import FeePaymentsTab from '../../fees/components/FeePaymentsTab.jsx';

function FeePaymentsContent() {
    const { loading: scopeLoading, currentYear } = useAcademic();

    return (
        <div className="flex flex-col h-full gap-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payments &amp; Ledger</h1>
                    <p className="text-sm text-gray-500 mt-1">Record payments and view per-student ledger entries.</p>
                </div>
                <ScopeBar />
            </div>
            {scopeLoading ? <TableSkeleton /> : <FeePaymentsTab currentYear={currentYear} />}
        </div>
    );
}

export default function FeePaymentsPage() {
    return (
        <AdminLayout>
            <FeePaymentsContent />
        </AdminLayout>
    );
}
