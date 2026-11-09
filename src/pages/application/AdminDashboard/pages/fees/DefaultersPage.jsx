import React from 'react';
import { AlertOctagon } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import PagePlaceholder from '../../components/ui/PagePlaceholder.jsx';
import { ROUTES } from '../../navigation/navConfig.js';

export default function DefaultersPage() {
    return (
        <AdminLayout>
            <PagePlaceholder
                icon={AlertOctagon}
                accent="rose"
                title="Defaulters"
                description="The bursar's daily worklist: every family with an overdue balance, how long it's been owed, and what's been done about it — with bulk reminders instead of one-by-one phone calls."
                planned={[
                    'Worklist sorted by amount and age of debt, grouped by family',
                    'Bulk reminders with a configurable escalation ladder',
                    'Promise-to-pay tracking and contact log per family',
                    'Aging buckets and recovery-rate reporting',
                ]}
                availableToday={[
                    { label: 'Invoices', to: ROUTES.invoices },
                    { label: 'Payments & ledger', to: ROUTES.payments },
                    { label: 'Finance reports', to: ROUTES.financeReports },
                ]}
            />
        </AdminLayout>
    );
}
