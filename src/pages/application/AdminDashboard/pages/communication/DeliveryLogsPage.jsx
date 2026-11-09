import React from 'react';
import { MailCheck } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import PagePlaceholder from '../../components/ui/PagePlaceholder.jsx';
import { ROUTES } from '../../navigation/navConfig.js';

export default function DeliveryLogsPage() {
    return (
        <AdminLayout>
            <PagePlaceholder
                icon={MailCheck}
                accent="purple"
                title="Delivery Logs"
                description="One place to confirm every message the school sent actually arrived — across announcements, event notices, and system alerts."
                planned={[
                    'Unified log across all message types and channels',
                    'Per-message status: queued, sent, delivered, failed, read',
                    'Failure triage with retry',
                    'Delivery-rate reporting per channel',
                ]}
                availableToday={[
                    { label: 'Per-event notification logs (in Events)', to: ROUTES.events },
                ]}
            />
        </AdminLayout>
    );
}
