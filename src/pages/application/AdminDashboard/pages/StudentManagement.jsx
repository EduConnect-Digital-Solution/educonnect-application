import React, {useEffect, useState} from 'react';
import {Search, Filter, ArrowDownUp, ChevronLeft, ChevronRight, X, UserCircle2, Plus, Trash2} from 'lucide-react';
import {Header} from "../../dashboardUtilities.jsx";
import AdminLayout, {Sidebar} from "../components/layout/AdminLayout.jsx";
import {CreateStudentModal, DeleteUserModal, StatusChangeModal} from "../components/ui/modals.jsx";
import Input from "../components/ui/Input.jsx";
import {Toast} from "../components/ui/Toast.jsx";
import {getStatusBadgeStyle} from "../utils/styleHelpers.js";
import {getAllStudents, updateStudent} from "../../../auth/authAPIs.js";
import {formatDate, getInitials} from "../utils/formatters.js";
import {useAuth} from "../../../../contexts/AuthContext.jsx";

const StudentsList = () => {
    const {user} = useAuth()
    const [statusChangeUser, setStatusChangeUser] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [userToDelete, setUserToDelete] = useState(null);
    const [showAddUserDropdown, setShowAddUserDropdown] = useState(false);
    const [viewStudent, setViewStudent] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [createStudent, setCreateStudent] = useState(false);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [mockUsers, setMockUsers] = useState([]);
    const [assignmentSystem, setAssignmentSystem] = useState(mockUsers.grade ? 'grade' : 'class');
    const itemsPerPage = 8;


    useEffect(() => {
        if (viewStudent) {
            setFormData({
                schoolId: viewStudent.schoolId || user.schoolId,
                firstName: viewStudent.firstName || '',
                lastName: viewStudent.lastName || '',
                email: viewStudent.email || '',
                class: viewStudent.class || '',
                section: viewStudent.section || '',
                rollNumber: viewStudent.rollNumber || '',
                grade: viewStudent.grade || '',
                dateOfBirth: viewStudent.dateOfBirth || '',
                gender: viewStudent.gender || '',
                address: viewStudent.address || '',
                phone: viewStudent.phone || ''
            });
        }
    }, [viewStudent]);

    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };


    const handleUpdateStudent = async (e) => {
        e.preventDefault();

        const payload = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            class: formData.class,
            section: formData.section,
            phone: formData.phone
        }

        try {
            const response = await updateStudent(viewStudent.id, payload);

            showToast('Student updated successfully!', 'success');
            setViewStudent(null);
            setIsEditing(false);
            // Here you might want to refresh the students list
            const fetchUsers = async () => {
                try {
                    setLoading(true);
                    const response = await getAllStudents();
                    const mockUsersList = response.data.students.map(userInfo => ({
                        id: userInfo.id,
                        firstName: userInfo.firstName,
                        lastName: userInfo.lastName,
                        name: `${userInfo.firstName} ${userInfo.lastName}`,
                        email: userInfo?.email || '-',
                        role: 'Student',
                        status: userInfo.isActive,
                        parents: userInfo.parents,
                        updatedAt: userInfo.updatedAt
                    }));

                    setMockUsers(mockUsersList)
                } catch (error) {
                    console.error(error)

                } finally {
                    setLoading(false);
                }
            };

            fetchUsers();

        } catch (error) {
            console.error(error);
            showToast(error.message || 'Failed to update student.', 'error');
        }
    };


    useEffect(() => {

        const fetchUsers = async () => {
            try {
                setLoading(true);
                const response = await getAllStudents();
                const mockUsersList = response.data.students.map(userInfo => ({
                    id: userInfo.id,
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                    dateOfBirth: userInfo.dateOfBirth?.slice(0, 10),
                    gender: userInfo.gender,
                    name: `${userInfo.firstName} ${userInfo.lastName}`,
                    email: userInfo?.email || '-',
                    role: 'Student',
                    class: userInfo?.class || '-',
                    section: userInfo?.section || '-',
                    phone: userInfo?.phone || '-',
                    address: userInfo?.address || '-',
                    status: userInfo.isActive,
                    parents: userInfo.parents,
                    updatedAt: userInfo.updatedAt
                }));
                setMockUsers(mockUsersList)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);


    // Filter users based on search
    const filteredUsers = mockUsers.filter(user => user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase()) || user.role.toLowerCase().includes(searchQuery.toLowerCase()));

    // Calculate pagination
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentUsers = filteredUsers.slice(startIndex, endIndex);

    // Handle page changes
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Reset to page 1 when search changes
    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const handleRemoveUser = (user) => {
        // Add your remove logic here
        if (window.confirm(`Are you sure you want to remove ${user.name}?`)) {
            alert(`User ${user.name} has been removed`);
        }
    };

    const handleChangeStatus = (user) => {
        setStatusChangeUser(user);
    };


    const confirmStatusChange = (newStatus) => {
        alert(`Status changed to: ${newStatus} for ${statusChangeUser.name}`);
        setStatusChangeUser(null);
    };

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
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

    const [toast, setToast] = useState({show: false, message: '', type: 'error'});

    const showToast = (message, type = 'error') => {
        setToast({show: true, message, type});
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading Students...</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <>
            <AdminLayout>
                {toast.show && (<Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({...toast, show: false})}
                />)}

                {/* Student Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
                    {/* Header Section */}
                    <div
                        className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-100 shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Student Management Table</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} students
                            </p>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {/* Search Bar */}
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                        size={18}/>
                                <input
                                    type="text"
                                    placeholder="Search students..."
                                    value={searchQuery}
                                    onChange={handleSearch}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                            </div>

                            {/* Add new Student */}
                            <div className="relative">
                                <button
                                    onClick={() => setCreateStudent(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
                                >
                                    <Plus size={18}/>
                                    Add
                                </button>

                            </div>
                        </div>
                    </div>

                    {/* ================= TABLE / LIST SECTION ================= */}

                    {/* ================= MOBILE CARD VIEW ================= */}
                    <div className="md:hidden flex flex-col gap-4 p-3">
                        {currentUsers.length > 0 ? (
                            currentUsers.map((user, index) => (
                                <div
                                    key={user.id}
                                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3"
                                >
                                    {/* Top Section */}
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

                                        <span
                                            className={`badge ${getStatusBadgeStyle(user.status)}`}
                                        >
                                              {user.status === true ? "Active" : "Inactive"}
                                            </span>
                                    </div>

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <p className="text-gray-400">Phone</p>
                                            <p className="text-gray-700">{user.phone}</p>
                                        </div>

                                        <div>
                                            <p className="text-gray-400">Last Updated</p>
                                            <p className="text-gray-700">
                                                {formatDate(user.updatedAt)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <button
                                            onClick={() => setViewStudent(user)}
                                            className="action-btn-blue"
                                        >
                                            View
                                        </button>

                                        <button
                                            onClick={() => handleChangeStatus(user)}
                                            className="action-btn-blue"
                                        >
                                            Status
                                        </button>

                                        <button
                                            onClick={() => setUserToDelete(user)}
                                            className="action-btn-red"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-10">
                                No users found matching your search.
                            </p>
                        )}
                    </div>

                    {/* ================= DESKTOP TABLE ================= */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50 sticky top-0">
                            <tr>
                                {['S/N', 'Name', 'Parent Email', 'Parent No.', 'Status', 'Last Updated', 'Actions'].map((header) => (
                                    <th key={header} className="p-4 text-sm font-semibold text-gray-600 whitespace-nowrap">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {currentUsers.length > 0 ? (
                                    currentUsers.map((user, index) => (
                                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
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

                                        <td className="p-4 text-sm text-gray-600">{user.email}</td>

                                        <td className="p-4 text-sm text-gray-600">{user.phone}</td>

                                        <td className="p-4">
                                            <span className={`badge ${getStatusBadgeStyle(user.status)}`}>
                                              {user.status === true ? "Active" : "Inactive"}
                                            </span>
                                        </td>

                                        <td className="p-4 text-sm text-gray-600">
                                            {formatDate(user.updatedAt)}
                                        </td>

                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setViewStudent(user)} className="action-btn-blue">
                                                    View Details
                                                </button>

                                                <button onClick={() => handleChangeStatus(user)} className="action-btn-blue">
                                                    Change Status
                                                </button>

                                                <button onClick={() => setUserToDelete(user)} className="action-btn-red">
                                                    Remove
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    {/* ================= PAGINATION ================= */}
                    <div className="p-4 flex justify-center items-center gap-3 border-t border-gray-100 shrink-0 flex-wrap">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="pagination-btn"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex items-center gap-1">
                            {getPageNumbers().map((page, index) =>
                                page === "..." ? (
                                    <span key={index} className="px-2 text-gray-400">...</span>
                                ) : (
                                    <button
                                        key={page}
                                        onClick={() => goToPage(page)}
                                        className={`pagination-number ${
                                            currentPage === page ? "active" : ""
                                        }`}
                                    >
                                        {page}
                                    </button>
                                )
                            )}
                        </div>

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="pagination-btn"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/*TODO: for view details add tab for user Info, Subjects taken with Performance and Attendance visible for each class*/}

                {viewStudent && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <div
                                className="fixed inset-0 bg-black/30"
                                onClick={() => {
                                    setViewStudent(null);
                                    setIsEditing(false);
                                }}
                            />

                            <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
                                {/* Close */}
                                <button
                                    onClick={() => {
                                        setViewStudent(null)
                                        setIsEditing(false)
                                    }}
                                    className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                                >
                                    <X size={20}/>
                                </button>

                                {/* Header */}
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                        <UserCircle2 className="w-6 h-6 text-gray-600"/>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Student Details</h3>
                                        <p className="text-sm text-gray-500">
                                            {viewStudent.firstName} {viewStudent.lastName}
                                        </p>
                                    </div>
                                </div>

                                {/* Form */}
                                <div className="space-y-5" >
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">First Name</label>
                                            {isEditing ?
                                                <Input name="firstName" value={formData.firstName}
                                                       onChange={handleInputChange}/> :
                                                <p className="text-sm text-gray-900">{formData.firstName}</p>}
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Last Name</label>
                                            {isEditing ? <Input name="lastName" value={formData.lastName}
                                                                onChange={handleInputChange}/> :
                                                <p className="text-sm text-gray-900">{formData.lastName}</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Email</label>
                                        <p className="text-sm text-gray-900">{formData.email}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">School ID</label>
                                        <p className="text-sm text-gray-900">{formData.schoolId}</p>
                                    </div>


                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-4 animate-in fade-in duration-300">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Class</label>
                                                {isEditing ? <Input
                                                    name="class"
                                                    placeholder="e.g. JSS1"
                                                    value={formData.class}
                                                    onChange={handleInputChange}
                                                /> : <p className="text-sm text-gray-900">{formData.class}</p>}
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Section</label>
                                                {isEditing ? <Input
                                                    name="section"
                                                    placeholder="e.g. Gold"
                                                    value={formData.section}
                                                    onChange={handleInputChange}
                                                /> : <p className="text-sm text-gray-900">{formData.section}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Date of Birth</label>
                                            <p className="text-sm text-gray-900">{formData.dateOfBirth}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Gender</label>
                                            <p className="text-sm text-gray-900">{formData.gender}</p>
                                        </div>
                                    </div>

                                    <div className={`flex gap-5 items-center`}>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Phone</label>
                                            {isEditing ? <Input name="phone" value={formData.phone}
                                                                onChange={handleInputChange}/> :
                                                <p className="text-sm text-gray-900">{formData.phone}</p>}
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Address</label>
                                            <p className="text-sm text-gray-900">{formData.address}</p>
                                        </div>
                                    </div>

                                    {/* Parent Linking */}
                                    <div className="border-t border-gray-100 pt-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                            Linked Parents
                                        </h4>

                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {viewStudent.parents?.length > 0 ? (viewStudent.parents.map((id, index) => (
                                                <span
                                                    key={index}
                                                    className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700"
                                                >
                                                {id.name}
                                            </span>))) : (
                                                <p className="text-xs text-gray-400">No parents linked</p>)}
                                        </div>

                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3 pt-4">
                                        {isEditing ? (<>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditing(false)}
                                                    className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleUpdateStudent}
                                                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                                >
                                                    Save Changes
                                                </button>
                                            </>) :

                                            (<>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setViewStudent(null)
                                                        setIsEditing(false)
                                                    }}
                                                    className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                                                >
                                                    Close
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditing(true)}
                                                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                                >
                                                    Edit
                                                </button>

                                            </>)}


                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {createStudent && <CreateStudentModal onClose={() => setCreateStudent(false)} showToast={showToast} />}

                {/* Change Status Modal */}
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
            </AdminLayout>
        </>
    )
};

export default StudentsList;