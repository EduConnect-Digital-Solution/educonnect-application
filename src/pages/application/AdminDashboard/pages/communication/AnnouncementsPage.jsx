import React from 'react';
import { Megaphone } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import PagePlaceholder from '../../components/ui/PagePlaceholder.jsx';
import { ROUTES } from '../../navigation/navConfig.js';

export default function AnnouncementsPage() {
    return (
        <AdminLayout>
            <PagePlaceholder
                icon={Megaphone}
                accent="blue"
                title="Announcements"
                description="Your school's broadcast voice — circulars and notices composed once, targeted precisely (whole school, a class, a role), and tracked to see who actually read them."
                planned={[
                    'Composer with audience picker and live recipient count',
                    'Schedule for later or publish immediately',
                    'Delivery and read-rate tracking per announcement',
                    'Resend to unread in one click',
                ]}
                availableToday={[
                    { label: 'Events (with targeted notifications)', to: ROUTES.events },
                ]}
            />
        </AdminLayout>
    );
}
