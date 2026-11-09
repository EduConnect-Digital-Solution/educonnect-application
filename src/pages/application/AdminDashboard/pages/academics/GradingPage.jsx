import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import SubmissionMatrixTab from './grading/SubmissionMatrixTab.jsx';
import BroadsheetTab from './grading/BroadsheetTab.jsx';
import PublishResultsTab from './grading/PublishResultsTab.jsx';
import { ROUTES } from '../../navigation/navConfig.js';

const TABS = [
    { id: 'matrix',     label: 'Submission Matrix' },
    { id: 'broadsheet', label: 'Master Broadsheet' },
    { id: 'publish',    label: 'Publish Results' },
];

function GradingContent() {
    const [activeTab, setActiveTab] = useState('matrix');

    return (
        <div className="flex flex-col gap-5 h-full">
            {/* Page header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Grading & Results</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track submission progress, compile broadsheets, and publish results across the school.
                    </p>
                </div>
                <Link
                    to={ROUTES.settingsGradingSetup}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors shrink-0"
                >
                    <Settings2 size={13} />
                    Grading & Assessment Setup
                </Link>
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-0.5 border-b border-gray-200 -mb-1">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-colors ${
                            activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0">
                {activeTab === 'schemes'    && <GradingSchemesTab />}
                {activeTab === 'matrix'     && <SubmissionMatrixTab />}
                {activeTab === 'broadsheet' && <BroadsheetTab />}
                {activeTab === 'publish'    && <PublishResultsTab />}
            </div>
        </div>
    );
}

export default function GradingPage() {
    return (
        <AdminLayout>
            <GradingContent />
        </AdminLayout>
    );
}
