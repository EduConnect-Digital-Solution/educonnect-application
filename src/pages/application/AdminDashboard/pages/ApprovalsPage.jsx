import React from 'react';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import { ApprovalInbox } from '../../../../components/patterns';

/**
 * ApprovalsPage — the single destination for everything awaiting sign-off.
 *
 * Queues register here as their workflows ship:
 *   results sheets · fee waivers · excuse notes · promotion lists · report cards
 * Until a queue has a live backend it simply doesn't appear — the inbox stays honest.
 */
export default function ApprovalsPage() {
    // Each module contributes a group once its approval workflow is live.
    const groups = [];

    return (
        <AdminLayout>
            <div className="max-w-3xl mx-auto px-2 py-4">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Everything that needs your sign-off, in one place — grouped by type, with full history on every decision.
                    </p>
                </div>
                <ApprovalInbox groups={groups} />
            </div>
        </AdminLayout>
    );
}
