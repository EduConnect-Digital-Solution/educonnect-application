import React, {useState, useEffect} from 'react';
import {
    Mail, BookOpen, Users, UserCheck, GraduationCap, Clock, UserPlus, ChevronRight, RefreshCw, XCircle, X,
    MailPlus
} from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';
import AnalyticsComponent from '../AnalyticsComponent';
import {formatDate} from "../utils/formatters";
import {useAuth} from "../../../../contexts/AuthContext.jsx";
import QuickActions from '../components/dashboard/QuickActions';
import {resendInvitation, terminateInvitation} from "../../../auth/authAPIs.js";
import {Toast} from "../components/ui/Toast.jsx";
import { getDashboardAnalytics, getInvitations } from '../services/adminService';

// TODO: Remove the total invitations page
const EducationMetricCard = ({ title, value, icon: Icon, colorClass }) => {
    return (
        <div className={`p-6 rounded-xl shadow-md flex items-center justify-between min-w-[200px] ${colorClass}`}>
            <div className="flex flex-col space-y-2">
                <Icon className="w-8 h-8 opacity-70" />
                <p className="text-base font-medium opacity-80 whitespace-nowrap">{title}</p>
            </div>
            <h2 className="text-5xl font-bold">{value}</h2>
        </div>
    );
};

