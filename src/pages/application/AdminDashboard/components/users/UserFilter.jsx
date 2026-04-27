import React, { useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';

const UserFilter = ({
    searchQuery,
    onSearch,
    filters,
    onFilterChange,
    onAddNew,
    totalUsers,
    startIndex,
    endIndex,
}) => {
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showAddUserDropdown, setShowAddUserDropdown] = useState(false);
    const userStatuses = ['Active', 'Inactive', 'Pending'];

    return (
        <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-100 shrink-0">
            <div>
                <h2 className="text-xl font-bold text-gray-800">User Management</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Showing {startIndex + 1}-{Math.min(endIndex, totalUsers)} of {totalUsers} users
                </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                {/* Search Bar */}
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={onSearch}
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                </div>

                {/* Add new user*/}
                <div className="relative">
                    <button
                        onClick={() => setShowAddUserDropdown(!showAddUserDropdown)}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm  hover:bg-blue-700 transition-all shadow-sm"
                    >
                        <Plus size={18} />
                        Add
                    </button>

                    {showAddUserDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1">
                            {['Teacher', 'Parent'].map((role) => (
                                <button
                                    key={role}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                    onClick={() => {
                                        onAddNew(role);
                                        setShowAddUserDropdown(false);
                                    }}
                                >
                                    Add {role}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Main Filter tab*/}
                <div className="relative">
                    <button
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        className={`p-2 rounded-lg transition-colors ${showFilterDropdown ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Filter size={20} />
                    </button>

                    {showFilterDropdown && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Role</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {['admin', 'teacher', 'parent'].map((role) => (
                                            <button
                                                key={role}
                                                onClick={() => onFilterChange('role', filters.role === role ? '' : role)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filters.role === role ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {userStatuses.map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => onFilterChange('status', filters.status === status.toLowerCase() ? '' : status.toLowerCase())}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filters.status === status.toLowerCase() ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
                                    <button
                                        onClick={() => {
                                            onFilterChange('role', '');
                                            onFilterChange('status', '');
                                        }}
                                        className="text-xs text-red-500 hover:underline"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserFilter;
