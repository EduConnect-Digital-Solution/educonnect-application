import React, {Fragment, useState, useEffect} from 'react';
import TeacherLayout from './components/layout/TeacherLayout.jsx';
import { Link } from 'react-router-dom';
import {getSubjectsByClass, getTeacherClasses} from "../../auth/authAPIs.js";
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
// import {getTeacherClasses} from '../services/teacherService.jsx';

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
                <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-gray-500 font-medium animate-pulse">Fetching classes...</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classes.map((cls) => (
                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">{cls.name}</h3>
                                <p className="text-gray-600">Students: <span className="font-medium text-gray-800">{cls.studentCount}</span></p>
                                {/*<p className="text-gray-600">Subjects: <span className="font-medium text-gray-800">{cls.subjects.join(', ')}</span></p>*/}
                                {/* Add more class details as needed */}
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={() => handleViewStudentsClick(cls)}
                                        className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                    >
                                        View Students
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-gray-600 text-lg">No classes assigned yet.</p>
                        <p className="text-gray-500 mt-2">Please contact administration if you believe this is an error.</p>
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
