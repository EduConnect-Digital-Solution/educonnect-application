import React, {useEffect, useState} from "react";
import {NavLink, useLocation, useNavigate} from "react-router-dom";
import {
    AlertCircle,
    AlertTriangle, BarChart3, Bell,
    BookOpen, CalendarDays, CheckCircle2, MessageSquareWarning, ChevronRight, Clock,
    GraduationCap,
    LayoutDashboard, Calendar,
    LogOut, Mail,
    Menu, MessageCircle, MessageSquare,
    MoreHorizontal, Search, ShieldCheck, Upload,
    User,
    UserCheck, UserCog,
    Users,
    X, ChevronLeft
} from "lucide-react";
import {Images} from "../../../../components/images.jsx";
import {formatDate} from "../../AdminDashboard/utils/formatters.js";

export const EducationOverviewDashboard = ({statistics}) => {

    const EducationMetricCard = ({ title, value, icon: Icon, colorClass }) => {
        return (
            // Apply background and text color based on the colorClass prop
            <div className={`p-6 rounded-xl shadow-md flex items-center justify-between min-w-[200px] ${colorClass}`}>

                {/* Icon and Title Container */}
                <div className="flex flex-col space-y-2">
                    <Icon className="w-8 h-8 opacity-70" /> {/* Larger icon */}
                    <p className="text-base font-medium opacity-80 whitespace-nowrap">{title}</p>
                </div>

                {/* Value */}
                <h2 className="text-5xl font-bold">{value}</h2>
            </div>
        );
    };

    const metrics = [
        {
            title: 'My Students',
            value: statistics.myStudents,
            icon: UserCheck,
            colorClass: 'bg-blue-100/50 text-gray-800',
        },
        {
            title: 'Total Students in Classes',
            value: statistics.totalStudentsInClasses,
            icon: BookOpen,
            colorClass: 'bg-green-100/50 text-gray-800',
        },
        {
            title: 'Subjects Assigned',
            value: statistics.subjects,
            icon: GraduationCap,
            colorClass: 'bg-purple-100/50 text-gray-800',
        },{
            title: 'Classes Assigned',
            value: statistics.classes,
            icon: GraduationCap,
            colorClass: 'bg-purple-100/50 text-gray-800',
        },
    ];

    return (
        <div className="p-6">
            {/* Overview Heading (Kept from original design) */}
            <h1 className="text-xl font-semibold text-gray-900 mb-6">Overview</h1>

            {/* Metrics Container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {metrics.map((metric) => (
                    <EducationMetricCard
                        key={metric.title}
                        title={metric.title}
                        value={metric.value}
                        icon={metric.icon}
                        colorClass={metric.colorClass}
                    />
                ))}
            </div>

        </div>
    );
};

// --- Enhanced Quick Action Card Component ---
const QuickActionCard = ({ title, description, buttonText, buttonFunction, icon: Icon, colorClass, comingSoon }) => (
    <div className={`group p-4 rounded-xl border transition-all duration-200 ${
        comingSoon ? 'bg-gray-50/50 border-gray-100 opacity-75' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md'
    }`}>
        <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-lg ${colorClass} ${!comingSoon && 'group-hover:scale-110'} transition-transform`}>
                <Icon size={20} />
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-bold text-sm ${comingSoon ? 'text-gray-400' : 'text-gray-900'}`}>{title}</h3>
                    {comingSoon && (
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">Post MVP</span>
                    )}
                </div>
                <p className="text-gray-500 text-xs leading-relaxed">{description}</p>
                {buttonText && (
                    <button
                        onClick={buttonFunction}
                        disabled={comingSoon}
                        className={`w-full py-2 mt-3  text-xs font-bold rounded-lg transition-colors ${
                            comingSoon
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-transparent'
                                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-[#0A61A4] hover:text-white'
                        }`}
                    >
                        {buttonText}
                    </button>
                )}

            </div>
        </div>
    </div>
);

export const QuickActions = () => {
    const navigate = useNavigate()
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Quick Actions</h2>
        </div>
        <div className="space-y-4 flex-1">
            <QuickActionCard
                title="Upload Lessons"
                description="Upload notes, slides and resources"
                icon={Upload}
                colorClass="bg-gray-50 text-gray-600"
                comingSoon={true}
            />
            <QuickActionCard
                title="Manage Classes"
                description="View and manage your classes"
                buttonText="Manage Classes"
                icon={Mail}
                colorClass="bg-orange-50 text-orange-600"
                buttonFunction={() => navigate('/dashboard/teacher/classes')}
                comingSoon={false}
            />
            <QuickActionCard
                title="Create Quiz"
                description="Test your students' understanding quickly"
                icon={BookOpen}
                colorClass="bg-gray-50 text-gray-600"
                comingSoon={true}
            />
        </div>
    </div>
    )
}

export const RecentActivity = ({activities}) => {
    const activitiesList = activities.map((notif, index) => ({
        id: index + 1,
        text: notif.message,
        time: formatDate(notif.timestamp)
    }));

    const displayActivitiesList = activitiesList.slice(0, 4);
    const hiddenCount = activitiesList.length - displayActivitiesList.length;
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            <div className="flex flex-col gap-6">
                {/* ACTIVE SECTION: RECENT ACTIVITIES */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
                            {hiddenCount > 0 && (
                                <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-bold rounded uppercase tracking-tighter">
                        +{hiddenCount} New
                    </span>
                            )}
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                        >
                            View Full Log
                        </button>
                    </div>

                    <div className="p-8 space-y-6 flex-1">
                        {displayActivitiesList.map((notif) => (
                            <div key={notif.id} className="flex items-start gap-4">
                                {/* Minimalist status indicator */}
                                <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-50" />
                                <div className="space-y-1">
                                    <p className="text-[15px] font-medium text-slate-700 leading-snug">
                                        {notif.text}
                                    </p>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                        {notif.time}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* POST-MVP SECTION: SYSTEM NOTICES TERMINAL */}
                <div className="bg-slate-50/50 rounded-3xl border border-slate-200 border-dashed overflow-hidden">
                    <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Important Notices Terminal</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-200/50 text-[9px] font-bold text-slate-500 uppercase">
                Post-MVP Phase
            </span>
                    </div>

                    <div className="p-10 flex flex-col items-center text-center">
                        <div className="max-w-xs space-y-2">
                            <p className="text-[12px] font-semibold text-slate-800 uppercase tracking-tight">
                                Communications Module Pending
                            </p>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                This terminal is reserved for automated performance alerts, behavior bulletins, and priority parent-teacher correspondence.
                            </p>
                        </div>

                        {/* Skeletal Data Representation */}
                        <div className="mt-6 w-full max-w-[240px] space-y-2 opacity-10">
                            <div className="h-2 bg-slate-400 rounded-full w-full" />
                            <div className="h-2 bg-slate-400 rounded-full w-4/5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ENTERPRISE NOTIFICATIONS MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

                    <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <Bell className="text-slate-900" size={18} />
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">System Activity Log</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto bg-white custom-scrollbar">
                            <div className="space-y-1">
                                {activitiesList.map((notif) => (
                                    <div key={notif.id} className="p-5 rounded-2xl hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-all group">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[13px] font-bold text-slate-800">{notif.title || 'Notification'}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{notif.time}</p>
                                        </div>
                                        <p className="text-[12px] text-slate-500 font-medium leading-relaxed">{notif.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest active:scale-[0.98] transition-all"
                            >
                                Dismiss Log
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>

    )
}

export const TeacherAnalyticsBox = () => {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

    return (
        <div className=" bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col space-y-4 mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Child Progress Analytics</h2>
                        <p className="text-xs text-gray-400 font-medium">Tracking performance vs. attendance trends</p>
                    </div>
                    {/* Legend */}
                    <div className="hidden sm:flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Performance</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Attendance</span>
                        </div>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap gap-3 p-2 bg-gray-50 rounded-2xl border border-gray-100">
                </div>
            </div>

            {/* --- Graph Container --- */}
            <div className="relative h-72 w-full mt-4 bg-white rounded-xl border border-slate-100 overflow-hidden">
                {/* Y-axis Labels (Grayscale) */}
                <div className="absolute left-4 top-4 h-[calc(100%-48px)] flex flex-col justify-between text-[10px] font-semibold text-slate-300 z-10 select-none">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>0%</span>
                </div>

                {/* Background Grid Lines (Subtle structure) */}
                <div className="absolute left-14 right-8 top-4 h-[calc(100%-48px)] flex flex-col justify-between opacity-40">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-full border-t border-slate-100 border-dashed" />
                    ))}
                </div>

                {/* X-axis Labels (Grayscale) */}
                <div className="absolute left-14 right-8 bottom-4 h-6 flex justify-around text-[10px] font-semibold text-slate-300 pt-2 select-none">
                    {weeks.map((week) => (
                        <span key={week} className="uppercase tracking-tighter">{week}</span>
                    ))}
                </div>

                {/* Professional Feature Overlay */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px]">
                    <div className="text-center space-y-3 px-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                            Post-MVP Pipeline
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-800 tracking-tight">Advanced Analytics Pending</h3>
                            <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                                Visualizing historical performance trends and predictive attendance modeling.
                            </p>
                        </div>
                        <div className="pt-2">
                <span className="text-[10px] font-medium text-slate-400 border-b border-slate-200 pb-0.5">
                    Scheduled for Release v2.0
                </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export const TeacherResponsibilities = ({classes, students}) => {
    // Prepare classes and tabs
    const classesList = (classes || []).map(cls => ({
        name: cls.name, count: cls.studentCount, max: 35,
    }));
    const [activeTab, setActiveTab] = useState('students');

    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedParentId, setExpandedParentId] = useState(null);

    // Normalize search term once per render
    const normalizedTerm = (searchTerm || '').toLowerCase().trim();

    // Filter students safely (guard against null/undefined fields)
    const filteredStudents = (students || []).filter((stud) => {
        if (!normalizedTerm) return true; // no filtering when empty
        const fullName = (stud.fullName || stud.name || '').toString().toLowerCase();
        const email = (stud.email || '').toString().toLowerCase();
        const studentId = (stud.studentId || '').toString().toLowerCase();
        const cls = (stud.class || '').toString().toLowerCase();
        return (
            fullName.includes(normalizedTerm) ||
            email.includes(normalizedTerm) ||
            studentId.includes(normalizedTerm) ||
            cls.includes(normalizedTerm)
        );
    });

    // Map filtered students to the table-friendly shape with safe fallbacks
    const children = filteredStudents.map((stud) => ({
        id: stud.id,
        name: stud.fullName || stud.name || 'Unnamed',
        class: stud.class || '—',
        gender: stud.gender || '—',
        parents: (stud.parents || []).map(p => p.email || p || '—'),
        status: stud.isEnrolled ? 'Active' : 'Inactive',
        attendance: stud.age || '—',
        nextPayment: stud.email || '—'
    }));

    return (
        <>
            {/*Classes taught and Students */}
            <div className="col-span-2 h-[500px]">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden">

                    {/* Tabs Header (INSIDE the card) */}
                    <div className="flex gap-1 p-2 bg-gray-50 border-b border-gray-100">
                        <button
                            onClick={() => setActiveTab('students')}
                            className={`flex-1 py-2 text-sm font-bold rounded-xl transition ${
                                activeTab === 'students'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            List of Students
                        </button>
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`flex-1 py-2 text-sm font-bold rounded-xl transition ${
                                activeTab === 'overview'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Class Overview
                        </button>

                    </div>


                    {/* List of Classes taken and Students taught */}
                    <div className="overflow-y-auto bg-gray-100/50">
                        {/*List of Students*/}
                        {activeTab === 'students' && (
                            <div className="bg-white h-full flex flex-col">
                                <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row justify-between gap-4">
                                    <h2 className="text-lg font-bold text-gray-800">List of Students</h2>

                                    <div className="flex gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                placeholder="Search child, email, id or class..."
                                                className="pl-9 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-auto bg-gray-50/30 flex-1">
                                    <div className="flex-1 overflow-y-auto bg-gray-50/30">
                                        <table className="w-full text-left">
                                            <thead className="sticky top-0 bg-gray-50/80 backdrop-blur z-10">
                                            <tr className="text-gray-400 text-[11px] uppercase tracking-wider font-bold">
                                                <th className="px-6 py-4">Student</th>
                                                <th className="px-6 py-4">Class/Parent</th>
                                                <th className="px-6 py-4">Age</th>
                                                <th className="px-6 py-4">Email</th>
                                                <th className="px-6 py-4 text-center">Status</th>
                                            </tr>
                                            </thead>

                                            <tbody className="divide-y divide-slate-100">
                                            {children.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-8 py-10 text-center text-sm text-gray-500">
                                                        No students found.
                                                    </td>
                                                </tr>
                                            ) : children.map((child) => {
                                                const parentEmails = child.parents || [];
                                                const hasMultipleParents = parentEmails.length > 1;
                                                const isExpanded = expandedParentId === child.id;

                                                return (
                                                    <tr key={child.id} className="transition-all">
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-4">
                                                                {/* Geometric Avatar */}
                                                                <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                                                                    {(child.name || ' ').charAt(0)}
                                                                </div>
                                                                <span className="text-[15px] font-semibold text-slate-800 tracking-tight">{child.name}</span>
                                                            </div>
                                                        </td>

                                                        <td className="px-8 py-5">
                                                            <p className="text-[15px] font-bold text-slate-700 mb-1">{child.class}</p>

                                                            {/* Minimalist Parent List */}
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[11px] text-slate-700 font-medium truncate max-w-[150px]">
                                                                        {parentEmails[0] || '—'}
                                                                    </span>
                                                                    {hasMultipleParents && !isExpanded && (
                                                                        <button
                                                                            onClick={() => setExpandedParentId(child.id)}
                                                                            className="px-1.5 py-0.5 bg-slate-100 border border-slate-600 rounded text-[9px] font-bold text-slate-500 uppercase hover:bg-slate-200"
                                                                        >
                                                                            +{parentEmails.length - 1} more
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Expandable Emails */}
                                                                {isExpanded && (
                                                                    <div className="flex flex-col gap-1 mt-1 border-l-2 border-slate-100 pl-2 animate-in slide-in-from-top-1 duration-200">
                                                                        {parentEmails.slice(1).map((email, idx) => (
                                                                            <span key={idx} className="text-[11px] text-slate-700 font-medium">{email}</span>
                                                                        ))}
                                                                        <button
                                                                            onClick={() => setExpandedParentId(null)}
                                                                            className="text-[9px] font-bold text-slate-900 uppercase text-left mt-1"
                                                                        >
                                                                            Collapse
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>

                                                        <td className="px-8 py-5">
                                                            <span className="text-[12px] font-medium text-slate-600">{child.attendance} Yrs</span>
                                                        </td>

                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-2 text-[15px] font-medium text-slate-700">
                                                                <Mail size={12} className="text-slate-500" />
                                                                {child.nextPayment}
                                                            </div>
                                                        </td>

                                                        <td className="px-8 py-5 text-center">
                                                            <span className={`px-2 py-0.5 rounded text-[12px] font-bold uppercase tracking-widest border ${
                                                                child.status === 'Active'
                                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                                    : 'bg-white text-slate-300 border-slate-100'
                                                            }`}>
                                                                {child.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/*List of Classes*/}
                        {activeTab === 'overview' && (
                            <div className="bg-white border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 overflow-hidden flex flex-col">
                                {/* Header Section with Button at Top Right */}
                                <div className="p-6 border-b border-gray-50 flex justify-between items-start">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800 mb-1">Class Overview</h2>
                                        <p className="text-gray-400 text-sm">Number of students in each class</p>
                                    </div>

                                    {/* Relocated View All Button */}
                                    <NavLink to={`/dashboard/teacher/classes`} className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all flex items-center gap-1">
                                        View All <ChevronRight size={14} />
                                    </NavLink>
                                </div>

                                {/* Scrollable Body: Adjust 'max-h-[400px]' to your preferred height */}
                                <div className="p-6 overflow-y-auto max-h-[400px] custom-scrollbar">
                                    <div className="space-y-6">
                                        {classesList.map((cls, idx) => (
                                            <div key={idx} className="group cursor-default">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                                                        {cls.name}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-900">{cls.count}</span>
                                                </div>
                                                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${
                                                            (cls.count / cls.max) > 0.8 ? 'bg-orange-400' : 'bg-blue-500'
                                                        }`}
                                                        style={{ width: `${(cls.count / cls.max) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>

    );
};

export const Pagination = ({ currentPage, totalPages, getPageNumbers }) => {
    return (
        <div className="p-4 flex justify-center items-center gap-4 border-t border-gray-100 shrink-0">
            <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
                <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-1">
                {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-gray-400">...</span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`min-w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                                currentPage === page
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {page}
                        </button>
                    )
                ))}
            </div>

            <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    )
}

export const CircularProgress = ({ value, label, colorClass }) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 70 70">
                    <circle
                        className="text-gray-200 stroke-current"
                        strokeWidth="6"
                        cx="35"
                        cy="35"
                        r={radius}
                        fill="transparent"
                    />
                    <circle
                        className={`${colorClass} stroke-current transition-all duration-500 ease-in-out`}
                        strokeWidth="6"
                        strokeLinecap="round"
                        cx="35"
                        cy="35"
                        r={radius}
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        transform="rotate(-90 35 35)"
                    />
                </svg>
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                    <span className={`text-xl font-bold ${colorClass}`}>{value}%</span>
                </div>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-600 text-center leading-tight">{label}</p>
        </div>
    );
};

export const AccountInfo = ({role}) => {
    // Mock Data


    const permissions = [
        { label: "Create Assignments", enabled: true },
        { label: "Message Parents", enabled: true },
        { label: "Edit Class Details", enabled: true },
        { label: "View Analytics", enabled: true },
    ];

    return (
        <div>
            {/* --- 2. Account Status Card --- */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Account Status</h2>
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-bold uppercase">Active</span>
                    </div>
                </div>

                {/* Verification Status */}
                <section className="mb-8">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Verification Status</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {['Email Verification', 'Phone Verification', 'ID Verification', 'Qualification Verification'].map((text) => (
                            <div key={text} className="flex items-center justify-between p-3 border border-gray-50 bg-gray-50/30 rounded-xl">
                                <span className="text-sm font-semibold text-gray-700">{text}</span>
                                <CheckCircle2 size={18} className="text-green-500 fill-green-50" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Role & Permissions */}
                <section className="mb-8">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Role & Permissions</p>
                    <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck size={16} className="text-blue-600" />
                        <span className="text-sm font-bold text-gray-800">Role: <span className="text-blue-600">{role}</span></span>
                    </div>

                    <div className="space-y-3">
                        {permissions.map((perm) => (
                            <div key={perm.label} className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600">{perm.label}</span>
                                {/* Custom Toggle Switch */}
                                <div className={`w-10 h-5 flex items-center rounded-full p-1 cursor-not-allowed transition-colors duration-300 ${perm.enabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                    <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${perm.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 italic font-medium">Note: Permissions can only be edited by Admin</p>
                </section>

            </div>

        </div>
    );
};


