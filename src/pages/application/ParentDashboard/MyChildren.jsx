import React, {useState, useEffect} from 'react';
import { Phone, BookOpen, GraduationCap, X, User, Hash, Info, Mail, Users } from 'lucide-react';
import { StatRing } from "./parentUtils/p_utils.jsx";
import ParentLayout from "./components/layout/ParentLayout.jsx";
import {formatDate, getInitials} from "../AdminDashboard/utils/formatters.js";
import {StudentInfoModal} from "./components/modals.jsx";
import {getParentDashboard, getStudentInfo} from "../../auth/authAPIs.js";
// import { getParentDashboard } from './services/parentService';


const ChildSelectionPage = () => {
    const [loading, setLoading] = useState(true);
    const [children, setChildren] = useState();
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const analyticsData = await getParentDashboard();

                const totalStudents = analyticsData.data.children;

                setChildren(totalStudents.map(child => ({
                    id: child.id,
                    studentId: child.studentId,
                    fullName: child.fullName,
                    classDisplay: child.classDisplay,
                    age: child.age,
                    gender: child.gender,
                    dateOfBirth: child.dateOfBirth,
                    isEnrolled: child.isEnrolled,
                    teachers: child.teachers
                })));
            } catch (err) {
                console.error('Failed to fetch analytics:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    const [selectedChild, setSelectedChild] = useState(null);


    if (loading) {
        return (
            <ParentLayout>
                <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-gray-500 font-medium animate-pulse">Syncing student records...</p>
                </div>
            </ParentLayout>
        );
    }

    return (
        <ParentLayout>
            <div className="bg-slate-50">
                {/* Header Section */}
                <div className="mb-12 flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Children Profiles</h2>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Records: {children?.length || 0}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {children?.map((child) => (
                        <div key={child.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">

                            <div className="p-8 flex-1">
                                {/* Top Section: Profile Identity */}
                                <div className="flex justify-between items-start mb-8">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xl font-semibold">
                                        {getInitials(child.fullName)}
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded border ${
                                        child.isEnrolled
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                        {child.isEnrolled ? 'Enrolled' : 'Pending'}
                                    </span>
                                </div>

                                {/* Primary Name & ID */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-slate-800 tracking-tight leading-none">
                                        {child.fullName}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student ID: {child.studentId}</span>
                                    </div>
                                </div>

                                {/* Academic Grid - Minimalist */}
                                <div className="grid grid-cols-2 gap-px bg-slate-100 border border-slate-100 rounded-xl overflow-hidden mb-8">
                                    <div className="bg-white p-3">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">Class</p>
                                        <p className="text-xs font-semibold text-slate-700">{child.classDisplay}</p>
                                    </div>
                                    <div className="bg-white p-3">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">Gender</p>
                                        <p className="text-xs font-semibold text-slate-700 capitalize">{child.gender}</p>
                                    </div>
                                </div>

                                {/* Subject Tags - Monochromatic */}
                                {/*<div className="">*/}
                                {/*    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Core Subjects</p>*/}
                                {/*    <div className="flex flex-wrap gap-2">*/}
                                {/*        {['Math', 'English', 'Science'].map(tag => (*/}
                                {/*            <span key={tag} className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 rounded text-[10px] font-medium">*/}
                                {/*                {tag}*/}
                                {/*            </span>*/}
                                {/*        ))}*/}
                                {/*    </div>*/}
                                {/*</div>*/}

                            </div>

                            {/* Unified Action - Non-Hover Styling */}
                            <div className={`mx-auto px-3 py-1 mb-6 items-center gap-2 bg-[#0A61A4] hover:cursor-pointer text-white rounded-4xl`}>
                                <button
                                    onClick={async () => {
                                        const childInfo = await getStudentInfo(child.id);
                                        setSelectedChild(childInfo);
                                    }}
                                    className="hover:cursor-pointer text-nowrap flex items-center justify-center gap-2 "
                                >
                                    <Info size={14} />
                                    View Information
                                </button>
                            </div>

                        </div>
                    ))}
                </div>

                <StudentInfoModal
                    child={selectedChild}
                    onClose={() => setSelectedChild(null)}
                />
            </div>
        </ParentLayout>
    );
};


export default ChildSelectionPage;