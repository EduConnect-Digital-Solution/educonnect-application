import React, { useState, useEffect, useRef } from 'react';
import {Plus, X, Search, UserCircle2} from 'lucide-react';
import { inviteTeacher, inviteParent, createStudent, getAllStudents } from '../../services/adminService';
import Input from '../ui/Input';
import { Toast } from '../ui/Toast.jsx';
import {getStatusBadgeStyle} from "../../utils/styleHelpers.js";
import {CreateStudentModal, InviteParentModal, InviteTeacherModal} from "../ui/modals.jsx"; // Assuming a global Toast component

const availableSubjects = [
    "English Language", "Mathematics", "Basic Science", "Social Studies", "Civic Education",
    "Computer Studies", "Physics", "Chemistry", "Biology", "Agricultural Science"
];

const QuickActionCard = ({ title, description, buttonText, icon: Icon, colorClass, buttonFunction }) => (
    <div className="group p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:shadow-md transition-all duration-200">
        <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-lg ${colorClass} transition-transform group-hover:scale-110`}>
                <Icon size={20} />
            </div>
            <div className="flex-1">
                <h3 className="text-gray-900 font-bold text-sm mb-1">{title}</h3>
                <p className="text-gray-500 text-xs mb-3 leading-relaxed">{description}</p>
                <button
                    onClick={buttonFunction}
                    className="w-full py-2 text-xs font-bold rounded-lg bg-gray-50 text-gray-700 border border-gray-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors">
                    {buttonText}
                </button>
            </div>
        </div>
    </div>
);

const QuickActions = () => {
    const [viewTeacher, setViewTeacher] = useState(false);
    const [viewParent, setViewParent] = useState(false);
    const [viewStudent, setViewStudent] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
    };

    return (
        <>
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Quick Actions</h2>
                </div>
                <div className="space-y-4 flex-1">
                    <QuickActionCard
                        title="Register Students"
                        description="Add new students to the system."
                        buttonText="Add Students"
                        icon={Plus}
                        buttonFunction={() => setViewStudent(true)}
                        colorClass="bg-blue-50 text-blue-600"
                    />
                    <QuickActionCard
                        title="Invite Teachers"
                        description="Create teacher accounts and send invitation links."
                        buttonText="Invite Teachers"
                        icon={Plus}
                        buttonFunction={() => setViewTeacher(true)}
                        colorClass="bg-purple-50 text-purple-600"
                    />
                    <QuickActionCard
                        title="Invite Parents"
                        description="Send invites to connect guardians with their students."
                        buttonText="Send Invites"
                        buttonFunction={() => setViewParent(true)}
                        icon={Plus}
                        colorClass="bg-green-50 text-green-600"
                    />
                </div>
            </div>

            {viewTeacher && <InviteTeacherModal onClose={() => setViewTeacher(false)} showToast={showToast} />}
            {viewParent && <InviteParentModal onClose={() => setViewParent(false)} showToast={showToast} />}
            {viewStudent && <CreateStudentModal onClose={() => setViewStudent(false)} showToast={showToast} />}
        </>
    );
};


export default QuickActions;
