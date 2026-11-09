import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Loader2, Users, TrendingUp, AlertTriangle, BookOpen, ExternalLink, Calendar, CheckCircle2 } from 'lucide-react';
import TeacherLayout from "./components/layout/TeacherLayout.jsx";
import { getStudentsByClassandSubject } from "../../auth/authAPIs.js";
import { getEffectivePolicy } from './services/scoreEntryAPIs.js';
import { listAssessmentEntries } from './services/assessmentEntryAPIs.js';
import { useAcademic } from '../../../contexts/AcademicContext.jsx';

function StatCard({ title, value, icon: Icon, className = '' }) {
    return (
        <div className={`bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-start gap-4 ${className}`}>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Icon size={20} strokeWidth={2.5} />
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            </div>
        </div>
    );
}

export default function ClassStudents() {
    const { class: studentClass, subject } = useParams();
    const { currentTerm } = useAcademic();
    
    const [students, setStudents] = useState([]);
    const [policy, setPolicy] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [stuRes, polRes, entRes] = await Promise.all([
                getStudentsByClassandSubject(studentClass, subject),
                getEffectivePolicy(studentClass, subject).catch(() => ({ data: { policy: null } })),
                listAssessmentEntries(studentClass, subject, currentTerm?.id || '').catch(() => ({ data: { entries: [] } }))
            ]);

            const rawStudents = stuRes.data?.students || [];
            const rawStats = stuRes.data?.statistics;
            const activePolicy = polRes.data?.policy;
            const assessmentEntries = entRes.data?.entries || [];

            const pivotedStudents = rawStudents.map(student => {
                const studentScores = {};
                let currentTotal = 0;
                let mostRecent = null;

                // Initialize policy components with zero
                activePolicy?.caComponents?.forEach(ca => {
                    studentScores[ca.id] = 0;
                });
                studentScores['exam'] = 0;

                // Sum up scores per component
                assessmentEntries.forEach(entry => {
                    const sScore = entry.scores?.find(s => s.studentId === student.id || s.studentName === student.fullName);
                    if (sScore && sScore.scoreObtained != null) {
                        const obtained = sScore.scoreObtained;
                        
                        if (entry.componentType === 'exam') {
                            studentScores['exam'] += obtained;
                        } else if (entry.policyComponentId) {
                            studentScores[entry.policyComponentId] = (studentScores[entry.policyComponentId] || 0) + obtained;
                        }
                        
                        currentTotal += obtained;

                        // Find most recent assessment
                        if (!mostRecent || new Date(entry.createdAt) > new Date(mostRecent.date)) {
                            mostRecent = {
                                title: entry.title,
                                score: obtained,
                                maxScore: entry.maxObtainableScore,
                                date: entry.createdAt
                            };
                        }
                    }
                });

                return {
                    ...student,
                    scores: studentScores,
                    mostRecentAssessment: mostRecent,
                    total: currentTotal,
                    displayGrade: student.grade || 'Pending'
                };
            });

            setStudents(pivotedStudents);
            setPolicy(activePolicy);
            setStats(rawStats);
        } catch (err) {
            console.error('Failed to fetch class data:', err);
            setError(err?.message || 'Failed to load student data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [studentClass, subject, currentTerm]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <TeacherLayout>
            <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Link to="/dashboard/teacher" className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors flex items-center">
                                <ChevronLeft size={16} className="mr-0.5" />
                                Dashboard
                            </Link>
                            <span className="text-gray-300">/</span>
                            <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                {studentClass}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">{subject}</h1>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                           Student Progress & Grading Overview
                        </p>
                    </div>

                    <Link
                        to={`/dashboard/teacher/score-entry?className=${encodeURIComponent(studentClass)}&subjectName=${encodeURIComponent(subject)}`}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Enter Scores <ExternalLink size={16} />
                    </Link>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Loader2 size={32} className="animate-spin mb-3 text-blue-600" />
                        <p className="text-sm font-medium">Loading class data...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-6 flex flex-col items-center justify-center text-center">
                        <AlertTriangle size={32} className="text-red-500 mb-3" />
                        <p className="text-sm font-semibold text-red-800">{error}</p>
                        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors">
                            Try Again
                        </button>
                    </div>
                ) : (
                    <>
                        {/*/!* KPI Cards *!/*/}
                        {/*<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">*/}
                        {/*    <StatCard title="Total Students" value={stats?.totalStudents || students.length} icon={Users} />*/}
                        {/*    <StatCard title="Graded Students" value={stats?.gradedStudents || 0} icon={CheckCircle2} />*/}
                        {/*    <StatCard title="Ungraded Students" value={stats?.ungradedStudents || 0} icon={AlertTriangle} />*/}
                        {/*    <StatCard title="Grading Progress" value={`${stats?.gradingProgress || 0}%`} icon={TrendingUp} />*/}
                        {/*</div>*/}

                        {/* Table */}
                        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Calendar size={16} className="text-gray-400" />
                                    Academic Details of Students
                                </h3>
                                {policy && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Active Policy:</span>
                                        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
                                            {policy.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-200">
                                            <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Student Details</th>
                                            <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Most Recent Assessment</th>
                                            {policy?.caComponents?.map(ca => (
                                                <th key={ca.id} className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                    {ca.name} ({ca.maxScore})
                                                </th>
                                            ))}
                                            <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                                Exam ({policy?.examMax ?? 60})
                                            </th>
                                            <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-blue-50/50">Current Total</th>
                                            <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">Grade Name</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {students.map((student, idx) => {
                                            const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30';
                                            const mra = student.mostRecentAssessment;
                                            const isPending = student.displayGrade === 'Pending';
                                            
                                            return (
                                                <tr key={student.id} className={`hover:bg-gray-50 transition-colors ${rowBg}`}>
                                                    <td className="px-5 py-3">
                                                        <p className="font-semibold text-gray-900">{student.fullName}</p>
                                                        <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{student.admissionNo || student.id.split('-')[0]}</p>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        {mra ? (
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-800">{mra.title}</p>
                                                                <p className="text-[10px] text-gray-500 mt-0.5">{mra.score} / {mra.maxScore}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">No assessments yet</span>
                                                        )}
                                                    </td>
                                                    {policy?.caComponents?.map(ca => (
                                                        <td key={ca.id} className="px-5 py-3 text-center font-mono text-xs text-gray-600">
                                                            {student.scores[ca.id] > 0 ? student.scores[ca.id] : '—'}
                                                        </td>
                                                    ))}
                                                    <td className="px-5 py-3 text-center font-mono text-xs text-gray-600">
                                                        {student.scores.exam > 0 ? student.scores.exam : '—'}
                                                    </td>
                                                    <td className="px-5 py-3 text-center font-mono text-sm font-bold text-blue-700 bg-blue-50/30">
                                                        {student.total > 0 ? student.total : '0'}
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold ${
                                                            isPending ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                                        }`}>
                                                            {isPending && <AlertTriangle size={10} className="mr-1" />}
                                                            {student.displayGrade}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {students.length === 0 && (
                                            <tr>
                                                <td colSpan={100} className="p-8 text-center text-sm text-gray-500 italic">
                                                    No students enrolled in this subject.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </TeacherLayout>
    );
}