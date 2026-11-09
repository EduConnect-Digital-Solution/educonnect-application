import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { ROUTES } from '../../navigation/navConfig.js';
import GradingSchemesTab from '../academics/grading/GradingSchemesTab.jsx';
import AssessmentPoliciesTab from './AssessmentPoliciesTab.jsx';
import PolicyPermissionsTab from './PolicyPermissionsTab.jsx';

const TABS = [
    { id: 'schemes',     label: 'Grading Schemes' },
    { id: 'policies',    label: 'Assessment Policies' },
    { id: 'permissions', label: 'Teacher Permissions' },
];

function GradingSetupContent() {
    const [activeTab, setActiveTab] = useState('schemes');

    return (
        <div className="flex flex-col gap-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm">
                <Link
                    to={ROUTES.settings}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                >
                    <ChevronLeft size={14} /> Settings
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-gray-700 font-medium">Grading &amp; Assessment</span>
            </div>

            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Grading &amp; Assessment</h1>
                <p className="text-sm text-gray-500 mt-1">
                    One-time setup for how the school grades. Define the grade bands (A1, B2…) and the
                    mark structure (CA components + Exam) teachers work within.
                </p>
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-0.5 border-b border-gray-200 -mb-2">
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
            <div>
                {activeTab === 'schemes'     && <GradingSchemesTab />}
                {activeTab === 'policies'    && <AssessmentPoliciesTab />}
                {activeTab === 'permissions' && <PolicyPermissionsTab />}
            </div>
        </div>
    );
}

export default function GradingSetupSettingsPage() {
    return (
        <AdminLayout>
            <GradingSetupContent />
        </AdminLayout>
    );
}
