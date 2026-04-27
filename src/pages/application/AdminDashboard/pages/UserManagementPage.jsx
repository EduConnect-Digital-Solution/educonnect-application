import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import UserTableLayout from '../components/users/UserTable';
import UserFilter from '../components/users/UserFilter';

import {
    DeleteUserModal,
    InviteParentModal,
    InviteTeacherModal,
    StatusChangeModal,
    ManageParentStudentLinkModal,
    AssignStudentsToTeacherModal,
    UnassignStudentFromTeacherModal,
    AssignClassesModal,
    UnassignClassesModal
} from "../components/ui/modals.jsx";
import { Toast } from "../components/ui/Toast.jsx";
import { useAuth } from "../../../../contexts/AuthContext.jsx";
import {getDashboardUsers} from '../services/adminService';

const UserManagementPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({ role: '', status: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await getDashboardUsers(filters.role, filters.status);
                const userList = response.data.users.map(userInfo => ({
                    id: userInfo.id,
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    name: `${userInfo.firstName} ${userInfo.lastName}`,
                    email: userInfo.email,
                    role: userInfo.role,
                    status: userInfo.statusDisplay,
                    activityStatus: userInfo.isActive,
                    inviteSentBy: userInfo.invitedBy?.name || 'n/a',
                    ...(userInfo.role === 'teacher' && { classes: userInfo.classes })
                }));
                setUsers(userList);
            } catch (err) {
                console.error('Failed to fetch users:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [filters]);

    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.role.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [users, searchQuery]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentUsers = filteredUsers.slice(startIndex, endIndex);

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const { user } = useAuth();
    const [userToDelete, setUserToDelete] = useState(null);
    const [statusChangeUser, setStatusChangeUser] = useState(null);
    const [addUserRole, setAddUserRole] = useState(null);
    const [viewTeacher, setViewTeacher] = useState(false);
    const [viewParent, setViewParent] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

    // State for all modals
    const [showManageLinksModal, setShowManageLinksModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showUnassignModal, setShowUnassignModal] = useState(false);
    const [showAssignClassesModal, setShowAssignClassesModal] = useState(false);
    const [showUnassignClassesModal, setShowUnassignClassesModal] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [selectedParent, setSelectedParent] = useState(null);

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleAddNew = (role) => {
        setAddUserRole(role);
        if (role === 'Teacher') {
            setViewTeacher(true)
        } else if (role === 'Parent') {
            setViewParent(true)
        }
    };
    
    const handleDelete = (user) => {
        setUserToDelete(user);
    };
    
    const handleStatusChange = (user) => {
        setStatusChangeUser(user);
    };
    
    const handleOpenAssignModal = (teacher) => {
        setSelectedTeacher(teacher);
        setShowAssignModal(true);
    };
    
    const handleOpenUnassignModal = (teacher) => {
        setSelectedTeacher(teacher);
        setShowUnassignModal(true);
    };

    const handleOpenAssignClassesModal = (teacher) => {
        setSelectedTeacher(teacher);
        setShowAssignClassesModal(true);
    };

    const handleOpenUnassignClassesModal = (teacher) => {
        setSelectedTeacher(teacher);
        setShowUnassignClassesModal(true);
    };

    const handleOpenManageLinksModal = (parent) => {
        setSelectedParent(parent);
        setShowManageLinksModal(true);
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading Users...</p>
                </div>
            </AdminLayout>
        );
    }
    
    if (error) {
        return <AdminLayout><div className="text-center py-8 text-red-500">Failed to load users.</div></AdminLayout>;
    }

    return (
        <AdminLayout>
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}
            <UserTableLayout
                users={currentUsers}
                startIndex={startIndex}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onAssignStudents={handleOpenAssignModal}
                onUnassignStudents={handleOpenUnassignModal}
                onAssignClasses={handleOpenAssignClassesModal}
                onUnassignClasses={handleOpenUnassignClassesModal}
                onManageParentLinks={handleOpenManageLinksModal}
                currentPage={currentPage}
                totalPages={totalPages}
                goToPage={goToPage}
            >
                <UserFilter
                    searchQuery={searchQuery}
                    onSearch={handleSearch}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onAddNew={handleAddNew}
                    totalUsers={users.length}
                    startIndex={startIndex}
                    endIndex={endIndex}
                />
            </UserTableLayout>

            {viewTeacher && <InviteTeacherModal onClose={() => setViewTeacher(false)} showToast={showToast} />}
            {viewParent && <InviteParentModal onClose={() => setViewParent(false)} showToast={showToast} />}

            {statusChangeUser && <StatusChangeModal
                onClose={() => setStatusChangeUser(null)}
                showToast={showToast}
                user={statusChangeUser}
                schoolId={user.schoolId}
            />}

            {userToDelete && <DeleteUserModal
                onClose={() => setUserToDelete(null)}
                showToast={showToast}
                user={userToDelete}
                schoolId={user.schoolId}
            />}

            {showManageLinksModal && <ManageParentStudentLinkModal
                onClose={() => setShowManageLinksModal(false)}
                showToast={showToast}
                parent={selectedParent}
                schoolId={user.schoolId}
            />}



            {showAssignModal && selectedTeacher && <AssignStudentsToTeacherModal
                onClose={() => setShowAssignModal(false)}
                showToast={showToast}
                teacher={selectedTeacher}
                schoolId={user.schoolId}
            />}

            {showUnassignModal && selectedTeacher && <UnassignStudentFromTeacherModal
                onClose={() => setShowUnassignModal(false)}
                showToast={showToast}
                teacher={selectedTeacher}
                schoolId={user.schoolId}
            />}

            {showAssignClassesModal && selectedTeacher && <AssignClassesModal
                onClose={() => setShowAssignClassesModal(false)}
                showToast={showToast}
                teacher={selectedTeacher}
                schoolId={user.schoolId}
            />}

            {showUnassignClassesModal && selectedTeacher && <UnassignClassesModal
                onClose={() => setShowUnassignClassesModal(false)}
                showToast={showToast}
                teacher={selectedTeacher}
                schoolId={user.schoolId}
            />}
        </AdminLayout>
    );
};

export default UserManagementPage;