import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import PagePlaceholder from '../components/ui/PagePlaceholder.jsx';
import { ROUTES } from '../navigation/navConfig.js';

export default function AttendanceOpsPage() {
    return (
        <AdminLayout>
            <PagePlaceholder
                icon={ClipboardCheck}
                accent="blue"
                title="Attendance"
                description="The school's morning picture: who's in, which registers are missing, and which families need a call — built on the registers teachers already take."
                planned={[
                    "Live tiles — today's attendance % and absent count",
                    'Per-class grid that colors up as registers are submitted',
                    'Unmarked registers list with one-tap teacher nudge',
                    'Chronic absentee and lateness reports',
                ]}
                availableToday={[
                    { label: 'Timetables (drives the teacher register)', to: ROUTES.timetables },
                    { label: 'Staff', to: ROUTES.staff },
                ]}
            />
        </AdminLayout>
    );
}
