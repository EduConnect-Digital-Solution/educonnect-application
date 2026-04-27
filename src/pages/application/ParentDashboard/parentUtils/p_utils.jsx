// File containing components and utilities for the Parent Dashboard
import {
    Bell,
    BookOpen,
    Calendar,
    ChevronDown,
    FileText,
    GraduationCap,
    LayoutDashboard,
    LogOut,
    LucideMail,
    Menu,
    MessageCircle,
    MoreHorizontal,
    Search,
    User,
    UserCheck,
    Users,
    X
} from "lucide-react";
import React, {useEffect, useState} from "react";
import {NavLink, useLocation, useNavigate} from "react-router-dom";
import {Images} from "../../../../components/images.jsx";
import {getParentDashboard} from "../../../auth/authAPIs.js";
import {formatDate} from "../../AdminDashboard/utils/formatters.js";

export const StatsMetricCard = ({ title, value, icon: Icon, colorClass }) => {
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

export const SummaryCard = ({ title, value, icon: Icon, color }) => (
    <div className={`flex items-center justify-between p-6 rounded-2xl shadow-sm border border-gray-100 ${color}`}>
        <div>
            <Icon size={24} className="mb-2 opacity-80" />
            <p className="text-sm font-bold opacity-70">{title}</p>
        </div>
        <p className="text-4xl font-bold">{value}</p>
    </div>
);

export const StatRing = ({ percentage, label }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-16 h-16 mb-2">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100" />
                    <circle
                        cx="32" cy="32" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent"
                        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-green-500"
                    />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black">{percentage}%</span>
            </div>
            <span className="text-[9px] font-bold text-gray-400 uppercase text-center leading-tight">{label}</span>
        </div>
    );
};

