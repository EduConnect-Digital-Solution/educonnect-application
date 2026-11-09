import React, { useEffect, useRef, useState } from 'react';
import { getStatusBadgeStyle } from '../../utils/styleHelpers.js';
import { UserCircle2, X, Search, Plus, Loader2 } from 'lucide-react';
import Input from './Input.jsx';
import {
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
    unlinkStudentToParent, getParentDetails,
} from '../../../../auth/authAPIs.js';
import { formatStatus, getInitials } from '../../utils/formatters.js';
import { getSchoolClasses } from '../../services/classAPIs.js';
import { getClassArms } from '../../services/armAPIs.js';
import { getSchoolSubjects } from '../../services/subjectAPIs.js';
import { ImageUploadField } from '../../../../../components/patterns';

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
    // ── teacher form fields ─────
    const [teacherFormData, setTeacherFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        message: '',
        profileImage: null,
    });

    // ── subjects sourced from the school's configured subject list ────────────
    const [schoolSubjects, setSchoolSubjects]   = useState([]);  // [{id, name, code, ...}]
    const [selectedSubjects, setSelectedSubjects] = useState([]); // [subject names]
    const [loadingSubjects, setLoadingSubjects] = useState(true);

    // ── search / dropdown state ─
    const [inputValue, setInputValue]   = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const inputRef = useRef(null);

    // ── fetch configured subjects on mount ────────────────────────────────────
    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                setLoadingSubjects(true);
                const res = await getSchoolSubjects();
                setSchoolSubjects(res.data?.subjects ?? []);
            } catch (err) {
                console.error('[InviteTeacherModal] Failed to load subjects:', err);
                showToast('Could not load school subjects.', 'error');
            } finally {
                setLoadingSubjects(false);
            }
        };
        fetchSubjects();
    }, []);

    // ── filtered dropdown options ────────
    const filteredSubjects = schoolSubjects.filter(s =>
        !selectedSubjects.includes(s.name) &&
        s.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    // ── subject selection helpers ────────
    const handleAddSubject = (subjectName) => {
        if (subjectName.trim() && !selectedSubjects.includes(subjectName)) {
            setSelectedSubjects(prev => [...prev, subjectName]);
            setInputValue('');
            setShowDropdown(false);
            inputRef.current?.focus();
        }
    };

    const handleRemoveSubject = (name) =>
        setSelectedSubjects(prev => prev.filter(s => s !== name));

    const handleKeyDown = (e) => { if (e.key === 'Enter') e.preventDefault(); };

    // ── submit ──────────────────
    const handleInviteTeacher = async () => {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!teacherFormData.firstName)  { showToast('Please input first name');                      return; }
        if (!teacherFormData.lastName)   { showToast('Please input last name');                       return; }
        if (selectedSubjects.length === 0) { showToast('Please add at least 1 subject');              return; }
        if (!teacherFormData.message)    { showToast('Please input an invitation message');           return; }
        if (!teacherFormData.email || !emailPattern.test(teacherFormData.email)) {
            showToast('Please provide a valid email address.');
            return;
        }
        const payload = {
            email:        teacherFormData.email.trim().toLowerCase(),
            firstName:    teacherFormData.firstName.trim(),
            lastName:     teacherFormData.lastName.trim(),
            subjects:     selectedSubjects,
            message:      teacherFormData.message.trim(),
            profileImage: teacherFormData.profileImage ?? null,
        };
        try {
            await inviteTeacher(payload);
            showToast('Teacher invited successfully', 'success');
            onClose();
        } catch (err) {
            showToast(err?.message || 'Registration failed', 'error');
        }
    };

    return (
        <Modal title="Invite Teacher" onClose={onClose} onSubmit={handleInviteTeacher}>
            {loadingSubjects ? (
                // ── Loading skeleton while subjects are fetched ───────────────
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 size={28} className="animate-spin text-blue-500" />
                    <p className="text-sm text-gray-400">Loading school subjects…</p>
                </div>
            ) : (
                <div className="space-y-5">
                    <ImageUploadField
                        name={`${teacherFormData.firstName} ${teacherFormData.lastName}`.trim()}
                        value={teacherFormData.profileImage}
                        onChange={(url) => setTeacherFormData({ ...teacherFormData, profileImage: url })}
                        label="Teacher photo"
                    />
                    {/* Names */}
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="First Name"
                            value={teacherFormData.firstName}
                            onChange={(e) => setTeacherFormData({ ...teacherFormData, firstName: e.target.value })}
                            placeholder="e.g. John"
                            required
                        />
                        <Input
                            label="Last Name"
                            value={teacherFormData.lastName}
                            onChange={(e) => setTeacherFormData({ ...teacherFormData, lastName: e.target.value })}
                            placeholder="e.g. Doe"
                            required
                        />
                    </div>

                    <Input
                        label="Email Address"
                        type="email"
                        value={teacherFormData.email}
                        onChange={(e) => setTeacherFormData({ ...teacherFormData, email: e.target.value })}
                        placeholder="teacher@school.com"
                    />

                    {/* Subjects — from school configuration only */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Subjects</label>

                        {/* Selected subject pills */}
                        {selectedSubjects.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {selectedSubjects.map(name => (
                                    <div key={name} className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-3 py-1 rounded-lg">
                                        <span>{name}</span>
                                        <button type="button" onClick={() => handleRemoveSubject(name)} className="hover:text-blue-900 transition-colors" aria-label={`Remove ${name}`}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {schoolSubjects.length === 0 ? (
                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                No subjects have been configured for this school yet. Please add subjects in the school configuration first.
                            </p>
                        ) : (
                            <div className="relative">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Search and select a subject…"
                                    value={inputValue}
                                    onChange={(e) => { setInputValue(e.target.value); setShowDropdown(true); }}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => setShowDropdown(true)}
                                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                                {showDropdown && filteredSubjects.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md z-10 max-h-48 overflow-y-auto">
                                        {filteredSubjects.map(s => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => { handleAddSubject(s.name); inputRef.current?.blur(); }}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 text-gray-700 flex items-center justify-between"
                                            >
                                                <span>{s.name}</span>
                                                {s.code && <span className="text-[10px] text-gray-400 uppercase">{s.code}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {showDropdown && inputValue.trim() && filteredSubjects.length === 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm z-10 p-3">
                                        <p className="text-xs text-gray-500">No matching subjects found. Only configured school subjects can be assigned.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Invitation Message */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Invitation Message</label>
                        <textarea
                            value={teacherFormData.message}
                            onChange={(e) => setTeacherFormData({ ...teacherFormData, message: e.target.value })}
                            placeholder="Write a brief invitation message..."
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                        />
                    </div>
                </div>
            )}
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
        profileImage: null,
    });
    const [allStudents, setAllStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);


    useEffect(() => {
        getAllStudents().then(res => setAllStudents(res.data.students)).catch(err => console.error(err));
    }, []);


    const handleInvite = async () => {
        if (!formData.firstName || !formData.lastName || !formData.email || selectedStudents.length === 0 || !formData.message) {
            showToast("Please fill all fields and select at least one student.", 'error');
            return;
        }
        try {
            const studentIds = selectedStudents.map(s => s.id);
            await inviteParent({ ...formData, studentIds, profileImage: formData.profileImage ?? null });
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
                <ImageUploadField
                    name={`${formData.firstName} ${formData.lastName}`.trim()}
                    value={formData.profileImage}
                    onChange={(url) => setFormData({ ...formData, profileImage: url })}
                    label="Parent photo"
                />
                {/* Names */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="First Name"
                        needed={true}
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        required
                    />
                    <Input
                        needed={true}
                        label="Last Name"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        required
                    />
                </div>

                <Input
                    label="Email Address"
                    needed={true}
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                />

                {/* Subjects */}
                <div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Children (Students)<span className="text-red-500">*</span>
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
                        Invitation Message<span className="text-red-500">*</span>
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

export const CreateStudentModal = ({ onClose, showToast }) => {
    // ── form fields ─────────────
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        class: '',       // classId of the selected class
        className: '',   // display name kept for payload
        armId: '',       // selected arm/section id
        armName: '',     // arm name for display
        dateOfBirth: '',
        gender: '',
        address: '',
        profileImage: null,
    });

    // ── backend data ────────────
    const [classes, setClasses]     = useState([]);  // [{id, name}]
    const [arms, setArms]           = useState([]);  // [{id, name, classId}]
    const [loadingInit, setLoadingInit] = useState(true); // initial classes fetch
    const [loadingArms, setLoadingArms] = useState(false); // arms fetch per class

    // ── fetch classes on mount ──
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                setLoadingInit(true);
                const res = await getSchoolClasses();
                setClasses(res.data?.classes ?? []);
            } catch (err) {
                console.error('[CreateStudentModal] Failed to load classes:', err);
                showToast('Could not load school classes.', 'error');
            } finally {
                setLoadingInit(false);
            }
        };
        fetchClasses();
    }, []);

    // ── fetch arms when a class is selected ───────────────────────────────────
    const handleClassChange = async (classId) => {
        const cls = classes.find(c => c.id === classId);
        setFormData(prev => ({ ...prev, class: classId, className: cls?.name ?? '', armId: '', armName: '' }));
        setArms([]);
        if (!classId) return;
        try {
            setLoadingArms(true);
            const res = await getClassArms(classId);
            setArms(res.data?.arms ?? []);
        } catch (err) {
            console.error('[CreateStudentModal] Failed to load arms:', err);
            showToast('Could not load class arms.', 'error');
        } finally {
            setLoadingArms(false);
        }
    };

    // ── submit ──────────────────
    const handleCreate = async () => {
        const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'class', 'dateOfBirth', 'gender', 'address'];
        // Arm (section) is required only when the class has configured arms
        if (arms.length > 0) requiredFields.push('armId');

        const isFormIncomplete = requiredFields.some(field => !formData[field]?.trim());
        if (isFormIncomplete) {
            showToast('All fields are required.', 'error');
            return;
        }
        try {
            // Build payload using backend-expected keys. The backend requires classId and armId
            // (or null) rather than repeating display names. Only include the selected ids;
            // if none selected, send null values as requested.
            const payload = {
                firstName:   (formData.firstName || '').trim(),
                lastName:    (formData.lastName || '').trim(),
                email:       (formData.email || '').trim(),
                phone:       (formData.phone || '').trim(),
                classId:     formData.class ? formData.class : null,
                armId:       formData.armId ? formData.armId : null,
                dateOfBirth: formData.dateOfBirth,
                gender:      formData.gender,
                address:     (formData.address || '').trim(),
                profileImage: formData.profileImage ?? null,
            };

            await createStudent(payload);
            showToast('Student profile successfully initialized.', 'success');
            onClose();
        } catch (error) {
            showToast(error.message || 'Registry Error: Submission failed.', 'error');
        }
    };

    return (
        <Modal title="Initialize Student Record" onClose={onClose} onSubmit={handleCreate}>
            {loadingInit ? (
                // ── Loading skeleton while classes are fetched ───────────────
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 size={28} className="animate-spin text-blue-500" />
                    <p className="text-sm text-gray-400">Loading school configuration…</p>
                </div>
            ) : (
                <div className="space-y-8 py-4">

                    {/* Section 1: Personal Identification */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">
                            Personal Identification
                        </h3>
                        <ImageUploadField
                            name={`${formData.firstName} ${formData.lastName}`.trim()}
                            value={formData.profileImage}
                            onChange={(url) => setFormData({ ...formData, profileImage: url })}
                            label="Student photo"
                        />
                        <div className="grid grid-cols-2 gap-6">
                            <Input label="First Name" type="text" value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                            <Input label="Last Name" type="text" value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                        </div>
                    </div>

                    {/* Section 2: Contact */}
                    <div className="grid grid-cols-2 gap-6">
                        <Input label="Communication Email" type="email" value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                        <Input label="Contact Number" type="tel" value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>

                    {/* Section 3: Bio Data */}
                    <div className="grid grid-cols-2 gap-6">
                        <Input label="Date of Birth" type="date" value={formData.dateOfBirth}
                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                        <div className="space-y-1.5">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Gender</label>
                            <select value={formData.gender}
                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Select Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                    </div>

                    {/* Section 4: Academic Placement — classes & arms from backend */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">
                            Academic Placement
                        </h3>

                        {classes.length === 0 ? (
                            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                No classes have been configured for this school yet. Please set them up in the school configuration first.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Class selector */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Class</label>
                                    <select
                                        value={formData.class}
                                        onChange={(e) => handleClassChange(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select class…</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                {/* Arm selector — appears once a class is chosen */}
                                {formData.class && (
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">
                                            Arm / Section
                                            {loadingArms && <Loader2 size={12} className="inline ml-2 animate-spin text-blue-400" />}
                                        </label>
                                        {loadingArms ? (
                                            <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400">Loading arms…</div>
                                        ) : arms.length === 0 ? (
                                            <div className="w-full px-3 py-2 text-sm border border-dashed border-gray-200 rounded-lg text-gray-400 italic">
                                                No arms configured for this class
                                            </div>
                                        ) : (
                                            <select
                                                value={formData.armId}
                                                onChange={(e) => {
                                                    const arm = arms.find(a => a.id === e.target.value);
                                                    setFormData(prev => ({ ...prev, armId: e.target.value, armName: arm?.name ?? '' }));
                                                }}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">Select arm…</option>
                                                {arms.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Full Residential Address</label>
                        <textarea rows={2} value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
            )}
        </Modal>
    );
};

export const Modal = ({ title, onClose, onSubmit, children, submitText = 'Submit', submitDisabled = false, hideSubmit = false, cancelText = 'Cancel' }) => (
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
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">{cancelText}</button>
                    {!hideSubmit && (
                        <button onClick={onSubmit} disabled={submitDisabled} className={`px-4 py-2 text-sm rounded-lg ${submitDisabled ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>{submitText}</button>
                    )}
                </div>
            </div>
        </div>
    </div>
);



export const ManageParentStudentLinkModal = ({ onClose, showToast, schoolId, parent = null }) => {
    const [parentsList, setParentsList] = useState([]);
    const [studentsList, setStudentsList] = useState([]);
    const [linkedStudentsList, setLinkedStudentsList] = useState([]);
    const [hasLinkedStudents, setHasLinkedStudents] = useState(false);
    const [selectedParent, setSelectedParent] = useState(parent);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [parentSearchQuery, setParentSearchQuery] = useState('');
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [loadingParents, setLoadingParents] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        const fetchParentsAndStudents = async () => {
            try {
                if (selectedParent) {
                    setLoadingStudents(true);
                    const details = await getParentDetails(selectedParent.id);
                    const children = details?.data?.parent?.children || [];
                    setLinkedStudentsList(children);
                    
                    if (children.length > 0) {
                        setHasLinkedStudents(true);
                    } else {
                        setHasLinkedStudents(false);
                        const studentsResponse = await getAllStudents();
                        setStudentsList(studentsResponse.data.students || []);
                    }
                } else {
                    setLoadingParents(true);
                    const parentsResponse = await getAllParents();
                    setParentsList(parentsResponse.data.parents || []);
                    setLoadingParents(false);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
                showToast('Failed to load data.', 'error');
            } finally {
                setLoadingStudents(false);
            }
        };
        fetchParentsAndStudents();
    }, [selectedParent]);

    const filteredParents = parent ? [] : parentsList.filter(p =>
        p.firstName.toLowerCase().includes(parentSearchQuery.toLowerCase()) ||
        p.lastName.toLowerCase().includes(parentSearchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(parentSearchQuery.toLowerCase())
    );

    const filteredStudents = studentsList.filter(student =>
        student.fullName?.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
        student.firstName?.toLowerCase().includes(studentSearchQuery.toLowerCase())
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
                    <p className="mt-2 text-sm text-gray-600">Selected Parent: <span className="font-medium">{selectedParent.name || `${selectedParent.firstName} ${selectedParent.lastName}`}</span></p>
                )}

                {selectedParent && (
                    <div>
                        <h4 className="text-md font-semibold text-gray-800 mb-2">
                            {hasLinkedStudents ? 'Linked Students' : 'Select Students to Link'}
                        </h4>
                        
                        {!hasLinkedStudents && (
                            <Input
                                placeholder="Search student by name or email"
                                value={studentSearchQuery}
                                onChange={(e) => setStudentSearchQuery(e.target.value)}
                            />
                        )}
                        
                        <div className="mt-2 h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                            {loadingStudents ? (
                                <p className="text-center text-gray-500">Loading students...</p>
                            ) : hasLinkedStudents ? (
                                linkedStudentsList.length > 0 ? (
                                    linkedStudentsList.map(student => (
                                        <div
                                            key={student.id}
                                            onClick={() => handleStudentToggle(student.id)}
                                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-gray-100 ${selectedStudents.includes(student.id) ? 'bg-red-50 text-red-700' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedStudents.includes(student.id)}
                                                onChange={() => handleStudentToggle(student.id)}
                                                className="rounded text-red-600"
                                            />
                                            <UserCircle2 size={20} className="text-gray-500" />
                                            <span>{student.fullName || `${student.firstName} ${student.lastName}`}</span>
                                        </div>
                                    ))
                                ) : null
                            ) : (
                                filteredStudents.length > 0 ? (
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
                                            <span>{student.fullName || `${student.firstName} ${student.lastName}`}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500">No students found.</p>
                                )
                            )}
                        </div>
                        {selectedStudents.length > 0 && (
                            <p className="mt-2 text-sm text-gray-600">Selected Students: <span className="font-medium">{selectedStudents.length}</span></p>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    {!hasLinkedStudents ? (
                        <button
                            type="button"
                            onClick={handleLinkStudents}
                            disabled={!selectedParent || selectedStudents.length === 0}
                            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Link Students
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleUnlinkStudents}
                            disabled={!selectedParent || selectedStudents.length === 0}
                            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Unlink Students
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export const ParentInfoModal = ({ onClose, parentInfo }) => {
    if (!parentInfo) return null;

    return (
        <Modal title="Parent Information" onClose={onClose} hideSubmit={true} cancelText="Close">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Personal Details</h4>
                        <div className="space-y-2">
                            <p className="text-sm"><span className="text-gray-500 inline-block w-24">Full Name:</span> <span className="font-medium text-gray-900">{parentInfo.fullName}</span></p>
                            <p className="text-sm"><span className="text-gray-500 inline-block w-24">Email:</span> <span className="font-medium text-gray-900">{parentInfo.email}</span></p>
                            <p className="text-sm"><span className="text-gray-500 inline-block w-24">Phone:</span> <span className="font-medium text-gray-900">{parentInfo.phone || 'N/A'}</span></p>
                            <p className="text-sm"><span className="text-gray-500 inline-block w-24">Address:</span> <span className="font-medium text-gray-900">{parentInfo.address || 'N/A'}</span></p>
                            <p className="text-sm"><span className="text-gray-500 inline-block w-24">Occupation:</span> <span className="font-medium text-gray-900">{parentInfo.occupation || 'N/A'}</span></p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Account Status</h4>
                        <div className="space-y-2">
                            <p className="text-sm flex items-center"><span className="text-gray-500 inline-block w-24">Status:</span> 
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${parentInfo.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                    {parentInfo.statusDisplay}
                                </span>
                            </p>
                            <p className="text-sm"><span className="text-gray-500 inline-block w-24">Verified:</span> <span className="font-medium text-gray-900">{parentInfo.isVerified ? 'Yes' : 'No'}</span></p>
                            <p className="text-sm"><span className="text-gray-500 inline-block w-24">Created At:</span> <span className="font-medium text-gray-900">{new Date(parentInfo.createdAt).toLocaleDateString()}</span></p>
                            <p className="text-sm"><span className="text-gray-500 inline-block w-24">Invited By:</span> <span className="font-medium text-gray-900">{parentInfo.invitedBy?.name || 'N/A'}</span></p>
                        </div>
                    </div>
                </div>

                {(parentInfo.emergencyContact || parentInfo.emergencyPhone) && (
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Emergency Contact</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <p className="text-sm"><span className="text-gray-500 inline-block w-24">Name:</span> <span className="font-medium text-gray-900">{parentInfo.emergencyContact || 'N/A'}</span></p>
                            <p className="text-sm"><span className="text-gray-500 inline-block w-24">Phone:</span> <span className="font-medium text-gray-900">{parentInfo.emergencyPhone || 'N/A'}</span></p>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Linked Children ({parentInfo.childrenCount || 0})</h4>
                    {parentInfo.children && parentInfo.children.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {parentInfo.children.map((child, index) => (
                                <div key={child.id || index} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5 transition-all hover:shadow-sm">
                                    <p className="font-semibold text-gray-900 flex justify-between items-start">
                                        <span>{child.fullName}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${child.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {child.statusDisplay}
                                        </span>
                                    </p>
                                    <p className="text-gray-600 text-xs font-medium">{child.classDisplay || 'No class assigned'}</p>
                                    {child.gender && <p className="text-gray-500 text-xs capitalize">{child.gender}</p>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">No children linked to this parent.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};