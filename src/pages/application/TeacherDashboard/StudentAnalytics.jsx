import {
    ArrowLeft, Mail, Phone, MessageSquare,
    FileText, Calendar, Award, BookOpen,
    MoreVertical, Clock
} from 'lucide-react';
import { getInitials } from "../../../utils/imports.jsx";
import {CircularProgress} from "./teacherUtils/teacherComponents.jsx"; // Assuming helper is available


const StudentAnalytics = ({ student, onBack }) => {
    // Mock Data for New Sections
    const recentActivities = [
        { id: 1, type: 'Quiz', title: 'Mathematics: Algebra II', score: '18/20', date: '2 hours ago', status: 'Excellent' },
        { id: 2, type: 'Assignment', title: 'Basic Science: Ecosystems', score: '85%', date: 'Yesterday', status: 'Good' },
        { id: 3, type: 'Quiz', title: 'English: Grammar & Tenses', score: '12/20', date: '3 days ago', status: 'Average' },
    ];

    const subjectData = [
        { name: 'Math', past: 65, present: 88 },
        { name: 'English', past: 80, present: 75 },
        { name: 'Science', past: 45, present: 92 },
        { name: 'Agric', past: 70, present: 72 },
        { name: 'History', past: 90, present: 85 },
    ];

    return (
        <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
            {/* Top Navigation */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-bold">Back to Student List</span>
                </button>
                <div className="flex gap-2">
                    <button className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 transition-colors">
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* --- Left Column: Profile & Metrics (Col 4) --- */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Main Profile Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
                        <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden mb-4 border-4 border-white shadow-sm">
                            {/*{student.avatarUrl ? (*/}
                            {/*    <img src={student.avatarUrl} alt="" className="w-full h-full object-cover" />*/}
                            {/*) : (*/}
                            {/*    <span className="text-3xl font-bold text-gray-400">{getInitials(student.name)}</span>*/}
                            {/*)}*/}
                            <span className="text-3xl font-bold text-gray-400">{getInitials(student.fullName)}</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">{student.fullName}</h2>
                        <p className="text-sm font-medium text-blue-600 mb-6">{student.class} Student</p>

                        <div className="w-full space-y-3 pt-6 border-t border-gray-50">
                            <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-transparent hover:border-gray-100 transition-colors">
                                <Mail size={16} className="text-gray-400" />
                                <span className="text-sm font-medium text-gray-600 truncate">{student.email}</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50/50 rounded-xl border border-transparent hover:border-gray-100 transition-colors">
                                <Phone size={16} className="text-gray-400" />
                                <span className="text-sm font-medium text-gray-600">{student.contact}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Performance Metrics</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <CircularProgress value={student.attendance} label="Attendance" colorClass="text-green-500" />
                            <CircularProgress value={student.behavioral} label="Behavioral" colorClass="text-blue-500" />
                            <CircularProgress value={student.participation} label="Participation" colorClass="text-purple-500" />
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <button className="w-full flex items-center gap-3 p-3 text-sm font-bold text-gray-700 bg-gray-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all group">
                                <MessageSquare size={18} className="text-blue-500 group-hover:text-white" />
                                Message Parent
                            </button>
                            <button className="w-full flex items-center gap-3 p-3 text-sm font-bold text-gray-700 bg-gray-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all group">
                                <FileText size={18} className="text-blue-500 group-hover:text-white" />
                                Generate Report Card
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- Right Column: Analytics & Activity (Col 8) --- */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Subject Performance Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Subject Comparison</h3>
                                <p className="text-xs text-gray-400 font-medium">Past vs Present performance per subject</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 bg-gray-200 rounded-sm" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Past</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-sm" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Present</span>
                                </div>
                            </div>
                        </div>

                        {/* Custom Bar Chart Layout */}
                        <div className="flex items-end justify-between h-48 gap-4 px-2">
                            {subjectData.map((subject, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-3 group">
                                    <div className="w-full flex items-end justify-center gap-1 h-full">
                                        <div
                                            className="w-3 bg-gray-100 rounded-t-sm transition-all duration-500"
                                            style={{ height: `${subject.past}%` }}
                                        />
                                        <div
                                            className="w-3 bg-blue-600 rounded-t-sm transition-all duration-500 group-hover:bg-blue-700"
                                            style={{ height: `${subject.present}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">{subject.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activities Section (Replaced Trend Table) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Activity Timeline */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Clock size={16} className="text-blue-600" /> Recent Activities
                            </h3>
                            <div className="space-y-6">
                                {recentActivities.map((activity) => (
                                    <div key={activity.id} className="relative pl-6 border-l-2 border-gray-50 last:border-0 pb-1">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-500" />
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-blue-600 uppercase tracking-tighter">{activity.type}</span>
                                            <span className="text-[10px] text-gray-400 font-medium">{activity.date}</span>
                                        </div>
                                        <h4 className="text-sm font-bold text-gray-800">{activity.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Award size={12} className="text-green-500" />
                                            <span className="text-xs font-bold text-gray-700">Score: {activity.score}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Teacher's Remarks Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <BookOpen size={16} className="text-purple-600" /> Teacher's Remarks
                            </h3>
                            <div className="bg-gray-50 rounded-xl p-4 min-h-[160px]">
                                <p className="text-xs text-gray-600 leading-relaxed italic">
                                    "{student.name} has shown significant improvement in Science this term. Their participation in lab activities is commendable. Recommend focusing more on English literature to balance overall performance."
                                </p>
                            </div>
                            <button className="w-full mt-4 py-2 text-xs font-bold text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors">
                                Edit Remarks
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
};

export default StudentAnalytics;