export const ParentsOverviewDashboard = ({ overview }) => {
    const metrics = [
        { title: 'Total Children', value: overview.totalChildren, icon: UserCheck,colorClass: 'bg-blue-100/50 text-gray-800'},
        { title: 'Enrolled', value: overview.enrolledChildren, icon: Users, colorClass: 'bg-yellow-100/50 text-gray-800'},
        { title: 'Active', value: overview.activeChildren, icon: BookOpen, colorClass: 'bg-green-100/50 text-gray-800', },
        { title: 'Classes Represented', value: overview.classesRepresented, icon: GraduationCap, colorClass: 'bg-purple-100/50 text-gray-800' },
    ];

    return (
        <div className="p-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-6">Overview</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric) => (
                    <StatsMetricCard
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


export const AnalyticsAndActions = ({quickActions}) => {
    const [selectedChild, setSelectedChild] = useState('Sandra J');
    const [selectedSubject, setSelectedSubject] = useState('All Subjects');

    const children = ['Sandra J', 'David J', 'Daniel J'];
    const subjects = ['All Subjects', 'Mathematics', 'Basic Science', 'English'];
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

    const navigate = useNavigate();

    const QuickActionCard = ({ title, description, buttonFunction, buttonText, icon: Icon, colorClass, comingSoon }) => (
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
                    <p className="text-gray-500 text-xs mb-3 leading-relaxed">{description}</p>
                    <button
                        onClick={buttonFunction}
                        disabled={comingSoon}
                        className={`w-full py-2 text-xs font-bold rounded-lg transition-colors ${
                            comingSoon
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-transparent'
                                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-blue-600 hover:text-white hover:border-blue-600'
                        }`}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">

            {/* 1. Student Performance & Attendance Analytics Box */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-col space-y-4 mb-8 relative group">
                    {/* Optional: Lock Overlay or "Coming Soon" Badge */}
                    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                        <span className="bg-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            Available in v2.0
                        </span>
                    </div>

                    {/* The Content: Added opacity-50, grayscale, and pointer-events-none */}
                    <div className="flex flex-col space-y-4 opacity-50 grayscale pointer-events-none select-none">
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
                            {/* Child Selector */}
                            <div className="relative flex-1 min-w-[140px]">
                                <select
                                    disabled
                                    className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-xl text-sm font-bold focus:outline-none"
                                >
                                    <option>Child Name</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            </div>

                            {/* Subject Selector */}
                            <div className="relative flex-1 min-w-[140px]">
                                <select
                                    disabled
                                    className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded-xl text-sm font-bold focus:outline-none"
                                >
                                    <option>{selectedSubject}</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            </div>
                        </div>
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

            {/* 2. Parent Quick Actions Box */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Quick Actions</h2>
                </div>

                <div className="space-y-4 flex-1">
                    {/* 1. COMING SOON FEATURE */}
                    <QuickActionCard
                        title="View Children"
                        description="See all your children's information"
                        buttonText="View Children"
                        icon={FileText}
                        colorClass="bg-blue-100 text-blue-400"
                        comingSoon={false}
                        buttonFunction={() => navigate('/dashboard/parent/children')}
                    />
                    <QuickActionCard
                        title="Academic Progress"
                        description="Check grades and performance"
                        buttonText="View progress"
                        icon={FileText}
                        colorClass="bg-purple-100 text-purple-400"
                        comingSoon={true}
                    />

                    {/*3. ACTIVE FEATURE*/}
                    <QuickActionCard
                        title="Update Profile"
                        description="Manage your contact information"
                        buttonText="Update Profile"
                        icon={MessageCircle}
                        colorClass="bg-red-100 text-red-400"
                        comingSoon={false}
                        buttonFunction={() => navigate('/dashboard/parent/profile')}
                    />

                    {/* 2. ACTIVE FEATURE */}
                    <QuickActionCard
                        title="Contact Teachers"
                        description="Get in touch with the school admin or teachers"
                        buttonText="Coming Soon"
                        icon={LucideMail}
                        colorClass="bg-gray-50 text-gray-600"
                        comingSoon={true}
                    />


                </div>
            </div>
        </div>
    );
};

export const ChildListandNotification = ({ children, notifications }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const childrenList = children.map(child => ({
        id: child.studentId, name: child.fullName,
        class: child.classDisplay, teacher: child.teachers[0]?.name || '-',
        status: child.isEnrolled ? 'Active' : 'Inactive'}));

    const notificationsList = notifications.map((notif, index) => ({
        id: index + 1,
        text: notif.message,
        title: notif.title,
        isRead: notif.isRead,
        time: formatDate(notif.timestamp)
    }));

    const displayNotifications = notificationsList.slice(0, 4);
    const hiddenCount = notificationsList.length - displayNotifications.length;

    return (
        <div className="py-5 bg-gray-50">
            {/* Main Side-by-Side Container */}
            <div className="grid grid-cols-1 lg:grid-cols-2  gap-6">

                {/* 1. List of Children (70% Width on Large Screens) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800">List of Children</h2>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            {/*<div className="relative flex-1">*/}
                            {/*    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />*/}
                            {/*    <input*/}
                            {/*        type="text"*/}
                            {/*        placeholder="Search child..."*/}
                            {/*        className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm w-full focus:ring-2 focus:ring-blue-500"*/}
                            {/*    />*/}
                            {/*</div>*/}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                            <tr className="bg-gray-50/50 text-gray-400 text-[11px] uppercase tracking-wider font-bold">
                                <th className="px-6 py-4">Student Id</th>
                                <th className="px-6 py-4">Child</th>
                                <th className="px-6 py-4">Class/Teacher</th>
                                <th className="px-6 py-4 text-center">Enrolled Status</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                            {childrenList.map((child) => (
                                <tr key={child.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-gray-700">{child.id}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-gray-800">{child.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-semibold text-gray-700">{child.class}</p>
                                        <p className="text-xs text-gray-400">{child.teacher}</p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                child.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                            }`}>
                                                {child.status}
                                            </span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                    </div>
                </div>

                {/* 2. Notifications (30% Width on Large Screens) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-gray-800">Notifications</h2>
                            {hiddenCount > 0 && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-full">
                                    +{hiddenCount}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-xs font-bold text-blue-600 hover:underline"
                        >
                            View All
                        </button>
                    </div>

                    <div className="p-6 space-y-4 flex-1">
                        {displayNotifications.map((notif) => (
                            <div key={notif.id} className="flex gap-4 group cursor-pointer">
                                <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-50" />
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{notif.title}</p>
                                    <p className="text-xs font-medium text-gray-600 group-hover:text-blue-600 transition-colors">
                                        {notif.text}
                                    </p>
                                    <p className="text-[10px] font-medium text-gray-400 mt-1 uppercase tracking-wide">
                                        {notif.time}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Upcoming Event Teaser */}
                    <div className="m-6 p-4 bg-orange-50 rounded-xl border border-orange-100 flex items-center gap-4">
                        <div className="p-3 bg-white rounded-lg text-orange-500 shadow-sm">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-orange-700 uppercase">Upcoming Event</p>
                            <p className="text-sm font-bold text-gray-500">Upcoming Notifications will appear here</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- VIEW ALL NOTIFICATIONS MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <Bell className="text-blue-600" size={20} />
                                <h3 className="text-lg font-bold text-gray-800">All Notifications</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="p-2 max-h-[400px] overflow-y-auto">
                            {notificationsList.map((notif) => (
                                <div key={notif.id} className="p-4 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0">
                                    <p className="text-sm font-bold text-gray-800">{notif.title}</p>
                                    <p className="text-xs font-medium text-gray-600">{notif.text}</p>
                                    <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 bg-gray-50 text-center">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};



