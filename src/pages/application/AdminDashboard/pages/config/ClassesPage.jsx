import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import ClassSetupBuilder from '../../timetable/components/ClassSetupBuilder.jsx';

/**
 * ClassesPage
 * Route: /dashboard/admin/config/classes
 *
 * ClassSetupBuilder owns its own data (classes + arms fetched directly from the API).
 */
export default function ClassesPage() {
    return (
        <AdminLayout>
            <div className="flex flex-col h-full min-h-[calc(100vh-120px)]">
                <ClassSetupBuilder />
            </div>
        </AdminLayout>
    );
}
