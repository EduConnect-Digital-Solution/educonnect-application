import React, {useEffect, useState} from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

export default function AnalyticsComponent(userStatsAnalytics) {
    const userStats = userStatsAnalytics.userStatsAnalytics;
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('role');

    if (!userStats) {
        return <div className="text-center py-8 text-gray-400">Loading analytics...</div>;
    }

    if (!userStats) {
        return <div className="text-center py-8 text-gray-400">No data available</div>;
    }

    const roleData = [
        {
            role: 'Admin',
            total: userStats.byRole.admin.total,
            active: userStats.byRole.admin.active,
            verified: userStats.byRole.admin.verified
        },
        {
            role: 'Teacher',
            total: userStats.byRole.teacher.total,
            active: userStats.byRole.teacher.active,
            verified: userStats.byRole.teacher.verified
        },
        {
            role: 'Parent',
            total: userStats.byRole.parent.total,
            active: userStats.byRole.parent.active,
            verified: userStats.byRole.parent.verified
        }
    ];

    const summaryData = [
        { name: 'Active', value: userStats.summary.active, fill: '#10b981' },
        { name: 'Inactive', value: userStats.summary.inactive, fill: '#ef4444' },
        { name: 'Pending', value: userStats.summary.pendingRegistration, fill: '#f59e0b' }
    ].filter(item => item.value > 0);

    const tabs = [
        { id: 'role', label: 'Users by Role' },
        { id: 'status', label: 'Status Distribution' },
        { id: 'breakdown', label: 'Detailed Breakdown' }
    ];

    return (
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-1">Activity Analytics</h2>
                <p className="text-xs text-gray-400 font-medium">View user statistics and distribution</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-gray-100 mb-6">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === tab.id
                                ? 'text-gray-800 border-gray-800'
                                : 'text-gray-400 border-transparent hover:text-gray-600'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-96">
                {/* Users by Role */}
                {activeTab === 'role' && (
                    <div className="w-full">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={roleData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="role" stroke="#9ca3af" style={{ fontSize: '13px' }} />
                                <YAxis stroke="#9ca3af" style={{ fontSize: '13px' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}
                                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
                                <Bar dataKey="total" fill="#d1d5db" name="Total" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="active" fill="#10b981" name="Active" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="verified" fill="#3b82f6" name="Verified" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Status Distribution */}
                {activeTab === 'status' && (
                    <div className="w-full flex items-center justify-center">
                        {summaryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={350}>
                                <PieChart>
                                    <Pie
                                        data={summaryData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => `${name}: ${value}`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {summaryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `${value} user(s)`} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-96 flex items-center justify-center text-gray-400">
                                No status data available
                            </div>
                        )}
                    </div>
                )}

                {/* Detailed Breakdown */}
                {activeTab === 'breakdown' && (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700">Total</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700">Active</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700">Verified</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700">Temp Password</th>
                            </tr>
                            </thead>
                            <tbody>
                            {Object.entries(userStats.byRole).map(([role, stats]) => (
                                <tr key={role} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4 font-medium text-gray-700 capitalize">{role}</td>
                                    <td className="text-center py-3 px-4 text-gray-600">{stats.total}</td>
                                    <td className="text-center py-3 px-4 text-gray-600">{stats.active}</td>
                                    <td className="text-center py-3 px-4 text-gray-600">{stats.verified}</td>
                                    <td className="text-center py-3 px-4 text-gray-600">{stats.temporaryPassword}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}