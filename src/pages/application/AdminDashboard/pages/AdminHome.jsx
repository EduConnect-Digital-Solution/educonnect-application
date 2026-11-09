import React from 'react';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import { DashboardSkeleton } from '../../../../components/patterns';
import useSetupProgress from '../hooks/useSetupProgress.js';
import DashboardPage from './DashboardPage.jsx';
import SetupChecklistPage from './onboarding/SetupChecklistPage.jsx';

/**
 * AdminHome — the first thing an admin sees.
 *
 * Until onboarding is complete, the Setup Checklist IS the home (no empty
 * dashboards full of zeros). Once every step is done, the real dashboard
 * becomes home. Existing, fully-set-up schools land straight on the dashboard.
 */
export default function AdminHome() {
    const { loading, complete } = useSetupProgress();

    if (loading) {
        return <AdminLayout><DashboardSkeleton /></AdminLayout>;
    }

    return complete ? <DashboardPage /> : <SetupChecklistPage />;
}
