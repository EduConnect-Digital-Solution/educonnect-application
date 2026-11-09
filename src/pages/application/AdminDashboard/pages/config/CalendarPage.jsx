import React from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import AcademicCalendarBuilder from "../../timetable/AcademicCalendarBuilder.jsx";
import SettingsBreadcrumb from '../../components/ui/SettingsBreadcrumb.jsx';

export default function CalendarPage() {
    return (
        <AdminLayout>
            <SettingsBreadcrumb section="Academic Calendar" />
            <div className="flex flex-col h-full overflow-hidden">
                <AcademicCalendarBuilder />
            </div>
        </AdminLayout>
    );
}
