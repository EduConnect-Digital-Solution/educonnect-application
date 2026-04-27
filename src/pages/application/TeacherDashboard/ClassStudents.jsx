import React, {Fragment, useState, useEffect, useCallback} from 'react';
import {useParams} from 'react-router-dom';
import { Search, X, Plus, Edit } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import StudentAnalytics from './StudentAnalytics.jsx';
import {Pagination} from "./teacherUtils/teacherComponents.jsx";
import TeacherLayout from "./components/layout/TeacherLayout.jsx";
import {
    assignGrade,
    getStudentsByClassandSubject,
    getTeacherDashboard,
    publishGrade,
    updateGrade,
    viewGrade
} from "../../auth/authAPIs.js";
import {Toast} from "../AdminDashboard/components/ui/Toast.jsx";
import {useAuth} from "../../../contexts/AuthContext.jsx";
// import {getTeacherDashboard} from '../services/teacherService.jsx';

const ClassStudents = () => {
    const { class: studentClass, subject } = useParams();
    const { user } = useAuth();

    const [teacherSubjects, setTeacherSubjects] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(true);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                setLoadingSubjects(true);
                const dashboardRes = await getTeacherDashboard();
                setTeacherSubjects(dashboardRes.data.teacher.subjects);
            } catch (err) {
                console.error('Failed to fetch subjects:', err);
            } finally {
                setLoadingSubjects(false);
            }
        };

        fetchSubjects();
    }, []);

    // useGradedState logic
    const [gradedStudents, setGradedStudents] = useState({});

    const getStorageKey = (userId, studentClass, subject) => {
        if (!userId || !studentClass || !subject) return null;
        return `graded_status_${userId}_${studentClass}_${subject}`;
    };

    const storageKey = getStorageKey(user?.id, studentClass, subject);

    useEffect(() => {
        if (storageKey) {
            const storedGradedStatus = localStorage.getItem(storageKey);
            if (storedGradedStatus) {
                setGradedStudents(JSON.parse(storedGradedStatus));
            } else {
                setGradedStudents({});
            }
        }
    }, [storageKey]);

    const updateGradedStatus = useCallback((studentId, status = true) => {
        const newGradedStudents = { ...gradedStudents, [studentId]: status };
        setGradedStudents(newGradedStudents);
        if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(newGradedStudents));
        }
    }, [gradedStudents, storageKey]);

    const clearGradedStatus = useCallback(() => {
        setGradedStudents({});
        if (storageKey) {
            localStorage.removeItem(storageKey);
        }
    }, [storageKey]);

    const isStudentGraded = (studentId) => {
        return gradedStudents[studentId] === true;
    };

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [toUpdate, setToUpdate] = useState(null);
    const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);
    const [selectedStudentForGrade, setSelectedStudentForGrade] = useState(null);
    const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [gradeData, setGradeData] = useState(null);
    const [publishData, setPublishData] = useState({ term: 'First Term', academicYear: '2026-2027' });
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const itemsPerPage = 8;
    const [toast, setToast] = useState({show: false, message: '', type: 'error'});
    const [studentGradeDetails, setStudentGradeDetails] = useState(null);
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);
    const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
    const [isGradeListModalOpen, setIsGradeListModalOpen] = useState(false);
    const [selectedStudentForGradeList, setSelectedStudentForGradeList] = useState(null);


    const showToast = (message, type = 'error') => {
        setToast({show: true, message, type});
    };
    
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getStudentsByClassandSubject(studentClass, subject);
            setStudents(response.data.students);
            setStats(response.data.statistics);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [studentClass, subject]);

    const handleSubmitGrade = async () => {
        try {
            // 1. Basic Information Validation
            if (!gradeData.subject || !gradeData.term || !gradeData.academicYear) {
                return showToast("Please complete all header fields (Subject, Term, and Year).");
            }

            // 2. Assessment List Validation
            if (gradeData.assessments.length === 0) {
                return showToast("Please add at least one assessment.");
            }

            // 3. Detailed Assessment Validation (Looping through entries)
            for (let i = 0; i < gradeData.assessments.length; i++) {
                const entry = gradeData.assessments[i];
                const assessmentNum = i + 1;

                if (!entry.title.trim()) {
                    return showToast(`Assessment #${assessmentNum}: Title is required.`);
                }

                if (isNaN(entry.score) || entry.score < 0) {
                    return showToast(`Assessment #${assessmentNum}: Please enter a valid score.`);
                }

                if (entry.score > entry.maxScore) {
                    return showToast(`Assessment #${assessmentNum}: Score (${entry.score}) cannot exceed Max Score (${entry.maxScore}).`);
                }

                if (!entry.date) {
                    return showToast(`Assessment #${assessmentNum}: Please select a date.`);
                }
            }

            const isUpdating = !!gradeData.id;

            // 4. Submission
            if (isUpdating) {
                const payload = {
                    studentId: gradeData.studentId,
                    subject: gradeData.subject,
                    class: gradeData.class,
                    section: gradeData.section,
                    term: gradeData.term,
                    academicYear: gradeData.academicYear,
                    assessments: gradeData.assessments.map(({ type, title, score, maxScore, weight, date, remarks }) => ({
                        type,
                        title,
                        score,
                        maxScore,
                        weight,
                        date,
                        remarks,
                    })),
                    remarks: gradeData.remarks,
                };
                await updateGrade(payload, gradeData.id);
            } else {
                await assignGrade({ ...gradeData });
            }

            // 5. Success Handling
            showToast(`Grades ${isUpdating ? 'updated' : 'assigned'} successfully to ${selectedStudentForGrade.fullName}`, 'success');
            updateGradedStatus(selectedStudentForGrade.id);
            await fetchStudents();
            setIsGradeModalOpen(false);

        } catch (error) {
            console.error("Grade Submission Error:", error);
            showToast(error.message || "Failed to submit grades. Please try again.");
        }
    };
    
    const handlePublishGrades = async () => {
        try {
            const payload = {
                class: studentClass,
                subject: subject,
                term: publishData.term,
                academicYear: publishData.academicYear
            };
            await publishGrade(payload);
            showToast('Grades published successfully!', 'success');
            clearGradedStatus();
            await fetchStudents();
            setIsPublishModalOpen(false);
        } catch (error) {
            console.error('Publish Error:', error);
            showToast(error.message || 'Failed to publish grades. Please try again.');
        }
    };



    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const handleAssignGrade = (student) => {
        const [stClass, section] = student.class.split('-');
        setSelectedStudentForGrade(student);
        setGradeData({
            studentId: student.id,
            subject: subject,
            class: stClass,
            section: section ? section.toUpperCase() : '',
            term: "First Term",
            academicYear: "2026-2027",
            assessments: [{ type: "Test", title: "", score: 0, maxScore: 100, weight: 1, date: new Date().toISOString().split('T')[0], remarks: "" }],
            remarks: ""
        });
        setIsGradeModalOpen(true);
    };

    const handleViewGradeDetails = async (studentId) => {
        setIsFetchingDetails(true);
        setIsViewDetailsModalOpen(true);
        try {
            const response = await viewGrade(studentId);
            setStudentGradeDetails(response.data);
        } catch (error) {
            showToast(error.message || "Failed to fetch student grades.");
            setIsViewDetailsModalOpen(false);
        } finally {
            setIsFetchingDetails(false);
        }
    };
    
    const handleOpenGradeList = async (student) => {
        setSelectedStudentForGradeList(student);
        setIsFetchingDetails(true);
        setIsGradeListModalOpen(true);
        try {
            const response = await viewGrade(student.id);
            setStudentGradeDetails(response.data);
        } catch (error) {
            showToast(error.message || "Failed to fetch student grades.");
            setIsGradeListModalOpen(false);
        } finally {
            setIsFetchingDetails(false);
        }
    };

    const handleEditGrade = (grade) => {
        setIsGradeListModalOpen(false);
        const [stClass, section] = selectedStudentForGradeList.class.split('-');
        setGradeData({
            ...grade, // pre-fill with all grade data
            studentId: selectedStudentForGradeList.id,
            class: stClass,
            section: section ? section.toUpperCase() : '',
        });
        setSelectedStudentForGrade(selectedStudentForGradeList);
        setToUpdate(true);
        setIsGradeModalOpen(true);
    };

    const handleAddNewGrade = () => {
        setIsGradeListModalOpen(false);
        handleAssignGrade(selectedStudentForGradeList);
    }

    const filteredStudents = students.filter(student =>
        student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentStudents = filteredStudents.slice(startIndex, endIndex);

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const handleBackFromDetails = () => {
        setSelectedStudentForDetails(null);
    };

    // Handle page changes
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
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


    if (selectedStudentForDetails) {
        return <StudentAnalytics student={selectedStudentForDetails} onBack={handleBackFromDetails} />;
    }

    if (loading) {
        return (
            <TeacherLayout>
                <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-gray-500 font-medium animate-pulse">Fetching students...</p>
                </div>
            </TeacherLayout>
        );
    }
    
    if (error) {
        return (
            <TeacherLayout>
                <div className="flex flex-col items-center justify-center h-screen bg-red-50 text-red-700">
                    <p className="text-lg">Error loading students: {error.message}</p>
                </div>
            </TeacherLayout>
        );
    }

    return (
        <TeacherLayout>
            {toast.show && (<Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({...toast, show: false})}
            />)}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
                <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-100 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Students in {studentClass} - {subject}</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Showing {startIndex + 1}-{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search students..."
                                value={searchQuery}
                                onChange={handleSearch}
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>
                        <button
                            onClick={() => setIsPublishModalOpen(true)}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        >
                            Publish Grades
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 sticky top-0">
                        <tr>
                            {['S/N', 'Student Id', 'Student Name', 'Class', 'Section', 'Grade', 'Actions'].map((header) => (
                                <th key={header} className="p-4 text-sm font-semibold text-gray-600 whitespace-nowrap">
                                    {header}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {currentStudents.length > 0 ? (
                            currentStudents.map((student, index) => (
                                <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 text-sm text-gray-600">{startIndex + index + 1}.</td>
                                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">{student.studentId}</td>

                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-gray-800 whitespace-nowrap">{student.fullName}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">{student.class}</td>
                                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">{student.section}</td>
                                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                                        {isStudentGraded(student.id) || student.hasGrade
                                            ? (student.grade?.letterGrade || student.grade?.totalScore || 'Graded')
                                            : 'Not Graded!'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                             {isStudentGraded(student.id) || student.hasGrade ? (
                                                <button
                                                    onClick={() => handleOpenGradeList(student)}
                                                    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                >
                                                    Update Grade
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleAssignGrade(student)}
                                                    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                >
                                                    Assign Grade
                                                </button>
                                            )}

                                            {(isStudentGraded(student.id) || student.hasGrade) && (
                                                <button
                                                    onClick={() => handleViewGradeDetails(student.id)}
                                                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                                >
                                                    View Details
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="p-8 text-center text-gray-500">
                                    No students found for this class and subject.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>

                <Pagination currentPage={currentPage} totalPages={totalPages} getPageNumbers={getPageNumbers}/>
            </div>

            <Transition appear show={isPublishModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsPublishModalOpen(false)}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-slate-900/40" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-6 text-center">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-10 text-left align-middle shadow-2xl border border-slate-200 transition-all relative">
                                    <div className="mb-8">
                                        <Dialog.Title as="h3" className="text-lg font-bold text-slate-900 tracking-tight leading-6">
                                            Publish Grades
                                        </Dialog.Title>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            {studentClass} — {subject}
                                        </p>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="space-y-2.5">
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Target Term</label>
                                            <select
                                                value={publishData.term}
                                                onChange={(e) => setPublishData({...publishData, term: e.target.value})}
                                                className="block w-full rounded-lg border border-slate-200 py-3 px-3.5 text-sm font-medium text-slate-700 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all"
                                            >
                                                <option>First Term</option>
                                                <option>Second Term</option>
                                                <option>Third Term</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2.5">
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Academic Year</label>
                                            <input
                                                type="text"
                                                value='2026-2027'
                                                disabled
                                                onChange={(e) => setPublishData({...publishData, academicYear: e.target.value})}
                                                className="block w-full rounded-lg py-3 text-sm font-medium text-slate-700 "
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-10 flex flex-col gap-3">
                                        <button 
                                            type="button" 
                                            className="w-full py-3.5 bg-slate-900 text-white rounded-lg text-[11px] font-bold uppercase tracking-[0.2em] shadow-sm hover:bg-slate-800 transition-all active:scale-[0.98]"
                                            onClick={handlePublishGrades}
                                        >
                                            Publish to Portal
                                        </button>
                                        <button type="button" className="w-full py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors" onClick={() => setIsPublishModalOpen(false)}>
                                            Cancel
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <Transition appear show={isGradeModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsGradeModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-6 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-3xl bg-white p-10 text-left align-middle shadow-xl transition-all relative">
                                    <button
                                        onClick={() => setIsGradeModalOpen(false)}
                                        className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors focus:outline-none"
                                    >
                                        <X size={20} />
                                    </button>

                                    {selectedStudentForGrade && gradeData && (
                                        <div className="space-y-10">
                                            {/* Header Section */}
                                            <div>
                                                <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 tracking-tight">
                                                    {gradeData.id ? 'Update Grade for' : 'Assign Grade to'} {selectedStudentForGrade.fullName}
                                                </Dialog.Title>
                                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                                    Class Registry: {selectedStudentForGrade.class}
                                                </p>
                                            </div>

                                            <div className="space-y-8">
                                                {/* Primary Info Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="space-y-2.5">
                                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Subject</label>
                                                        <input
                                                            type="text"
                                                            disabled
                                                            value={gradeData.subject}
                                                            onChange={(e) => setGradeData({...gradeData, academicYear: e.target.value})}
                                                            className="block w-full py-2.5 text-sm transition-all"
                                                        />
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Term</label>
                                                        <select
                                                            value={gradeData.term}
                                                            onChange={(e) => setGradeData({...gradeData, term: e.target.value})}
                                                            className="block w-full rounded-lg border border-gray-200 py-2.5 px-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                        >
                                                            <option>First Term</option>
                                                            <option>Second Term</option>
                                                            <option>Third Term</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2.5">
                                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Academic Year</label>
                                                        <input
                                                            type="text"
                                                            disabled
                                                            value='2026-2027'
                                                            onChange={(e) => setGradeData({...gradeData, academicYear: e.target.value})}
                                                            className="block w-full py-2.5 text-sm transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Assessments Section */}
                                                <div className="space-y-5">
                                                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                                                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Assessments</h4>
                                                        <button
                                                            onClick={() => {
                                                                const newAssessment = {
                                                                    type: "Test",
                                                                    title: "",
                                                                    score: 0,
                                                                    maxScore: 100,
                                                                    weight: 1,
                                                                    date: new Date().toISOString().split('T')[0],
                                                                    remarks: ""
                                                                };
                                                                setGradeData({...gradeData, assessments: [...gradeData.assessments, newAssessment]});
                                                            }}
                                                            className="px-4 py-2 text-[11px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                        >
                                                            Add Assessment
                                                        </button>
                                                    </div>

                                                    <div className="space-y-5">
                                                        {gradeData.assessments.map((assessment, index) => (
                                                            <div key={index} className="p-6 border border-gray-200 rounded-xl bg-gray-50/50 space-y-5">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                                                    <div className="space-y-2.5">
                                                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Type</label>
                                                                        <select
                                                                            value={assessment.type}
                                                                            onChange={(e) => {
                                                                                const newAssessments = [...gradeData.assessments];
                                                                                newAssessments[index].type = e.target.value;
                                                                                setGradeData({...gradeData, assessments: newAssessments});
                                                                            }}
                                             
                                                                            className="block w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                                        >
                                                                            <option>Test</option>
                                                                            <option>Assignment</option>
                                                                            <option>Homework</option>
                                                                            <option>Exam</option>
                                                                            <option>Quiz</option>
                                                                            <option>Project</option>
                                                                            <option>Practical</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="space-y-2.5 lg:col-span-2">
                                                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Title</label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Mid-term Mathematics Test"
                                                                            value={assessment.title}
                                                                            onChange={(e) => {
                                                                                const newAssessments = [...gradeData.assessments];
                                                                                newAssessments[index].title = e.target.value;
                                                                                setGradeData({...gradeData, assessments: newAssessments});
                                                                            }}
                                                                            className="block w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2.5">
                                                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Score</label>
                                                                        <input
                                                                            type="number"
                                                                            value={assessment.score}
                                                                            onChange={(e) => {
                                                                                const newAssessments = [...gradeData.assessments];
                                                                                newAssessments[index].score = parseInt(e.target.value);
                                                                                setGradeData({...gradeData, assessments: newAssessments});
                                                                            }}
                                                                            className="block w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2.5">
                                                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Max Score</label>
                                                                        <input
                                                                            type="number"
                                                                            value={assessment.maxScore}
                                                                            onChange={(e) => {
                                                                                const newAssessments = [...gradeData.assessments];
                                                                                newAssessments[index].maxScore = parseInt(e.target.value);
                                                                                setGradeData({...gradeData, assessments: newAssessments});
                                                                            }}
                                                                            className="block w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2.5">
                                                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Weight</label>
                                                                        <input
                                                                            type="number"
                                                                            value={assessment.weight}
                                                                            onChange={(e) => {
                                                                                const newAssessments = [...gradeData.assessments];
                                                                                newAssessments[index].weight = parseInt(e.target.value);
                                                                                setGradeData({...gradeData, assessments: newAssessments});
                                                                            }}
                                                                            className="block w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2.5">
                                                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</label>
                                                                        <input
                                                                            type="date"
                                                                            value={assessment.date}
                                                                            onChange={(e) => {
                                                                                const newAssessments = [...gradeData.assessments];
                                                                                newAssessments[index].date = e.target.value;
                                                                                setGradeData({...gradeData, assessments: newAssessments});
                                                                            }}
                                                                            className="block w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                                        />
                                                                    </div>
                                                                    <div className="lg:col-span-2 space-y-2.5">
                                                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Remarks</label>
                                                                        <textarea
                                                                            rows={1}
                                                                            placeholder="Good performance in algebra"
                                                                            value={assessment.remarks}
                                                                            onChange={(e) => {
                                                                                const newAssessments = [...gradeData.assessments];
                                                                                newAssessments[index].remarks = e.target.value;
                                                                                setGradeData({...gradeData, assessments: newAssessments});
                                                                            }}
                                                                            className="block w-full rounded-lg border border-gray-200 py-2 px-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-end pt-3 border-t border-gray-100">
                                                                    <button
                                                                        onClick={() => {
                                                                            const newAssessments = gradeData.assessments.filter((_, i) => i !== index);
                                                                            setGradeData({...gradeData, assessments: newAssessments});
                                                                        }}
                                                                        className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors"
                                                                    >
                                                                        Remove Assessment
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Overall Remarks */}
                                                <div className="space-y-2.5">
                                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">Final Executive Summary</label>
                                                    <textarea
                                                        rows={3}
                                                        placeholder="Overall good performance. Needs improvement in geometry."
                                                        value={gradeData.remarks}
                                                        onChange={(e) => setGradeData({...gradeData, remarks: e.target.value})}
                                                        className="block w-full rounded-lg border border-gray-200 py-3 px-3.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                    />
                                                </div>

                                                {/* Footer Actions */}
                                                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                                    <button
                                                        onClick={() => setIsGradeModalOpen(false)}
                                                        className="px-6 py-2.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleSubmitGrade}
                                                        className="px-8 py-2.5 bg-slate-900 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest shadow-sm hover:bg-slate-800 transition-all"
                                                    >
                                                        Finalize & Submit
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
            
            <Transition appear show={isGradeListModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsGradeListModalOpen(false)}>
                    {/* ... (dialog setup) */}
                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-6 text-center">
                            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white p-10 text-left align-middle shadow-xl transition-all relative">
                                    <button onClick={() => setIsGradeListModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors focus:outline-none">
                                        <X size={20} />
                                    </button>
                                    
                                    <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 tracking-tight">
                                        Update Grades for {selectedStudentForGradeList?.fullName}
                                    </Dialog.Title>
                                    <p className="text-sm text-gray-500 mt-1">Subject: {subject}</p>

                                    <div className="mt-6 flex justify-end">
                                        <button onClick={handleAddNewGrade} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                                            <Plus size={16} />
                                            Add New Grade
                                        </button>
                                    </div>
                                    
                                    <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
                                        {isFetchingDetails ? (
                                            <div className="flex justify-center items-center h-40">
                                                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                                            </div>
                                        ) : studentGradeDetails?.gradesBySubject?.[subject] && studentGradeDetails.gradesBySubject[subject].length > 0 ? (
                                            studentGradeDetails.gradesBySubject[subject].map((grade) => (
                                                <div key={grade.id} className="p-4 border rounded-lg flex justify-between items-center bg-gray-50">
                                                    <div>
                                                        <p className="font-semibold">{grade.term} - {grade.academicYear}</p>
                                                        <p className="text-sm text-gray-600">Grade: {grade.letterGrade} ({grade.percentage}%)</p>
                                                    </div>
                                                    <button onClick={() => handleEditGrade(grade)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-gray-700 hover:bg-gray-800 rounded-lg transition-colors">
                                                        <Edit size={12} />
                                                        Edit
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 px-6 border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50">

                                                {/* Content Section */}
                                                <div className="text-center max-w-sm">
                                                    <p className="text-xs font-medium text-slate-500 leading-relaxed tracking-wide">
                                                        No grade records were found for this subject.
                                                    </p>
                                                </div>

                                                {/* Guidance Section */}
                                                <div className="mt-8 pt-6 border-t border-slate-200/60 text-center">
                                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-sm">
                                                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                                                        <span className="text-[11px] font-bold text-slate-700 tracking-tight">
                                                            Publish assigned grades to synchronize view
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                     <div className="flex justify-end pt-4">
                                                <button
                                                    onClick={() => setIsGradeListModalOpen(false)}
                                                    className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <Transition appear show={isViewDetailsModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsViewDetailsModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-6 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-3xl bg-white p-10 text-left align-middle shadow-xl transition-all relative">
                                    <button
                                        onClick={() => setIsViewDetailsModalOpen(false)}
                                        className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors focus:outline-none"
                                    >
                                        <X size={20} />
                                    </button>

                                    {isFetchingDetails ? (
                                        <div className="flex justify-center items-center h-96">
                                            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
                                        </div>
                                    ) : studentGradeDetails ? (
                                        <div className="space-y-8">
                                            <div>
                                                {/*<p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-2">*/}
                                                    <div className="inline-flex items-center gap-2 py-2">
                                                        <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                                                        <span className="text-[11px] font-bold text-slate-700 tracking-tight">
                                                            Publish assigned grades to synchronize view
                                                        </span>
                                                    </div>
                                                {/*</p>*/}
                                                <Dialog.Title as="h3" className="text-2xl font-black text-gray-900 tracking-tight">
                                                    {studentGradeDetails.student.fullName}
                                                </Dialog.Title>
                                                <div className="flex gap-4 mt-2">
                                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">ID: {studentGradeDetails.student.studentId}</p>
                                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Class: {studentGradeDetails.student.class} {studentGradeDetails.student.section}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GPA</p>
                                                    <p className="text-xl font-black text-slate-900">{studentGradeDetails.summary.gpa.toFixed(2)}</p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                                                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Avg. Percentage</p>
                                                    <p className="text-xl font-black text-blue-900">{studentGradeDetails.summary.averagePercentage.toFixed(2)}%</p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Total Subjects</p>
                                                    <p className="text-xl font-black text-indigo-900">{studentGradeDetails.summary.totalSubjects}</p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
                                                    <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Total Grades</p>
                                                    <p className="text-xl font-black text-green-900">{studentGradeDetails.summary.totalGrades}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                {Object.entries(studentGradeDetails.gradesBySubject).map(([subject, grades]) => (
                                                    <div key={subject}>
                                                        <h4 className="text-lg font-bold text-gray-800 mb-4">{subject}</h4>
                                                        {grades.map((grade, idx) => (
                                                            <div key={idx} className="mb-6 p-6 border border-gray-100 rounded-2xl bg-white">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="text-sm font-bold text-gray-800">{grade.term} - {grade.academicYear}</p>
                                                                        <div className="flex gap-4 mt-2">
                                                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Grade: {grade.letterGrade}</p>
                                                                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Percentage: {grade.percentage}%</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-sm font-bold text-gray-900">{grade.totalScore} / {grade.totalMaxScore}</p>
                                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">GPA: {grade.gradePoints}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-4 space-y-4">
                                                                    <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 pb-2">Breakdown</h5>
                                                                    <div className="divide-y divide-gray-50">
                                                                        {grade.assessments.map((assessment, index) => (
                                                                            <div key={index} className="py-3 flex justify-between items-center">
                                                                                <div>
                                                                                    <p className="text-sm font-medium text-gray-700">{assessment.title}</p>
                                                                                    <div className="flex gap-3 text-[10px] text-gray-400 font-medium uppercase mt-1">
                                                                                        <span>{assessment.type}</span>
                                                                                        <span>•</span>
                                                                                        <span>{new Date(assessment.date).toLocaleDateString()}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <p className="text-sm font-semibold text-gray-800">{assessment.score} / {assessment.maxScore}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Teacher Remarks</label>
                                                                    <p className="text-sm text-gray-700 italic">
                                                                        "{grade.remarks || 'No remarks provided.'}"
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button
                                                    onClick={() => setIsViewDetailsModalOpen(false)}
                                                    className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
                                                >
                                                    Close Record
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center h-96 flex flex-col justify-center items-center">
                                            <p className="text-lg font-semibold text-gray-700">No Grade Details Found</p>
                                            <p className="text-sm text-gray-500 mt-2">There are no grade details to display for this student.</p>
                                        </div>
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </TeacherLayout>
    );
};

export default ClassStudents;