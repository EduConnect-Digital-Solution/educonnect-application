import React, {Fragment, useState, useEffect} from 'react';
import TeacherLayout from './components/layout/TeacherLayout.jsx';
import { Link } from 'react-router-dom';
import {getSubjectsByClass, getTeacherClasses} from "../../auth/authAPIs.js";
import { Dialog, Transition } from '@headlessui/react';
import { X, GraduationCap } from 'lucide-react';
import {CardGridSkeleton} from "../../../components/patterns/index.js";
// import { CardGridSkeleton, EmptyState } from '../../../components/patterns';

const TeacherClasses = () => {
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                setLoading(true);
                const classRes = await getTeacherClasses();
                setClasses(classRes.data.classes);
            } catch (err) {
                console.error('Failed to fetch classes:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();
    }, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);

    const handleViewStudentsClick = async (cls) => {
        setSelectedClass(cls);
        setIsModalOpen(true);
        setLoadingSubjects(true);
        try {
            const response = await getSubjectsByClass(cls.name);
            setSubjects(response.data.subjects);
        } catch (error) {
            console.error("Failed to fetch subjects:", error);
            // Handle error state in UI
        } finally {
            setLoadingSubjects(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedClass(null);
        setSubjects([]);
    }

    if (loading) {
        return (
            <TeacherLayout>
                <div className="flex flex-col h-full gap-5">
                    <h2 className="text-2xl font-bold text-gray-900">My Classes</h2>
                    <CardGridSkeleton cards={6} />
                </div>
            </TeacherLayout>
        );
    }

    if (error) {
        return (
            <TeacherLayout>
                <div className="flex flex-col items-center justify-center h-screen bg-red-50 text-red-700">
                    <p className="text-lg">Error loading classes: {error.message}</p>
                </div>
            </TeacherLayout>
        );
    }

    return (
        <TeacherLayout>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">My Classes</h2>

                {classes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classes.map((cls) => (
                            <div key={cls.name} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all">
                                <h3 className="text-base font-bold text-gray-900 mb-1">{cls.name}</h3>
                                <p className="text-xs text-gray-500">Students: <span className="font-semibold text-gray-700">{cls.studentCount}</span></p>
                                
                                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-end">
                                    <button
                                        onClick={() => handleViewStudentsClick(cls)}
                                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                    >
                                        View Students
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border border-gray-200 rounded-xl mt-4">
                        <EmptyState 
                            variant="first-use" 
                            icon={GraduationCap}
                            title="No classes assigned yet"
                            description="Please contact administration if you believe this is an error."
                        />
                    </div>
                )}
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
    );
};

export default TeacherClasses;
