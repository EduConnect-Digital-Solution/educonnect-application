import React, { useEffect, useRef, useState } from 'react';
import { getStatusBadgeStyle } from '../../utils/styleHelpers.js';
import { UserCircle2, X, Search, Plus } from 'lucide-react';
import Input from './Input.jsx';
import {
    assignClasses,
    assignStudenttoTeacher,
    bulkAssignStudentToTeacher,
    createStudent,
    deleteClasses,
    deleteStudent,
    deleteUser,
    getAllStudents,
    getAllParents,
    inviteParent,
    inviteTeacher,
    linkStudentToParent,
    toggleStatus,
    toggleStudentStatus,
    unassignStudentToTeacher,
    unlinkStudentToParent,
} from '../../../../auth/authAPIs.js';
import { formatStatus, getInitials } from '../../utils/formatters.js';
import { availableSubjects } from '../../../../../utils/imports.jsx';

// Reusable Student Selector Component
const StudentSelector = ({ selectedStudentIds, onStudentToggle }) => {
    const [students, setStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await getAllStudents();
                setStudents(res.data.students || []);
            } catch (error) {
                console.error('Failed to fetch students:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, []);

    const filteredStudents = students.filter(student =>
        student.fullName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <p>Loading students...</p>;

    return (
        <div>
            <Input
                placeholder="Search for students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="mt-2 h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {filteredStudents.map(student => (
                    <div
                        key={student.id}
                        className="flex items-center p-2 rounded-md hover:bg-gray-100"
                    >
                        <input
                            type="checkbox"
                            id={`student-${student.id}`}
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={() => onStudentToggle(student.id)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                        <label
                            htmlFor={`student-${student.id}`}
                            className="ml-3 block text-sm font-medium text-gray-700"
                        >
                            {student.fullName}
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
};


export const AssignStudentsToTeacherModal = ({ onClose, showToast, teacher, schoolId }) => {
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);

    const handleStudentToggle = (studentId) => {
        setSelectedStudentIds(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const handleSubmit = async () => {
        if (selectedStudentIds.length === 0) {
            showToast('Please select at least one student.', 'error');
            return;
        }
        try {
            const payload = {
                teacherId: teacher.id,
                studentIds: selectedStudentIds,
                schoolId,
            };
            await assignStudenttoTeacher(payload);
            showToast('Students assigned successfully!', 'success');
            onClose();
        } catch (error) {
            showToast(error.message || 'Failed to assign students.', 'error');
        }
    };

    return (
        <Modal title={`Assign Students to ${teacher.name}`} onClose={onClose} onSubmit={handleSubmit}>
            <StudentSelector selectedStudentIds={selectedStudentIds} onStudentToggle={handleStudentToggle} />
        </Modal>
    );
};

export const UnassignStudentFromTeacherModal = ({ onClose, showToast, teacher, schoolId }) => {
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);

    const handleStudentToggle = (studentId) => {
        setSelectedStudentIds(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const handleSubmit = async () => {
        if (selectedStudentIds.length === 0) {
            showToast('Please select at least one student to unassign.', 'error');
            return;
        }
        try {
            const payload = {
                teacherId: teacher.id,
                studentIds: selectedStudentIds,
                schoolId,
            };
            await unassignStudentToTeacher(payload);
            showToast('Students unassigned successfully!', 'success');
            onClose();
        } catch (error) {
            showToast(error.message || 'Failed to unassign students.', 'error');
        }
    };

    return (
        <Modal title={`Unassign Students from ${teacher.name}`} onClose={onClose} onSubmit={handleSubmit}>
            <StudentSelector selectedStudentIds={selectedStudentIds} onStudentToggle={handleStudentToggle} />
        </Modal>
    );
};

export const BulkAssignStudentsModal = ({ onClose, showToast, allUsers, schoolId }) => {
    const [teachers, setTeachers] = useState([]);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);

    useEffect(() => {
        const teacherList = allUsers.filter(u => u.role === 'teacher');
        setTeachers(teacherList);
    }, [allUsers]);

    const handleStudentToggle = (studentId) => {
        setSelectedStudentIds(prev =>
            prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
        );
    };

    const handleSubmit = async () => {
        if (!selectedTeacher || selectedStudentIds.length === 0) {
            showToast('Please select a teacher and at least one student.', 'error');
            return;
        }
        try {
            const payload = {
                assignments: [{
                    teacherId: selectedTeacher.id,
                    studentIds: selectedStudentIds
                }],
                schoolId
            };
            await bulkAssignStudentToTeacher(payload);
            showToast('Students bulk assigned successfully!', 'success');
            onClose();
        } catch (error) {
            showToast(error.message || 'Failed to bulk assign students.', 'error');
        }
    };

    return (
        <Modal title="Bulk Assign Students" onClose={onClose} onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Select Teacher</label>
                    <select
                        onChange={(e) => setSelectedTeacher(teachers.find(t => t.id === e.target.value))}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        <option value="">Select a teacher</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Select Students</label>
                    <StudentSelector selectedStudentIds={selectedStudentIds} onStudentToggle={handleStudentToggle} />
                </div>
            </div>
        </Modal>
    );
};

export const AssignClassesModal = ({ onClose, showToast, teacher, schoolId }) => {
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [registryStyle, setRegistryStyle] = useState('');
    const [placementValue, setPlacementValue] = useState('');
    const [section, setSection] = useState('');

    const classOptions = [
        "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
        "JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"
    ];
    const gradeOptions = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

    const handleAddClass = () => {
        if (!placementValue) return;
        const className = registryStyle === 'class' ? `${placementValue}` : placementValue;
        if (className && !selectedClasses.includes(className)) {
            setSelectedClasses([...selectedClasses, className]);
        }
        setPlacementValue('');
        setSection('');
    };

    const handleRemoveClass = (classToRemove) => {
        setSelectedClasses(selectedClasses.filter(c => c !== classToRemove));
    };

    const handleSubmit = async () => {
        if (selectedClasses.length === 0) {
            showToast('Please assign at least one class.', 'error');
            return;
        }
        try {
            const payload = {
                teacherId: teacher.id,
                classes: selectedClasses,
                schoolId,
            };
            await assignClasses(payload);
            showToast('Classes assigned successfully!', 'success');
            onClose();
        } catch (error) {
            showToast(error.message || 'Failed to assign classes.', 'error');
        }
    };

    return (
        <Modal title={`Assign Classes to ${teacher.name}`} onClose={onClose} onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-3 p-2 border rounded-lg min-h-10">
                    {selectedClasses.length > 0 ? selectedClasses.map(c => (
                        <div key={c} className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 text-sm font-medium mr-2 px-2.5 py-1 rounded-full">
                            {c}
                            <button onClick={() => handleRemoveClass(c)} type="button"><X size={14} /></button>
                        </div>
                    )) : <p className="text-sm text-gray-500">No classes added yet.</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-700">Registry Style</label>
                        <select
                            value={registryStyle}
                            onChange={(e) => setRegistryStyle(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                        >
                            <option value="">Select Style</option>
                            <option value="class">Class (e.g., JSS 1)</option>
                            <option value="grade">Grade (e.g., Grade 7)</option>
                        </select>
                    </div>
                    {registryStyle && (
                        <>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700">{registryStyle === 'grade' ? 'Level' : 'Class'}</label>
                                <select
                                    value={placementValue}
                                    onChange={(e) => setPlacementValue(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                                >
                                    <option value="">Select Level</option>
                                    {registryStyle === 'class' && classOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    {registryStyle === 'grade' && gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div>
                                <button onClick={handleAddClass} className="w-full px-4 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Class</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export const UnassignClassesModal = ({ onClose, showToast, teacher, schoolId }) => {
    const [selectedClasses, setSelectedClasses] = useState([]);

    // teacher.classes should be available now.
    const assignedClasses = teacher.classes || [];

    const handleClassToggle = (classToToggle) => {
        setSelectedClasses(prev =>
            prev.includes(classToToggle)
                ? prev.filter(c => c !== classToToggle)
                : [...prev, classToToggle]
        );
    };

    const handleSubmit = async () => {
        if (selectedClasses.length === 0) {
            showToast('Please select at least one class to unassign.', 'error');
            return;
        }
        try {
            const payload = {
                teacherId: teacher.id,
                classes: selectedClasses,
                schoolId,
            };
            await deleteClasses(payload); // this function is not imported yet
            showToast('Classes unassigned successfully!', 'success');
            onClose();
        } catch (error) {
            showToast(error.message || 'Failed to unassign classes.', 'error');
        }
    };

    return (
        <Modal title={`Unassign Classes from ${teacher.name}`} onClose={onClose} onSubmit={handleSubmit}>
            <div className="space-y-4">
                <p className="text-sm text-gray-500">Select classes to unassign from this teacher.</p>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                    {assignedClasses.length > 0 ? (
                        assignedClasses.map(c => (
                            <div key={c} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`class-${c}`}
                                    checked={selectedClasses.includes(c)}
                                    onChange={() => handleClassToggle(c)}
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                />
                                <label htmlFor={`class-${c}`} className="ml-3 block text-sm font-medium text-gray-700">
                                    {c}
                                </label>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 text-center">No classes are currently assigned to this teacher.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export const DeleteUserModal = ({ onClose, showToast, user, schoolId }) => {
    const [userToDelete, setUserToDelete] = useState(user);
    const [deleteReason, setDeleteReason] = useState('');

    const handleDelete = async () => {
        const updatedUser = { ...userToDelete, reason: deleteReason };

        const userPayload = {reason: deleteReason, schoolId: schoolId, userId: user.id}
        const studentPayload = {reason: deleteReason, schoolId: schoolId, studentId: user.id}

        let response;

        switch (user.role) {
            case 'teacher':
                response = await deleteUser(userPayload);
                break;
            case 'parent':
                response = await deleteUser(userPayload);
                break;
            case 'Student':
                response = await deleteStudent(studentPayload);
                break;
            default:
                throw new Error('Invalid user role');
        }

        setUserToDelete(updatedUser);
        showToast('User removed successfully!', 'success');
        onClose();
    };

    // Subject input logic... (simplified)
    return (
        <Modal title="Delete User" onClose={onClose} onSubmit={handleDelete}>
            <div>

                <div className="flex items-center gap-3 mb-6">

                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserCircle2 className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">{user.name}</p>
                    </div>
                </div>

                <div className="mb-4 flex flex-row items-center gap-3 ">
                    <p className="text-sm text-gray-600">Current Status:</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(user.status)}`}>
                        {formatStatus(user.status)}
                    </span>
                </div>
                <div className="w-full text-left mb-6">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                        Reason for removal
                    </label>
                    <textarea
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                        rows="3"
                        placeholder="Please provide a reason for deleting this account..."
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                    />
                </div>
            </div>
        </Modal>
    );
};

export const StatusChangeModal = ({ onClose, showToast, user, schoolId }) => {
    const [statusChangeReason, setStatusChangeReason] = useState('');
    const [selectedAction, setSelectedAction] = useState(
        user.status || user.activityStatus ? 'deactivate' : 'activate'
    );

    const confirmStatusChange = async () => {
        // Validation
        if (!statusChangeReason.trim()) {
            showToast('Please provide a reason for the status change', 'error');
            return;
        }

        try {
            let response;
            const newStatus = selectedAction === 'activate';

            const teacherParentPayload = {
                action: selectedAction,
                reason: statusChangeReason,
                userId: user.id,
                schoolId: schoolId
            };

            const studentPayload = {
                action: selectedAction,
                reason: statusChangeReason,
                studentId: user.id,
                schoolId: schoolId
            };

            switch (user.role) {
                case 'teacher':
                    response = await toggleStatus(teacherParentPayload);
                    break;
                case 'parent':
                    response = await toggleStatus(teacherParentPayload);
                    break;
                case 'Student':
                    response = await toggleStudentStatus(studentPayload);
                    break;
                default:
                    throw new Error('Invalid user role');
            }

            showToast('User status updated successfully!', 'success');
            onClose();

        } catch (error) {
            showToast('Failed to update user status.', 'error');
        }
    };

    // Get current status value
    const currentStatus = user.status;
    const currentTPStatus = user.activityStatus;
    const isCurrentlyActive = currentStatus === true || currentTPStatus === true;

    return (
        <Modal
            title="Change User Status"
            onClose={onClose}
            onSubmit={confirmStatusChange}
            submitText="Update Status"
            submitDisabled={!statusChangeReason.trim()}
        >
            <div>
                {/* User Info */}
                <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-lg shadow-md">
                        {getInitials(user.name)}
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email || user.role}</p>
                    </div>
                </div>

                {/* Current Status Display */}
                <div className="mb-6 p-4 border border-gray-200 rounded-xl">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Current Status:</p>
                    <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                            isCurrentlyActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${
                                isCurrentlyActive ? 'bg-green-500' : 'bg-red-500'
                            }`}></span>
                            {isCurrentlyActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>

                {/* Status Action Selector - Toggle Style */}
                <div className="mb-6">
                    <p className="text-sm font-semibold text-gray-700 mb-3">New Status:</p>

                    {/* Toggle Switch */}
                    <div className="relative inline-flex items-center bg-gray-100 rounded-xl p-1 w-full">
                        <button
                            type="button"
                            onClick={() => setSelectedAction('activate')}
                            disabled={isCurrentlyActive}
                            className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                selectedAction === 'activate'
                                    ? 'bg-white text-green-700 shadow-md'
                                    : 'text-gray-600 hover:text-gray-900'
                            } ${isCurrentlyActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                Activate
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedAction('deactivate')}
                            disabled={!isCurrentlyActive}
                            className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                selectedAction === 'deactivate'
                                    ? 'bg-white text-red-700 shadow-md'
                                    : 'text-gray-600 hover:text-gray-900'
                            } ${!isCurrentlyActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <span className="flex items-center justify-center gap-2">
                                Deactivate
                            </span>
                        </button>
                    </div>

                    {/* Helper Text */}
                    {isCurrentlyActive ? (
                        <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            User is currently active. You can only deactivate.
                        </p>
                    ) : (
                        <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            User is currently inactive. You can only activate.
                        </p>
                    )}
                </div>

                {/* Reason Input */}
                <div className="w-full mb-4">
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        Reason for Status Change
                        <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                        rows="4"
                        placeholder="Please provide a detailed reason for this status change..."
                        value={statusChangeReason}
                        onChange={(e) => setStatusChangeReason(e.target.value)}
                        required
                    />
                </div>
            </div>
        </Modal>
    );
};

export const InviteTeacherModal = ({ onClose, showToast }) => {
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', message: '' });
    const [subjects, setSubjects] = useState([]);

    const handleInviteTeacher = async () => {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        // Validation Checks
        if (!teacherFormData?.firstName) {
            showToast("Please input first name");
            return;
        }

        if (!teacherFormData?.lastName) {
            showToast("Please input last name");
            return;
        }

        if (!teacherFormData?.subjects || teacherFormData.subjects.length === 0) {
            showToast("Please add at least 1 subject");
            return;
        }
        if (!teacherFormData?.message) {
            showToast("Please input an invitation message");
            return;
        }

        if (!teacherFormData?.email || !emailPattern.test(teacherFormData.email)) {
            showToast("Please provide a valid email address.");
            return;
        }

        const payload = {
            email: teacherFormData.email.trim().toLowerCase(),
            firstName: teacherFormData.firstName.trim(),
            lastName: teacherFormData.lastName.trim(),
            subjects: subjects.map(subj => subj.trim()),
            message: teacherFormData.message.trim(),
        };

        try {
            await inviteTeacher(payload);
            showToast('Teacher invited successfully', 'success');
            onClose();

        } catch (err) {
            const message = err?.message || err?.error || 'Registration failed';
            showToast(message, 'error');
        }
    };
    const [inputValue, setInputValue] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const inputRef = useRef(null);
    const [teacherFormData, setTeacherFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        subjects: [''],
        message: '',
    });
    // Filter subjects based on input
    useEffect(() => {
        if (inputValue.trim()) {
            const filtered = availableSubjects.filter(subject =>
                subject.toLowerCase().includes(inputValue.toLowerCase()) &&
                !subjects.includes(subject)
            );
            setFilteredSubjects(filtered);
        } else {
            setFilteredSubjects(availableSubjects.filter(s => !subjects.includes(s)));
        }
    }, [inputValue, subjects]);

    const handleAddSubject = (subject) => {
        if (subject.trim() && !subjects.includes(subject)) {
            setSubjects([...subjects, subject]);
            setInputValue('');
            setShowDropdown(false);
            inputRef.current?.focus();
        }

    };

    const handleRemoveSubject = (subjectToRemove) => {
        setSubjects(subjects.filter(subject => subject !== subjectToRemove));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSubject(inputValue);
        }
    };

    const handleInputFocus = () => {
        setShowDropdown(true);
    };

    const handleInputBlur = () => {
        // Delay closing dropdown to allow dropdown click to register
        setTimeout(() => setShowDropdown(false), 200);
    };



    const [studentFormData, setStudentFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
//   "teacherIds": ["694fe6e4f6a5eff53cd7f8eb"],
        class: "",
        section: "",
        rollNumber: "",
        grade: "",
        dateOfBirth: "",
        gender: "",
        address: "",
        phone: ""
    });

    // Subject input logic... (simplified)
    return (
        <Modal title="Invite Teacher" onClose={onClose} onSubmit={handleInviteTeacher}>
            {/* Form */}
            <div className="space-y-5">
                {/* Names */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name"
                        value={teacherFormData.firstName}
                        onChange={(e) => setTeacherFormData({...teacherFormData, firstName: e.target.value})}
                        placeholder="e.g. John"
                        required
                    />
                    <Input
                        label="Last Name"
                        value={teacherFormData.lastName}
                        onChange={(e) => setTeacherFormData({...teacherFormData, lastName: e.target.value})}
                        placeholder="e.g. Doe"
                        required
                    />
                </div>

                <Input
                    label="Email Address"
                    type="email"
                    value={teacherFormData.email}
                    onChange={(e) => setTeacherFormData({...teacherFormData, email: e.target.value})}
                    placeholder="teacher@school.com"
                />

                {/* Subjects */}
                <div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Subjects
                        </label>

                        {/* Selected Subjects */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {subjects.map((subject) => (
                                <div
                                    key={subject}
                                    className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-1 rounded-lg"
                                >
                                    <span>{subject}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSubject(subject)}
                                        className="hover:text-blue-900 transition-colors"
                                        aria-label={`Remove ${subject}`}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Input and Dropdown Container */}
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Add subject and press Enter"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={handleInputFocus}
                                onBlur={handleInputBlur}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />

                            {/* Dropdown List */}
                            {showDropdown && filteredSubjects.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm z-10">
                                    {filteredSubjects.map((subject) => (
                                        <button
                                            key={subject}
                                            type="button"
                                            onClick={() => {
                                                handleAddSubject(subject);

                                                if (inputRef.current) {
                                                    inputRef.current.blur();
                                                }
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 text-gray-700"
                                        >
                                            {subject}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* No results message */}
                            {showDropdown && inputValue.trim() && filteredSubjects.length === 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm z-10 p-3">
                                    <p className="text-xs text-gray-500">
                                        No matching subjects. Press Enter to add "{inputValue}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Invitation Message */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        Invitation Message
                    </label>
                    <textarea
                        value={teacherFormData.message}
                        onChange={(e) => setTeacherFormData({...teacherFormData, message: e.target.value})}
                        placeholder="Write a brief invitation message..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                    />
                </div>
            </div>
        </Modal>
    );
};

export const InviteParentModal = ({ onClose, showToast }) => {
    const inputRef = useRef(null);
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        studentIds: [''],
        message: '',
    });
    const [allStudents, setAllStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);


    useEffect(() => {
        getAllStudents().then(res => setAllStudents(res.data.students)).catch(err => console.error(err));
    }, []);


    const handleInvite = async () => {
        if (!formData.firstName || !formData.lastName || !formData.email || selectedStudents.length === 0) {
            showToast("Please fill all fields and select at least one student.", 'error');
            return;
        }
        try {
            const studentIds = selectedStudents.map(s => s.id);
            await inviteParent({ ...formData, studentIds });
            showToast("Parent invited successfully!", "success");
            onClose();
        } catch (error) {
            showToast(error.message || "Failed to invite parent.", "error");
        }
    };


    // This creates a filtered list based on what the user types
    const searchTerm = (inputValue || '').trim().toLowerCase();

    const filteredStudents = (allStudents || []).filter((student) => {
        const fullName = (student?.fullName || '').toLowerCase();
        const email = (student?.email || '').toLowerCase();
        const studentId = (student?.studentId || '').toLowerCase();

        // if searchTerm is empty you'll get all students ('' is included in every string)
        return (
            fullName.includes(searchTerm) ||
            email.includes(searchTerm) ||
            studentId.includes(searchTerm)
        );
    });


    const handleInputFocus = () => {
        setShowDropdown(true);
    };

    const handleInputBlur = () => {
        // Delay closing dropdown to allow dropdown click to register
        setTimeout(() => setShowDropdown(false), 200);
    };

    // 2. Handle Adding a Student
    const handleAddStudent = (student) => {
        const isAlreadyAdded = selectedStudents.some(s => s.id === student.id);

        if (!isAlreadyAdded) {
            setSelectedStudents([...selectedStudents, student]);
        }

        // RESET everything after selection
        setInputValue('');
        setShowDropdown(false);
        if (inputRef.current) inputRef.current.blur();
    };

    // 3. Handle Removing a Student
    const handleRemoveStudent = (studentToRemove) => {
        setSelectedStudents((prev) =>
            prev.filter((s) => s.id !== studentToRemove.id)
        );
    };

    // 4. Handle Enter Key on Input
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    };

    // Simplified student selection
    return (
        <Modal title="Invite Parent" onClose={onClose} onSubmit={handleInvite}>

            <div className="space-y-5">
                {/* Names */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        required
                    />
                    <Input
                        label="Last Name"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        required
                    />
                </div>

                <Input
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                />

                {/* Subjects */}
                <div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Children (Students)
                        </label>

                        {/* Selected Students (The "Pills") */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {selectedStudents.map((student) => (
                                <div
                                    key={student.id}
                                    className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-1 rounded-lg animate-in fade-in zoom-in duration-200"
                                >
                                                        <span className="font-medium">
                                                            {`${student.firstName} ${student.lastName}`}
                                                        </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveStudent(student)}
                                        className="hover:text-blue-900 transition-colors p-0.5 rounded-full hover:bg-blue-100"
                                        aria-label={`Remove ${student.firstName} ${student.lastName}`}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Input and Dropdown Container */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search size={16} className="text-gray-400" />
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search for a student to add..."
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    if (!showDropdown) setShowDropdown(true);
                                }}
                                onKeyDown={handleKeyDown}         // prevents default Enter behavior
                                onFocus={handleInputFocus}       // Triggers list on click
                                onBlur={handleInputBlur}        // Closes with the timeout you set earlier
                                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            />

                            {/* Dropdown List - Now shows even when empty */}
                            {showDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((student) => (
                                            <button
                                                key={student.id}
                                                type="button"
                                                // User MUST click here to add
                                                onClick={() => handleAddStudent(student)}
                                                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 transition-colors text-left border-b border-gray-50 last:border-0"
                                            >
                                                <div className="flex flex-col">
                                                                        <span className="text-gray-700 font-medium group-hover:text-blue-700">
                                                                            {student.fullName}
                                                                        </span>
                                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                                                                            {student.studentId} • {student.class}
                                                                        </span>
                                                </div>
                                                <Plus size={14} className="text-gray-300" />
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-sm text-gray-500">
                                            No matching students found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Invitation Message */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        Invitation Message
                    </label>
                    <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        placeholder="Write a brief invitation message..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                    />
                </div>
            </div>
        </Modal>
    );
};

// TODO: add the option for users to see teachers and theur subjects so they add to the student
export const CreateStudentModal = ({ onClose, showToast }) => {
    const [registryStyle, setRegistryStyle] = useState(''); // 'class' or 'grade'
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        class: '', // Holds the specific Grade or Class selected
        section: '',
        // rollNumber: '',
        dateOfBirth: '',
        gender: '',
        address: ''
    });

    const classOptions = [
        "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
        "JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"
    ];

    const gradeOptions = Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`);

    const handleCreate = async () => {
        // Strict validation for all fields
        const requiredFields = [
            'firstName', 'lastName', 'email', 'phone',
            'class',
            // 'rollNumber',
            'dateOfBirth',
            'gender', 'address'
        ];

        // Section is only mandatory if using Class Style
        if (registryStyle === 'class') requiredFields.push('section');

        const isFormIncomplete = requiredFields.some(field => !formData[field]?.trim());

        if (!registryStyle || isFormIncomplete) {
            showToast("All registry fields are mandatory.", 'error');
            return;
        }

        try {
            await createStudent({
                ...formData,
                registryStyle // Including the style used for the school's records
            });
            showToast("Student profile successfully initialized.", "success");
            onClose();
        } catch (error) {
            showToast(error.message || "Registry Error: Submission failed.", "error");
        }
    };

    return (
        <Modal title="Initialize Student Record" onClose={onClose} onSubmit={handleCreate}>
            <div className="space-y-8 py-4">

                {/* Section 1: Personal Identification */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">
                        Personal Identification
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Input
                                label="First Name"
                                type="name"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Input
                                label="Last Name"
                                type="name"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Contact & Bio-Data */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <Input
                            label="Communication Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Input
                            label="Contact Number"
                            type="email"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                </div>

                {/* Section 4: Bio Data */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <Input
                            label="Date of Birth"
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Gender</label>
                        <select
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                </div>

                {/* Section 3: Academic Placement (Dynamic Logic) */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">
                        Academic Placement
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Choose Style */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Registry Style</label>
                            <select
                                value={registryStyle}
                                onChange={(e) => {
                                    setRegistryStyle(e.target.value);
                                    setFormData({ ...formData, class: '', section: '' });
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Style</option>
                                <option value="class">Class (Primary 1 - SS3)</option>
                                <option value="grade">Grade (Grade 1 - Grade 12)</option>
                            </select>
                        </div>

                        {/* 2. Choose Level (Depends on Style) */}
                        <div className={`space-y-1.5 ${registryStyle === 'grade' ? 'col-span-1' : ''}`}>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                {registryStyle === 'grade' ? 'Level' : 'Class'}
                            </label>
                            <select
                                disabled={!registryStyle}
                                value={formData.class}
                                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Level</option>
                                {registryStyle === 'class' && classOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                {registryStyle === 'grade' && gradeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* 3. Section (Only for Class Style) */}
                        {registryStyle === 'class' && (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Section</label>
                                <input
                                    value={formData.section}
                                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. A"
                                />

                            </div>
                        )}
                    </div>
                </div>


                <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Full Residential Address</label>
                    <textarea
                        rows={2}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>
        </Modal>
    );
};

export const Modal = ({ title, onClose, onSubmit, children }) => (
    <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/30" onClick={onClose} />
            <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
                <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-full">
                    <X size={20} />
                </button>
                <h3 className="text-lg font-bold text-gray-900 mb-6">{title}</h3>
                <div className="space-y-5">{children}</div>
                <div className="flex justify-end gap-3 pt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button onClick={onSubmit} className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Submit</button>
                </div>
            </div>
        </div>
    </div>
);



export const ManageParentStudentLinkModal = ({ onClose, showToast, schoolId, parent = null }) => {
    const [parentsList, setParentsList] = useState([]);
    const [studentsList, setStudentsList] = useState([]);
    const [selectedParent, setSelectedParent] = useState(parent);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [parentSearchQuery, setParentSearchQuery] = useState('');
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [loadingParents, setLoadingParents] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        const fetchParentsAndStudents = async () => {
            try {
                setLoadingStudents(true);
                const studentsResponse = await getAllStudents();
                setStudentsList(studentsResponse.data.students || []);

                if (!parent) {
                    setLoadingParents(true);
                    const parentsResponse = await getAllParents();
                    setParentsList(parentsResponse.data.parents || []);
                }
            } catch (error) {
                console.error('Failed to fetch parents or students:', error);
                showToast('Failed to load data.', 'error');
            } finally {
                setLoadingStudents(false);
                if (!parent) setLoadingParents(false);
            }
        };
        fetchParentsAndStudents();
    }, [parent]);

    const filteredParents = parent ? [] : parentsList.filter(p =>
        p.firstName.toLowerCase().includes(parentSearchQuery.toLowerCase()) ||
        p.lastName.toLowerCase().includes(parentSearchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(parentSearchQuery.toLowerCase())
    );

    const filteredStudents = studentsList.filter(student =>
        student.fullName.toLowerCase().includes(studentSearchQuery.toLowerCase())
    );

    const handleStudentToggle = (studentId) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const handleLinkStudents = async () => {
        if (!selectedParent || selectedStudents.length === 0) {
            showToast('Please select a parent and at least one student.', 'error');
            return;
        }
        try {
            const payload = {
                parentId: selectedParent.id,
                studentIds: selectedStudents,
                schoolId: schoolId,
            }
            await linkStudentToParent(payload, payload.parentId);
            showToast('Students linked to parent successfully!', 'success');
            onClose();
        } catch (error) {
            console.error('Error linking students:', error);
            showToast(error.message || 'Failed to link students.', 'error');
        }
    };

    const handleUnlinkStudents = async () => {
        if (!selectedParent || selectedStudents.length === 0) {
            showToast('Please select a parent and at least one student.', 'error');
            return;
        }
        try {
            const payload = {
                parentId: selectedParent.id,
                studentIds: selectedStudents,
                schoolId: schoolId,
            }
            await unlinkStudentToParent(payload, payload.parentId);
            showToast('Students unlinked from parent successfully!', 'success');
            onClose();
        } catch (error) {
            console.error('Error unlinking students:', error);
            showToast(error.message || 'Failed to unlink students.', 'error');
        }
    };


    return (
        <Modal title="Manage Parent-Student Links" onClose={onClose}>
            <div className="space-y-6">
                {!parent && (
                    <div>
                        <h4 className="text-md font-semibold text-gray-800 mb-2">Select Parent</h4>
                        <Input
                            placeholder="Search parent by name or email"
                            value={parentSearchQuery}
                            onChange={(e) => setParentSearchQuery(e.target.value)}
                        />
                        <div className="mt-2 h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                            {loadingParents ? (
                                <p className="text-center text-gray-500">Loading parents...</p>
                            ) : filteredParents.length > 0 ? (
                                filteredParents.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => setSelectedParent(p)}
                                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-gray-100 ${selectedParent?.id === p.id ? 'bg-blue-100' : ''}`}
                                    >
                                        <UserCircle2 size={20} className="text-gray-500" />
                                        <span>{p.firstName} {p.lastName} ({p.email})</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500">No parents found.</p>
                            )}
                        </div>
                    </div>
                )}
                {selectedParent && (
                    <p className="mt-2 text-sm text-gray-600">Selected Parent: <span className="font-medium">{selectedParent.name}</span></p>
                )}

                <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-2">Select Students</h4>
                    <Input
                        placeholder="Search student by name or email"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                    />
                    <div className="mt-2 h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                        {loadingStudents ? (
                            <p className="text-center text-gray-500">Loading students...</p>
                        ) : filteredStudents.length > 0 ? (
                            filteredStudents.map(student => (
                                <div
                                    key={student.id}
                                    onClick={() => handleStudentToggle(student.id)}
                                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-gray-100 ${selectedStudents.includes(student.id) ? 'bg-blue-100' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedStudents.includes(student.id)}
                                        onChange={() => handleStudentToggle(student.id)}
                                        className="rounded text-blue-600"
                                    />
                                    <UserCircle2 size={20} className="text-gray-500" />
                                    <span>{student.fullName}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500">No students found.</p>
                        )}
                    </div>
                    {selectedStudents.length > 0 && (
                        <p className="mt-2 text-sm text-gray-600">Selected Students: <span className="font-medium">{selectedStudents.length}</span></p>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleLinkStudents}
                        disabled={!selectedParent || selectedStudents.length === 0}
                        className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Link Students
                    </button>
                    <button
                        type="button"
                        onClick={handleUnlinkStudents}
                        disabled={!selectedParent || selectedStudents.length === 0}
                        className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Unlink Students
                    </button>
                </div>
            </div>
        </Modal>
    );
};