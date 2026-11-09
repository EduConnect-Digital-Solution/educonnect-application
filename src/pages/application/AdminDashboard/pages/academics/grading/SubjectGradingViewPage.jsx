import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout.jsx';
import { EmptyState, pushToast } from '../../../../../../components/patterns';
import { useAcademic } from '../../../../../../contexts/AcademicContext.jsx';
import { getAdminSubjectScores } from '../../../services/gradingAPIs.js';

function StatCard({ title, value, icon: Icon, className = '' }) {
    return (
        <div className={`bg-white border border-gray-200 rounded-2xl p-5 flex items-center justify-between ${className}`}>
            <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
            {Icon && (
                <div className="w-12 h-12 rounded-full bg-blue-50/50 flex items-center justify-center">
                    <Icon size={24} className="text-blue-600" />
                </div>
            )}
        </div>
    );
}

export default function SubjectGradingViewPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { currentTerm, loading: scopeLoading } = useAcademic();

    const classId = searchParams.get('classId');
    const className = searchParams.get('className') || 'Unknown Class';
    const armId = searchParams.get('armId');
    const armName = searchParams.get('armName') || 'Unknown Arm';
    const subjectId = searchParams.get('subjectId');
    const subjectName = searchParams.get('subjectName') || 'Unknown Subject';
    const termId = searchParams.get('termId') || currentTerm?.id;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    useEffect(() => {
        if (!classId || !armId || !subjectId || !termId) {
            setError('Missing required parameters to load grading view.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        getAdminSubjectScores(termId, className, armName, subjectName)
            .then(res => {
                setData(res.data);
            })
            .catch(err => {
                setError(err?.message || 'Failed to load subject scores.');
                pushToast({ message: 'Failed to load subject scores.', type: 'error' });
            })
            .finally(() => {
                setLoading(false);
            });
    }, [classId, className, armId, armName, subjectId, subjectName, termId]);

    const handleBack = () => {
        navigate('/dashboard/admin/academics/grading');
    };

    if (scopeLoading || loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-20 h-full">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                </div>
            </AdminLayout>
        );
    }

    if (error) {
        return (
            <AdminLayout>
                <div className="flex flex-col gap-5">
                    <button onClick={handleBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit">
                        <ChevronLeft size={16} /> Back to Grading Matrix
                    </button>
                    <div className="bg-white border border-gray-200 rounded-2xl">
                        <EmptyState variant="error" description={error} onRetry={handleBack} />
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (!data) return null;

    const { policy, students, studentCount, averageScore } = data;

    return (
        <AdminLayout>
            <div className="flex flex-col gap-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <button onClick={handleBack} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors w-fit mb-2">
                            <ChevronLeft size={16} /> Back to Matrix
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">{subjectName}</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {className} · Arm {armName}
                        </p>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <StatCard title="Total Students" value={studentCount ?? students.length} icon={Users} />
                    <StatCard title="Avg Subject Score" value={`${averageScore ?? '--'}%`} icon={TrendingUp} />
                </div>

                {/* Table */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-900">Academic Details of Students</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm whitespace-nowrap">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-200">
                                    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Student ID</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gender</th>
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
                                    const isPending = student.grade === 'Pending';
                                    
                                    return (
                                        <tr key={student.id} className={`hover:bg-gray-50 transition-colors ${rowBg}`}>
                                            <td className="px-5 py-3 font-mono text-xs text-gray-500">{student.admissionNo}</td>
                                            <td className="px-5 py-3 font-medium text-gray-900">{student.name}</td>
                                            <td className="px-5 py-3 text-gray-500">{student.gender || '—'}</td>
                                            <td className="px-5 py-3">
                                                {mra ? (
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-800">{mra.title}</p>
                                                        <p className="text-[10px] text-gray-500">{mra.score} / {mra.maxScore}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No assessments yet</span>
                                                )}
                                            </td>
                                            {policy?.caComponents?.map(ca => (
                                                <td key={ca.id} className="px-5 py-3 text-center font-mono text-xs text-gray-600">
                                                    {student.scores[ca.id] ?? '—'}
                                                </td>
                                            ))}
                                            <td className="px-5 py-3 text-center font-mono text-xs text-gray-600">
                                                {student.scores.exam ?? '—'}
                                            </td>
                                            <td className="px-5 py-3 text-center font-mono text-sm font-bold text-blue-700 bg-blue-50/30">
                                                {student.total}
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold ${
                                                    isPending ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {isPending && <AlertTriangle size={10} className="mr-1" />}
                                                    {student.grade}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {students.length === 0 && (
                            <div className="p-8 text-center text-sm text-gray-500">
                                No students found.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
