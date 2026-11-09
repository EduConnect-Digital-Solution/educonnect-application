import React from 'react';
import { BarChart3 } from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import PagePlaceholder from '../components/ui/PagePlaceholder.jsx';
import { ROUTES } from '../navigation/navConfig.js';

export default function ReportsHubPage() {
    return (
        <AdminLayout>
            <PagePlaceholder
                icon={BarChart3}
                accent="green"
                title="Reports"
                description="Every report in the platform behind one door — parameterized by year and term, exportable, and schedulable, so the numbers you need arrive without hunting."
                planned={[
                    'Report catalog grouped by domain (attendance, academics, finance, enrollment)',
                    'Year/term parameters on every report',
                    'CSV / PDF / print export everywhere',
                    'Scheduled deliveries (e.g., daily cash report at 4pm)',
                ]}
                availableToday={[
                    { label: 'Finance reports', to: ROUTES.financeReports },
                    { label: 'Finance overview', to: ROUTES.financeOverview },
                ]}
            />
        </AdminLayout>
    );
}
