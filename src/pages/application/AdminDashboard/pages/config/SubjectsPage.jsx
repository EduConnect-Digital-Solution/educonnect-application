import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import SubjectSetupBuilder from '../../timetable/components/SubjectSetupBuilder.jsx';

/**
 * SubjectsPage
 * Route: /dashboard/admin/config/subjects
 *
 * SubjectSetupBuilder owns its own data (fetched directly from the subject API).
 */
export default function SubjectsPage() {
    return (
        <AdminLayout>
            <div className="flex flex-col h-full min-h-[calc(100vh-120px)]">
                <SubjectSetupBuilder />
            </div>
        </AdminLayout>
    );
}
