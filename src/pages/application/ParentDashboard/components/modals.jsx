import React from 'react';
import { X } from 'lucide-react';

export const StudentInfoModal = ({ child, onClose }) => {
    if (!child) return null;

    const SectionHeader = ({ title }) => (
        <div className="mb-6 border-b border-slate-100 pb-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                {title}
            </h4>
        </div>
    );

    const InfoBlock = ({ label, value }) => (
        <div className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
            <p className="text-[13px] font-medium text-slate-700">{value || '—'}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            {/* Backdrop - Subtle dark overlay */}
            <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />

            {/* Modal Body */}
            <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header Profile Section*/}
                <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
                                {child.fullName}
                            </h2>
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                                {child.isActive ? 'Active Record' : 'Inactive'}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 font-medium">
                            {child.classDisplay}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Area - Clean Data Grid */}
                <div className="p-8 overflow-y-auto bg-white flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">

                        {/* Academic Data */}
                        <div>
                            <SectionHeader title="Academic Information" />
                            <div className="grid grid-cols-2 gap-y-6">
                                <InfoBlock label="Student ID" value={child.studentId} />
                                <InfoBlock label="Current Grade" value={`Grade ${child.grade ?? 'UNMARKED'}`} />
                                <InfoBlock label="Section" value={child.section} />
                                <InfoBlock label="Enrollment Status" value={child.isEnrolled ? 'Enrolled' : 'Pending'} />
                            </div>
                        </div>

                        {/* Personal Data */}
                        <div>
                            <SectionHeader title="Identity & Demographics" />
                            <div className="grid grid-cols-2 gap-y-6">
                                <InfoBlock label="Gender" value={child.gender} />
                                <InfoBlock label="Age" value={`${child.age} Years`} />
                                <InfoBlock label="Date of Birth" value={new Date(child.dateOfBirth).toLocaleDateString('en-US', { dateStyle: 'medium' })} />
                                <InfoBlock label="Address" value={child.address} />
                            </div>
                        </div>

                        {/* Communication Data */}
                        <div>
                            <SectionHeader title="Contact Channels" />
                            <div className="grid grid-cols-1 gap-y-6">
                                <InfoBlock label="Registered Email" value={child.email} />
                                <InfoBlock label="Primary Phone" value={child.phone} />
                            </div>
                        </div>

                        {/* Guardian Data */}
                        <div>
                            <SectionHeader title="Guardian Records" />
                            <div className="space-y-4">
                                {child.otherParents?.length > 0 ? child.otherParents.map((parent) => (
                                    <div key={parent.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                        <p className="text-[12px] font-semibold text-slate-700">{parent.name}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{parent.email}</p>
                                    </div>
                                )) : (
                                    <p className="text-[12px] text-slate-400 italic">No additional guardian data available</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer - Metadata */}
                <div className="px-10 py-6 bg-white border-t border-slate-100 flex justify-between items-center">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                        System Entry: {new Date(child.createdAt).toLocaleDateString()}
                    </p>
                    <button
                        onClick={onClose}
                        className="px-8 py-2.5 bg-slate-900 text-white text-[12px] font-semibold rounded-lg transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};