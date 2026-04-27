import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';

// Mock function to get subjects for a class
const getSubjectsForClass = (className) => {
    // In a real app, this would fetch data from an API
    const allSubjects = {
        "Primary 1": ["Mathematics", "Quantitative Reasoning", "Basic Science"],
        "Primary 2": ["Mathematics", "Quantitative Reasoning"],
        "Primary 3": ["Mathematics", "Basic Science"],
    };
    return allSubjects[className] || [];
};

const SubjectSelectionModal = ({ isOpen, onClose, className }) => {
    const navigate = useNavigate();
    const subjects = getSubjectsForClass(className);

    const handleSubjectSelect = (selectedSubject) => {
        onClose();
        // Navigate with class first, then subject
        navigate(`/dashboard/teacher/students/${encodeURIComponent(className)}/${encodeURIComponent(selectedSubject)}`);
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                    Select a Subject for {className}
                                </Dialog.Title>
                                <div className="mt-4 space-y-2">
                                    {subjects.length > 0 ? (
                                        subjects.map((subject) => (
                                            <button
                                                key={subject}
                                                onClick={() => handleSubjectSelect(subject)}
                                                className="w-full text-left p-3 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                {subject}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500">No subjects found for this class.</p>
                                    )}
                                </div>

                                <div className="mt-4">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default SubjectSelectionModal;