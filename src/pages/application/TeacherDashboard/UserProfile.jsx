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
import {DetailPage} from "../../../components/patterns/index.js";
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

    const workloadContent = (
        <div className="divide-y divide-slate-100">
            {classes.map((item, idx) => (
                <div
                    key={idx}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                >
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-slate-800 tracking-tight mb-1">
                            {item.name}
                        </h3>
                        <p className="text-xs text-gray-500">{item.studentCount} Students</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => openModal(item)}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[11px] font-bold uppercase tracking-widest active:bg-slate-50 hover:bg-slate-50 transition-all"
                        >
                            Review Roster
                        </button>
                    </div>
                </div>
            ))}
            {classes.length === 0 && (
                <div className="py-8 text-center text-gray-500 text-sm">No classes assigned.</div>
            )}
        </div>
    );

    return (
        <>
            <TeacherLayout>
                <div className="mt-8">
                    <DetailPage 
                        avatar={{ name: teacher.fullName }}
                        title={teacher.fullName}
                        subtitle={teacher.email}
                        status={{ tone: 'blue', label: 'Teacher' }}
                        stats={[
                            { label: 'Role', value: 'Teacher' },
                            { label: 'Contact', value: teacher.phone || 'N/A' },
                            { label: 'Classes', value: classes.length.toString() }
                        ]}
                        tabs={[
                            { id: 'workload', label: 'Classes & Workload', content: workloadContent }
                        ]}
                        rail={
                            <div className="mt-2">
                                <AccountInfo role={user.role} />
                            </div>
                        }
                    />
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