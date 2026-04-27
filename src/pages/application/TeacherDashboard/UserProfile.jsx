import React, { useState, Fragment, useEffect } from 'react';
import {
    User,
    Mail,
    Briefcase,
    Phone,
    GraduationCap,
    Users,
    BarChart3,
    X
} from 'lucide-react';
import {AccountInfo} from "./teacherUtils/teacherComponents.jsx";
import {Images} from "../../../components/images.jsx";
import TeacherLayout from "./components/layout/TeacherLayout.jsx";
import { Dialog, Transition } from '@headlessui/react';
import {getSubjectsByClass, getTeacherClasses, getTeacherDashboard} from "../../auth/authAPIs.js";
import {Link} from "react-router-dom";
import {getInitials} from "../AdminDashboard/utils/formatters.js";
import {useAuth} from "../../../contexts/AuthContext.jsx";
// import {getTeacherDashboard, getTeacherClasses} from '../services/teacherService.jsx';

const TeacherProfile = () => {
    const {user} = useAuth();
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [teacher, setTeacher] = useState(null);
    const [teacherSubjects, setTeacherSubjects] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [dashboardRes, classRes] = await Promise.all([
                    getTeacherDashboard(),
                    getTeacherClasses(),
                ]);

                setTeacher(dashboardRes.data.teacher);
                setTeacherSubjects(dashboardRes.data.teacher.subjects);
                setClasses(classRes.data.classes);
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);

    const openModal = async (cls) => {
        setSelectedClass(cls);
        setIsModalOpen(true);
        setLoadingSubjects(true);
        try {
            const response = await getSubjectsByClass(cls.name);
            setSubjects(response.data.subjects);
        } catch (error) {
            console.error("Failed to fetch subjects:", error);
        } finally {
            setLoadingSubjects(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedClass(null);
        setSubjects([]);
    };
    
    if (loading || !teacher) {
        return (
            <TeacherLayout>
                <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading Teacher Profile...</p>
                </div>
            </TeacherLayout>
        );
    }

    return (
        <>
            <TeacherLayout>
                <div className="space-y-6 mt-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Personal Details</h2>
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mt-2">
                            <div className="relative group">
                                <div className="w-18 h-18 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-blue-50 ring-offset-1">
                                    {getInitials(teacher.fullName)}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-12 flex-1 w-full">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Full Name</p>
                                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                        <User size={14} className="text-blue-500" /> {teacher.fullName}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                        <Mail size={14} className="text-blue-500" /> {teacher.email}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Role</p>
                                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                        <Briefcase size={14} className="text-blue-500" /> Teacher
                                    </p>
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Contact Number</p>
                                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                        <Phone size={14} className="text-blue-500" /> {teacher.phone}
                                    </p>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
                            {/* Header Section */}
                            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Classes Assigned</h2>
                                    <p className="text-[10px] text-slate-600 font-medium mt-0.5 uppercase ">Academic Workload Distribution</p>
                                </div>
                                <div className="px-3 py-1 bg-slate-900 text-white rounded text-[11px] font-bold">
                                    {classes.length} Total
                                </div>
                            </div>

                            {/* List Body */}
                            <div className="divide-y divide-slate-100">
                                {classes.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-colors"
                                    >
                                        {/* Class Primary Info */}
                                        <div className="flex-1">
                                            <h3 className="text-base font-semibold text-slate-800 tracking-tight mb-1">
                                                {item.name}
                                            </h3>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registry:</span>
                                                    <span className="text-xs font-semibold text-slate-600">{item.studentCount} Students</span>
                                                </div>
                                                <span className="text-slate-200">|</span>
                                            </div>
                                        </div>

                                        {/* Quantitative Data & Action */}
                                        <div className="flex items-center gap-8">
                                            {/* Visual Bar - Very subtle metadata */}
                                            <div className="hidden md:block w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-slate-900"
                                                    style={{ width: `${(item.studentCount / 50) * 100}%` }}
                                                />
                                            </div>

                                            <button
                                                onClick={() => openModal(item)}
                                                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[11px] font-bold uppercase tracking-widest active:bg-slate-50 transition-all"
                                            >
                                                Review Roster
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer Metadata */}
                            <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 w-full relative bottom-0">
                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] text-center">
                                    Last Registry Audit: {new Date().toLocaleDateString('en-GB')}
                                </p>
                            </div>
                        </div>

                        <AccountInfo role={user.role} />

                    </div>
                </div>
                
                <Transition appear show={isModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={closeModal}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-medium leading-6 text-gray-900"
                                    >
                                        Select a Subject for {selectedClass?.name}
                                    </Dialog.Title>
                                    <div className="mt-4">
                                        {loadingSubjects ? (
                                            <div className="flex justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            </div>
                                        ) : subjects.length > 0 ? (
                                            <div className="space-y-2">
                                                {subjects.map(subject => (
                                                    <Link
                                                        key={subject.name}
                                                        to={`/dashboard/teacher/students/${selectedClass.name}/${subject.name}`}
                                                        className="block w-full text-left p-3 bg-gray-100 rounded-md hover:bg-gray-200"
                                                    >
                                                        {subject.name} ({subject.studentCount} students)
                                                    </Link>
                                                ))}
                                            </div>
                                        ) : (
                                            <p>No subjects found for this class.</p>
                                        )}
                                    </div>

                                    <div className="mt-4">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                            onClick={closeModal}
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
            </TeacherLayout>
        </>
    );
};

export default TeacherProfile;