import React, { useState } from 'react';
import {useSearchParams, useNavigate, NavLink} from "react-router-dom";
import { Building2, Lock, Mail, Phone } from "lucide-react";
import { Toast } from "../../application/AdminDashboard/components/ui/Toast.jsx";
import { completeRegistration } from "../authAPIs.js";
import {Images} from "../../../components/images.jsx";

export default function CompleteRegistration() {
    const [searchParams] = useSearchParams();
    const role = searchParams.get('role'); // "teacher" | "parent"
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        email: "",
        schoolId: "",
        currentPassword: "",
        newPassword: "",
        firstName: "",
        lastName: "",
        phone: "",

        // Teacher fields
        subjects: "",
        qualifications: "",
        experience: "",

        // Parent fields
        address: "",
        occupation: "",
        emergencyContact: "",
        emergencyPhone: ""
    });

    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

    const showToast = (message, type = 'error', duration = 2000, onClose = null) => {
        setToast({ show: true, message, type, onClose });
        setTimeout(() => {
            setToast((prev) => ({ ...prev, show: false }));
            if (onClose) onClose();
        }, duration);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    async function handleSubmit() {
        setIsLoading(true);

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!formData.schoolId) {
            setIsLoading(false);
            return showToast("School ID is required");
        }
        if (!emailPattern.test(formData.email)) {
            setIsLoading(false);
            return showToast("Invalid email address");
        }
        if (!formData.currentPassword) {
            setIsLoading(false);
            return showToast("Temporary password is required");
        }
        if (!formData.newPassword) {
            setIsLoading(false);
            return showToast("New password is required");
        }
        // 5. Password Validation (Descriptive)
        const password = formData?.newPassword || "";
        if (password.length < 8) {
            showToast("Password is too short (minimum 8 characters).");
            setIsLoading(false);
            return;
        } else if (!/[A-Z]/.test(password)) {
            showToast("Password needs at least one uppercase letter.");
            setIsLoading(false);
            return;
        } else if (!/[0-9]/.test(password)) {
            showToast("Password needs at least one number.");
            setIsLoading(false);
            return;
        } else if (!/[!@#$%^&*]/.test(password)) {
            showToast("Password needs at least one special character (!@#$%^&*).");
            setIsLoading(false);
            return;
        }

        /** 1. Build the initial raw payload */
        let rawPayload = {
            email: formData.email,
            schoolId: formData.schoolId,
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
        };

        if (role === "teacher") {
            if (!/^\d+$/.test(formData.experience)) {
                showToast("Experience must be a number.");
                setIsLoading(false);
                return;
            }
            rawPayload.subjects = formData.subjects
                ? formData.subjects.split(',').map(s => s.trim()).filter(Boolean)
                : [];
            rawPayload.qualifications = [...formData.qualifications];
            rawPayload.experience = formData.experience;
        }

        if (role === "parent") {
            rawPayload.address = formData.address;
            rawPayload.occupation = formData.occupation;
            rawPayload.emergencyContact = formData.emergencyContact;
            rawPayload.emergencyPhone = formData.emergencyPhone;
        }

        const payload = Object.fromEntries(
            Object.entries(rawPayload).filter(([_, value]) => {
                if (Array.isArray(value)) return value.length > 0; // Don't send empty arrays
                return value !== null && value !== undefined && value !== "";
            })
        );

        try {
            await completeRegistration(payload);
            showToast("Registration complete", "success", 2000, () => {
                navigate(`/login`);
            });
        } catch (err) {
            showToast(err?.message || "Registration failed");
        }finally {
            setIsLoading(false);
        }
    }

    const handleLogoClick = (e) => {
        e.preventDefault();
        const userConfirmed = window.confirm("You have unsaved changes. Are you sure you want to leave this form?");

        if (userConfirmed) {
            navigate('/');
        }
    };


    return (
        <div className={``}>
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}
            <div className="absolute top-0 z-50 p-5 overflow-hidden items-center w-full ">
                <NavLink to={`/`} onClick={handleLogoClick}>
                    <img
                        src={`${Images.main_logo}`}
                        alt="EduConnect Logo Icon"
                        className="w-[120px] md:w-[170px] md:ml-24"
                    />
                </NavLink>
            </div>
            <div className="max-w-2xl mx-auto overflow-hidden">
                {/* Header Section */}
                <div className="text-center mt-12 mb-8">
                    <h2 className="text-[15px] font-bold text-slate-900 uppercase tracking-[0.3em] mb-3">
                        Institutional Onboarding
                    </h2>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                        Role: <span className="text-slate-900">{role}</span>
                    </p>
                </div>

                <div className="space-y-8 p-10 bg-white border border-slate-200 rounded-3xl shadow-sm">
                    {/* Section 1: Core Credentials */}
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">
                            Primary Identification
                        </h3>

                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Institutional ID
                                <span className={`text-red-600`}>*</span></label>
                            <input
                                name="schoolId"
                                value={formData.schoolId}
                                onChange={handleChange}
                                placeholder="Enter school-issued identifier"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900 transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Communication Email
                                    <span className={`text-red-600`}>*</span>
                                </label>
                                <input
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="myemail@domain.com"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900 transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Number</label>
                                <input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+234 000 000 0000"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Role Specific Meta-Data */}
                    {role === "teacher" && (
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">
                                Professional Background
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Qualifications</label>
                                    <input
                                        name="qualifications"
                                        value={formData.qualifications}
                                        onChange={handleChange}
                                        placeholder="M.Ed, PhD, etc."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Experience</label>
                                    <input
                                        name="experience"
                                        value={formData.experience}
                                        onChange={handleChange}
                                        placeholder="Years"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {role === "parent" && (
                        <div className="space-y-6">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">
                                Guardian Registry
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Residential Address</label>
                                    <input
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Emergency Contact</label>
                                    <input
                                        name="emergencyContact"
                                        value={formData.emergencyContact}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Emergency Phone</label>
                                    <input
                                        name="emergencyPhone"
                                        value={formData.emergencyPhone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 3: Security Protocol */}
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">
                            Security Update
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Temporary Password
                                    <span className={`text-red-600`}>*</span>
                                </label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900 transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Set New Password
                                    <span className={`text-red-600`}>*</span>
                                </label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:bg-white focus:border-slate-900 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-6">
                        <button
                            onClick={handleSubmit}
                            className="w-full py-4 bg-[#0a61a4] text-white text-[11px] font-bold uppercase tracking-[0.3em] rounded-xl hover:bg-slate-800 transition-all duration-300 shadow-sm active:scale-[0.99]"
                        >
                            {!isLoading ? 'Finalize Registration' : 'Processing...'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
