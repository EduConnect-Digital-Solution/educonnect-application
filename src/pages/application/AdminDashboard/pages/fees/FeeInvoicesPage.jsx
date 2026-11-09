import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import ScopeBar from '../../components/ScopeBar.jsx';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import { FinanceTableSkeleton } from '../../../../../components/patterns';
import { getSchoolClasses } from '../../services/classAPIs.js';
import { getInvoices, getFeeStructures } from '../../services/feeAPIs.js';
import FeeInvoicesTab from '../../fees/components/FeeInvoicesTab.jsx';

function FeeInvoicesContent() {
    const { loading: scopeLoading, currentYear, currentTerm } = useAcademic();

    const [classes, setClasses] = useState([]);
    const [structures, setStructures] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [summary, setSummary] = useState({ totalBilled: 0, totalPaid: 0, totalOutstanding: 0 });
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        getSchoolClasses()
            .then(res => { if (res?.success) setClasses(res.data?.classes ?? []); })
            .catch(err => console.error('[FeeInvoices] classes failed:', err));
    }, []);

    const fetchInvoicesAndStructures = async () => {
        if (!currentYear?.id) {
            setLoadingData(false);
            return;
        }
        setLoadingData(true);
        try {
            const [invRes, structRes] = await Promise.all([
                getInvoices({
                    academicYearId: currentYear.id,
                    ...(currentTerm?.id ? { termId: currentTerm.id } : {}),
                }),
                getFeeStructures({
                    academicYearId: currentYear.id,
                    ...(currentTerm?.id ? { termId: currentTerm.id } : {}),
                    status: 'published',
                }),
            ]);

            if (invRes?.success) {
                setInvoices(invRes.data?.invoices ?? []);
                if (invRes.data?.summary) setSummary(invRes.data.summary);
            }
            if (structRes?.success) {
                setStructures(structRes.data?.feeStructures ?? []);
            }
        } catch (err) {
            console.error('[FeeInvoices] fetch failed:', err);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        if (scopeLoading) return;
        fetchInvoicesAndStructures();
    }, [currentYear?.id, currentTerm?.id, scopeLoading]);

    return (
        <div className="flex flex-col h-full gap-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                    <p className="text-sm text-gray-500 mt-1">View and manage student fee invoices.</p>
                </div>
                <ScopeBar />
            </div>
            {(scopeLoading || loadingData) ? (
                <FinanceTableSkeleton />
            ) : (
                <FeeInvoicesTab
                    classes={classes}
                    structures={structures}
                    invoices={invoices}
                    summary={summary}
                    currentYear={currentYear}
                    currentTerm={currentTerm}
                    onInvoicesUpdated={fetchInvoicesAndStructures}
                />
            )}
        </div>
    );
}

export default function FeeInvoicesPage() {
    return (
        <AdminLayout>
            <FeeInvoicesContent />
        </AdminLayout>
    );
}
