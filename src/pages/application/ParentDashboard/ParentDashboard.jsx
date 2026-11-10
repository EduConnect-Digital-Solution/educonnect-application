import React, { useState, useEffect } from 'react';
import {AnalyticsAndActions, ChildListandNotification, ParentsOverviewDashboard} from "./parentUtils/p_utils.jsx";
import ParentLayout from "./components/layout/ParentLayout.jsx";
import {getParentDashboard, getParentProfile} from "../../auth/authAPIs.js";
// import { getParentDashboard, getParentProfile } from './services/parentService';


export default function ParentDashboard() {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState({
        totalChildren: 0,
        enrolledChildren: 0,
        activeChildren: 0,
        classesRepresented: 0
    });

    const [children, setChildren] = useState();
    const [notifications, setNotifications] = useState();
    const [, setParentInfo] = useState();


    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const analyticsData = await getParentDashboard();
                const profileData = await getParentProfile();

                const totalStudents = analyticsData.data.children;
                const totalNotifications = analyticsData.data.notifications;

                // Setting Parent Related Analytics Variables
                setParentInfo(profileData.data.parent);
                setOverview(analyticsData.data.statistics);
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
                setNotifications(totalNotifications.map(notification => ({
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    timestamp: notification.timestamp,
                    isRead: notification.isRead
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

    if (loading) {
        return (
            <ParentLayout>
                <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading Parent Dashboard...</p>
                </div>
            </ParentLayout>
        );
    }

    if (error) {
        return (
            <ParentLayout>
                <div className="max-w-md mx-auto mt-16 text-center bg-white border border-red-100 rounded-2xl p-8">
                    <p className="font-semibold text-gray-900">We couldn't load your dashboard</p>
                    <p className="text-sm text-gray-500 mt-1">
                        {error.response?.data?.message || 'Please check your connection and try again.'}
                    </p>
                    <button onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#002684] rounded-lg">
                        Try again
                    </button>
                </div>
            </ParentLayout>
        );
    }

    return (
        <>
            <ParentLayout>
                <ParentsOverviewDashboard overview={overview}/>
                <AnalyticsAndActions />
                <ChildListandNotification children={children} notifications={notifications}/>
            </ParentLayout>
        </>
    )
}