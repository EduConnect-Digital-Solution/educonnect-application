import React, { useState } from 'react';
import { getInitials } from '../../utils/formatters';
import { getRoleBadgeStyle, getStatusBadgeStyle } from '../../utils/styleHelpers';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

const UserTable = ({
                       users,
                       startIndex,
                       onDelete,
                       onStatusChange,
                       onAssignStudents,
                       onUnassignStudents,
                       onAssignClasses,
                       onUnassignClasses,
                       onManageParentLinks
                   }) => {
    const [openMenuId, setOpenMenuId] = useState(null);

    const handleMenuToggle = (userId) => {
        setOpenMenuId(openMenuId === userId ? null : userId);
    };

    return (
        <div className="flex-1 overflow-y-auto">

            {/* ================= MOBILE CARD VIEW ================= */}
            <div className="md:hidden flex flex-col gap-4 p-4">
                {users.length > 0 ? (
                    users.map((user, index) => (
                        <div
                            key={user.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3"
                        >
                            {/* Top Row */}
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                        <span className="text-xs font-medium text-gray-600">
                                          {getInitials(user.name)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {user.name}
                                        </p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>
                                </div>

                                {/* Menu */}
                                <div className="relative">
                                    <button
                                        className="p-2 rounded-full hover:bg-gray-100"
                                        onClick={() => handleMenuToggle(user.id)}
                                    >
                                        <MoreHorizontal size={18} />
                                    </button>

                                    {openMenuId === user.id && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20">
                                            {user.role === "teacher" && (
                                                <>
                                                    <button onClick={() => { onAssignStudents(user); handleMenuToggle(null); }} className="menu-item">Assign Students</button>
                                                    <button onClick={() => { onUnassignStudents(user); handleMenuToggle(null); }} className="menu-item">Unassign Students</button>
                                                    <button onClick={() => { onAssignClasses(user); handleMenuToggle(null); }} className="menu-item">Assign Classes</button>
                                                    <button onClick={() => { onUnassignClasses(user); handleMenuToggle(null); }} className="menu-item">Unassign Classes</button>
                                                </>
                                            )}
                                            {user.role === "parent" && (
                                                <button onClick={() => { onManageParentLinks(user); handleMenuToggle(null); }} className="menu-item">
                                                    Manage Student Links
                                                </button>
                                            )}
                                            <button onClick={() => { onStatusChange(user); handleMenuToggle(null); }} className="menu-item">
                                                Change Status
                                            </button>
                                            <button onClick={() => { onDelete(user); handleMenuToggle(null); }} className="menu-item text-red-600 hover:bg-red-50">
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <p className="text-gray-400">Role</p>
                                    <span className={`badge ${getRoleBadgeStyle(user.role)}`}>
                                        {user.role}
                                    </span>
                                </div>

                                <div>
                                    <p className="text-gray-400">Status</p>
                                    <span className={`badge ${getStatusBadgeStyle(user.status)}`}>
                                        {user.status}
                                    </span>
                                </div>

                                <div className="col-span-2">
                                    <p className="text-gray-400">Invited By</p>
                                    <p className="text-gray-600">{user.inviteSentBy}</p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-10">No users found.</p>
                )}
            </div>

            {/* ================= DESKTOP TABLE ================= */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 sticky top-0">
                    <tr>
                        {["S/N", "Name", "Email", "Role", "Status", "Invited By", "Actions"].map((header) => (
                            <th key={header} className="p-4 text-sm font-semibold text-gray-600 whitespace-nowrap">
                                {header}
                            </th>
                        ))}
                    </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                    {users.length > 0 ? (
                        users.map((user, index) => (
                            <tr key={user.id} className="hover:bg-gray-50/50">
                                <td className="p-4 text-sm text-gray-600">
                                    {startIndex + index + 1}.
                                </td>

                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {getInitials(user.name)}
                        </span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-800">
                        {user.name}
                      </span>
                                    </div>
                                </td>

                                <td className="p-4 text-sm text-gray-600">
                                    {user.email}
                                </td>

                                <td className="p-4">
                    <span className={`badge ${getRoleBadgeStyle(user.role)}`}>
                      {user.role}
                    </span>
                                </td>

                                <td className="p-4">
                    <span className={`badge ${getStatusBadgeStyle(user.status)}`}>
                      {user.status}
                    </span>
                                </td>

                                <td className="p-4 text-sm text-gray-600">
                                    {user.inviteSentBy}
                                </td>

                                <td className="p-4 relative">
                                    <button
                                        className="p-2 rounded-full hover:bg-gray-200"
                                        onClick={() => handleMenuToggle(user.id)}
                                    >
                                        <MoreHorizontal size={20} />
                                    </button>

                                    {openMenuId === user.id && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                                            {/* same menu logic */}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="7" className="p-8 text-center text-gray-500">
                                No users found.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const Pagination = ({ currentPage, totalPages, goToPage }) => {
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    return (
        <div className="p-4 flex justify-center items-center gap-4 border-t border-gray-100 shrink-0">
            <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
            >
                <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) =>
                    page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {page}
                        </button>
                    )
                )}
            </div>
            <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
};


const UserTableLayout = ({
    users,
    startIndex,
    onEdit,
    onDelete,
    onStatusChange,
    onAssignStudents,
    onUnassignStudents,
    onAssignClasses,
    onUnassignClasses,
    onManageParentLinks,
    currentPage,
    totalPages,
    goToPage,
    children
}) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
            {children}
            <UserTable
                users={users}
                startIndex={startIndex}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
                onAssignStudents={onAssignStudents}
                onUnassignStudents={onUnassignStudents}
                onAssignClasses={onAssignClasses}
                onUnassignClasses={onUnassignClasses}
                onManageParentLinks={onManageParentLinks}
            />
            <Pagination currentPage={currentPage} totalPages={totalPages} goToPage={goToPage} />
        </div>
    );
};

export default UserTableLayout;
