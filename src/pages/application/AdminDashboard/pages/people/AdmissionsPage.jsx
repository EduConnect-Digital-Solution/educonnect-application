import React from 'react';
import { UserPlus } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import PagePlaceholder from '../../components/ui/PagePlaceholder.jsx';
import { ROUTES } from '../../navigation/navConfig.js';

export default function AdmissionsPage() {
    return (
        <AdminLayout>
            <PagePlaceholder
                icon={UserPlus}
                accent="green"
                title="Admissions"
                description="A pipeline for new families — from application to offer to enrolled student — so intake stops living in a paper folder at the front desk."
                planned={[
                    'Application pipeline board (Applied → Reviewing → Offered → Enrolled)',
                    'Application detail with required-document checklist',
                    'One-click convert: accepted applicant → student record',
                    'Admissions funnel report (applied vs enrolled per term)',
                ]}
                availableToday={[
                    { label: 'Add a student directly', to: ROUTES.students },
                    { label: 'Invite a guardian', to: ROUTES.guardians },
                ]}
            />
        </AdminLayout>
    );
}
