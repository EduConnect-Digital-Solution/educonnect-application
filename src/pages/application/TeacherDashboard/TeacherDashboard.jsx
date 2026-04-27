import React, { useState, useEffect } from 'react';
import {
    EducationOverviewDashboard,
    RecentActivity,
    TeacherAnalyticsBox, QuickActions, TeacherResponsibilities
} from "./teacherUtils/teacherComponents.jsx";
import TeacherLayout from "./components/layout/TeacherLayout.jsx";
import {getTeacherClasses, getTeacherDashboard, getTeacherStudents} from "../../auth/authAPIs.js";
// import {getTeacherDashboard, getTeacherClasses, getTeacherStudents} from 'services/teacherService.jsx';

// TODO: make gradde selection in dashbaord have the default term as the value but still open to selection.

export default function TeacherDashboard() {
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [statistics, setStatistics] = useState({
        myStudents: 0,
        totalStudentsInClasses: 0,
        subjects: 0,
        classes: 0
    });
    const [recentActivity, setRecentActivity] = useState();
    const [students, setStudents] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teacher, setTeacher] = useState(null);

    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const [dashboardRes, classRes, StudentsRes] = await Promise.all([
                    getTeacherDashboard(),
                    getTeacherClasses(),
                    getTeacherStudents(),
                ]);

                setStatistics(dashboardRes.data.statistics);
                setTeacher(dashboardRes.data.teacher);
                setSubjects(dashboardRes.data.teacher.subjects);
                setClasses(classRes.data.classes);
                setRecentActivity(dashboardRes.data.recentActivity.map(notification => ({
                    type: notification.type,
                    message: notification.message,
                    timestamp: notification.timestamp,
                })));
                setStudents(StudentsRes.data.students.map(std => ({
                    id: std.studentId,
                    fullName: std.fullName,
                    email: std.email,
                    class: std.classDisplay,
                    age: std.age,
                    gender: std.gender,
                    parents: std.parents.map(parent => ({
                        email: parent.email
                    })),
                    isEnrolled: std.isEnrolled,
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
            <TeacherLayout>
                <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading Teacher Dashboard...</p>
                </div>
            </TeacherLayout>
        );
    }
    return (
        <>
            <TeacherLayout>
                <EducationOverviewDashboard statistics={statistics}/>

                <div className="grid grid-cols-1 p-2 lg:grid-cols-3 gap-6">
                    <TeacherResponsibilities classes={classes} students={students} />
                    <QuickActions />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 p-2">
                    <TeacherAnalyticsBox/>
                    <RecentActivity activities={recentActivity} />
                </div>

            </TeacherLayout>
        </>
    )
}