const AdminOverviewDashboard = ({ overview }) => {
    const metrics = [
        { title: 'Total Users', value: overview.totalUsers, icon: Users, colorClass: 'bg-blue-100/50 text-gray-800' },
        { title: 'Total Active Users', value: overview.totalActiveUsers, icon: UserCheck, colorClass: 'bg-yellow-100/50 text-gray-800' },
        { title: 'Total Students', value: overview.totalStudents, icon: GraduationCap, colorClass: 'bg-green-100/50 text-gray-800' },
        { title: 'Total Invitations', value: overview.totalInvitations, icon: MailPlus, colorClass: 'bg-purple-100/50 text-gray-800' },
        { title: 'Pending Invites', value: overview.pendingInvitations, icon: Clock, colorClass: 'bg-purple-100/50 text-gray-800' },
    ];

    return (
        <div className="p-2">
            <h1 className="text-xl font-semibold text-gray-900 mb-6">Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 w-full">
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

const RecentActivity = ({ activities = { users: [], students: [], invitations: [] } }) => {
    const { users = [], students = [], invitations = [] } = activities || {};

    // Combine and sort by date
    const activity = [
        ...users.map(u => ({ ...u, type: 'USER_REG' })),
        ...students.map(u => ({ ...u, type: 'STUD' })),
        ...invitations.map(i => ({ ...i, type: 'INVITE' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const getActionText = (item) => {
        if (item.type === 'STUD') return ' was added to the system as a student';
        if (item.type === 'USER_REG' && item.isActive) return ' joined as a ';
        return ' was invited as a ';
    };

    return (
        <div className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {activity.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${item.type === 'USER_REG' ? 'bg-green-50' : 'bg-blue-50'}`}>
                                {item.type === 'USER_REG' && item.isActive || item.type === 'STUD' ? <UserPlus size={18} className="text-green-600"/> : <Mail size={18} className="text-blue-600"/>}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-900 leading-tight">
                                    <span className="font-semibold">{item.name || item.email}</span>
                                    {getActionText(item)}
                                    <span className="capitalize text-gray-600">{item.role}</span>
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock size={12} className="text-gray-400" />
                                    <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase ${item.isActive || item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : item.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {item.status || (item.isActive ? 'Active' : 'Inactive')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const PendingInvitations = (invitations) => {
    const [showAllInvites, setShowAllInvites] = useState(false);
    if (!invitations.invitations || invitations.invitations.length === 0) return null;

    const displayInvites = invitations.invitations.slice(0, 3);
    const hasMore = invitations.invitations.length > 3;

    return (
        <>

            {/* Invitation Management Section */}
            <div className="bg-white p-6 rounded-4xl shadow-sm border border-gray-100 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Pending Invitations</h2>
                        <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-widest">
                            Manage access invitations
                        </p>
                    </div>
                </div>

                <div className="space-y-3 flex-1">
                    {displayInvites.map((inv) => (
                        <InvitationItem key={inv.id} inv={inv} />
                    ))}
                </div>

                {/* See More Button - Only shows if more than 3 */}
                {hasMore && (
                    <button
                        onClick={() => setShowAllInvites(true)}
                        className="mt-6 w-full py-3 rounded-2xl border border-dashed border-gray-200 text-gray-500 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 hover:border-blue-200 hover:text-blue-600 transition-all group flex items-center justify-center gap-2"
                    >
                        View all {invitations.invitations.length} invitations
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                )}
            </div>


            {showAllInvites && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-gray-900/40"
                        onClick={() => setShowAllInvites(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">All Invitations</h2>
                                <p className="text-sm font-medium text-gray-400">Showing {invitations.invitations.length} total sent invites</p>
                            </div>
                            <button
                                onClick={() => setShowAllInvites(false)}
                                className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Scrollable List */}
                        <div className="p-8 overflow-y-auto space-y-4">
                            {invitations.invitations.map((inv) => (
                                <InvitationItem key={inv.id} inv={inv} isFullWidth={true} />
                            ))}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-gray-50/50 border-t border-gray-50 text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                End of list
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const InvitationItem = ({inv}) => {
    // Basic date formatter for "invitedAt"
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    const resendCount = inv.resendCount || 0;

    const statusStyles = {
        pending: 'bg-amber-50 text-amber-600',
        accepted: 'bg-green-50 text-green-600',
        expired: 'bg-red-50 text-red-600',
        cancelled: 'bg-gray-50 text-gray-600'
    };

    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });
    const [cancelInvitation, setCancelInvitation] = useState(false);

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
    };

    const auth = useAuth();
    const schoolID = auth.user?.schoolId;

    const [deleteReason, setDeleteReason] = useState('');

    const resendPayload = {
        invitationId: inv.id,
        schoolId: schoolID
    }

    const cancelPayload = {
        invitationId: inv.id,
        reason: deleteReason,
        schoolId: schoolID
    }

    function handleResend() {
        resendInvitation(resendPayload).then(() => {
            showToast('Invitation resent successfully', 'success');
        })
    }

    function handleCancel() {
        terminateInvitation(cancelPayload).then(() => {
            showToast('Invite has been cancelled', 'success');
        })
    }




    return (
        <div
            className="group p-4 rounded-2xl border border-gray-50 bg-white hover:border-blue-100 hover:shadow-sm transition-all flex items-center gap-4">
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-gray-800 text-sm truncate">
                        {inv.email}
                    </h3>
                    <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${statusStyles[inv.status] || statusStyles.pending}`}>
                        {inv.status}
                    </span>
                    {/* Subtle resend count indicator next to status */}
                    {resendCount > 0 && (
                        <span className="text-[9px] font-bold text-gray-400 italic">
                            ({resendCount} {resendCount === 1 ? 'retry' : 'retries'})
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-2 mt-1">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-tight">
                        {inv.role}
                    </span>
                    <span className="text-gray-200 text-xs">•</span>
                    <span className="text-[10px] font-bold text-gray-500">
                        {formatDate(inv.invitedAt)}
                    </span>
                    <span className="text-gray-200 text-xs">•</span>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400 font-medium">By</span>
                        <span className="text-[10px] font-bold text-blue-600 px-1.5 rounded">
                            {inv.invitedBy.name}
                        </span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                <div className="relative">
                    <button
                        onClick={handleResend}
                        title="Resend Invitation"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <RefreshCw size={14}/>
                    </button>

                    {/* Floating Badge on the Button */}
                    {resendCount > 0 && (
                        <div
                            className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[8px] font-black text-white ring-2 ring-white">
                            {resendCount}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setCancelInvitation(true)}
                    title="Cancel" className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <XCircle size={14}/>
                </button>
            </div>


            {cancelInvitation && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black/30" onClick={() => setCancelInvitation(null)} />
                        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                            <button
                                onClick={() => setCancelInvitation(null)}
                                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div>
                                <h3 className="text-xl text-center font-bold mb-3 text-gray-900">Cancel Invitation</h3>
                                <div className="flex items-center gap-3 mb-4">

                                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                                        {inv.email[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">{inv.email}</p>
                                    </div>
                                </div>

                                <div className="mb-4 flex flex-row items-center gap-1 text-gray-600 ">
                                    <p className="text-sm ">Current Status:</p>
                                    <span className={`text-[15px] font-medium`}>
                                        {inv.status}
                                    </span>
                                </div>

                                <div className="w-full text-left mb-6">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                                        Reason for cancellation
                                    </label>
                                    <textarea
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                                        rows="3"
                                        placeholder="Please provide a reason for cancelling this invitation..."
                                        value={deleteReason}
                                        onChange={(e) => setDeleteReason(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={() => setCancelInvitation(null)}
                                        className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        disabled={!deleteReason.trim()}
                                        onClick={() => {
                                            handleCancel();
                                            setCancelInvitation(null);
                                            setDeleteReason('');
                                        }}
                                        className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Proceed
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DashboardPage = () => {
    const [loading, setLoading] = useState(true);
    const [userStats, setUserStats] = useState(null);
    const [overview, setOverview] = useState({
        totalUsers: 0,
        totalActiveUsers: 0,
        totalStudents: 0,
        totalActiveStudents: 0,
        totalInvitations: 0,
        pendingInvitations: 0
    });
    const [invitationList, setInvitations] = useState([]);
    const [userActivities, setUserActivities] = useState([]);
    const [error, setError] = useState(null);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);

                // Check if online before attempting to fetch
                if (!navigator.onLine) {
                    // Offline: Don't fetch data, but don't set error either
                    setIsOffline(true);
                    setLoading(false);
                    return;
                }

                setIsOffline(false);

                const [analyticsData, invitesData] = await Promise.all([
                    getDashboardAnalytics(),
                    getInvitations()
                ]);

                const { recentActivity, overview: fetchedOverview, userStatistics } = analyticsData.data;

                const pendingInvites = invitesData.data.invitations;

                setUserStats(userStatistics);
                setOverview(fetchedOverview);
                setUserActivities(recentActivity);

                const formattedInvites = pendingInvites.map(invite => ({
                    id: invite.id,
                    email: invite.email,
                    role: invite.role,
                    status: invite.status,
                    invitedBy: { name: invite.invitedBy.name },
                    invitedAt: invite.invitedAt,
                    resendCount: invite.resendCount,
                }));

                setInvitations(formattedInvites);
            } catch (err) {
                console.error('Failed to fetch analytics:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    const { logout } = useAuth();

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex flex-col items-center justify-center">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading Admin Dashboard...</p>
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return <div className="text-center py-8 text-red-500">Failed to load dashboard data.</div>;
    }

    return (
        <AdminLayout>
            {isOffline && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 mx-2">
                    <div className="flex items-center">
                        <div className="shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-800">
                                You are currently offline. Dashboard data may be outdated.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            <AdminOverviewDashboard overview={overview} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 p-2">
                <AnalyticsComponent userStatsAnalytics={userStats} />
                <QuickActions />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 p-2">
                <RecentActivity activities={userActivities} />
                <PendingInvitations invitations={invitationList} />
            </div>
        </AdminLayout>
    );
};

export default DashboardPage;
