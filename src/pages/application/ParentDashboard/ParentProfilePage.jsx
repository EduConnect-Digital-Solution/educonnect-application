import React, { useState, useEffect } from 'react';
import {
    User, MapPin, ShieldCheck, Key,
    Edit3, Smartphone, Briefcase, Save, X, Info
} from 'lucide-react';
import ParentLayout from "./components/layout/ParentLayout.jsx";
import {getParentProfile, updateParentProfile} from "../../auth/authAPIs.js";
import {Toast} from "../AdminDashboard/components/ui/Toast.jsx";
// import { getParentProfile } from './services/parentService';

const ParentProfilePage = () => {
    const [loading, setLoading] = useState(true);
    const [parentInfo, setParentInfo] = useState();
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const profileData = await getParentProfile();
                setParentInfo(profileData.data.parent);
            } catch (err) {
                console.error('Failed to fetch profile:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        address: "",
        occupation: "",
        emergencyContact: "",
        emergencyPhone: ""
    });

    // Sync API data to form state when loaded
    useEffect(() => {
        if (parentInfo?.parent) {
            const p = parentInfo.parent;
            setFormData({
                firstName: p.firstName || "",
                lastName: p.lastName || "",
                phone: p.phone || "",
                address: p.address || "", // Will use fallback if empty in API
                occupation: p.occupation || "",
                emergencyContact: p.emergencyContact || "",
                emergencyPhone: p.emergencyPhone || ""
            });
        }
    }, [parentInfo]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try{
            const updateProfile = await updateParentProfile(formData)
            showToast(`${updateProfile.message}`, 'success');

        } catch(error){
            const message = error.response?.data?.message || 'Failed to update profile. Please try again.';
            showToast(message, 'error');
        }
        // Add your update API call here
        setIsEditing(false);
    };

    if (loading) {
        return (
            <ParentLayout>
                {toast.show && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast({ ...toast, show: false })}
                    />
                )}
                <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-[#0A61A4] rounded-full border-t-transparent animate-spin"></div>
                    </div>
                    <p className="mt-4 text-gray-500 font-medium animate-pulse">Syncing Profile...</p>
                </div>
            </ParentLayout>
        );
    }

    const parent = parentInfo;

    return (
        <ParentLayout>
            <div className="max-w-5xl mx-auto p-8">
                {/* Header Section */}
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
                            {isEditing ? "Edit Profile Details" : "Account Settings"}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {isEditing ? "Update your personal and contact information below." : "View and manage your personal identity and security records."}
                        </p>
                    </div>
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#0A61A4] text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
                        >
                            <Edit3 size={14} /> Edit Profile
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold uppercase tracking-widest"
                            >
                                <X size={14} className="inline mr-1" /> Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all"
                            >
                                <Save size={14} /> Save Changes
                            </button>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* MAIN CONTENT COLUMN */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* 1. Personal Identity Card */}
                        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Personal Identity</h3>
                            </div>

                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <DataField
                                        label="First Name"
                                        name="firstName"
                                        value={isEditing ? formData.firstName : parent?.firstName}
                                        isEditing={isEditing}
                                        onChange={handleChange}
                                    />
                                    <DataField
                                        label="Last Name"
                                        name="lastName"
                                        value={isEditing ? formData.lastName : parent?.lastName}
                                        isEditing={isEditing}
                                        onChange={handleChange}
                                    />
                                    <DataField
                                        label="Registered Email"
                                        value={parent?.email}
                                        isEditing={false} // Email typically not editable for security
                                        subtext="Primary contact email"
                                    />
                                    <DataField
                                        label="Phone Number"
                                        name="phone"
                                        value={isEditing ? formData.phone : parent?.phone}
                                        isEditing={isEditing}
                                        onChange={handleChange}
                                    />
                                    <div className="md:col-span-2">
                                        <DataField
                                            label="Residential Address"
                                            name="address"
                                            value={isEditing ? formData.address : (formData.address || "No address on file")}
                                            isEditing={isEditing}
                                            onChange={handleChange}
                                            icon={<MapPin size={14} />}
                                        />
                                    </div>
                                    <DataField
                                        label="Current Occupation"
                                        name="occupation"
                                        value={isEditing ? formData.occupation : (formData.occupation || "Not specified")}
                                        isEditing={isEditing}
                                        onChange={handleChange}
                                        icon={<Briefcase size={14} />}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Emergency Contact Card */}
                        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Safety & Emergency</h3>
                            </div>
                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <DataField
                                        label="Emergency Contact Name"
                                        name="emergencyContact"
                                        value={isEditing ? formData.emergencyContact : (formData.emergencyContact || "—")}
                                        isEditing={isEditing}
                                        onChange={handleChange}
                                    />
                                    <DataField
                                        label="Emergency Phone"
                                        name="emergencyPhone"
                                        value={isEditing ? formData.emergencyPhone : (formData.emergencyPhone || "—")}
                                        isEditing={isEditing}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SIDEBAR: System Info */}
                    <div className="space-y-6">
                        <div className="border text-black rounded-3xl p-6">
                            <h3 className="text-lg font-bold mb-1">Account Settings</h3>
                            <p className="text-slate-400 text-sm mb-5 font-medium tracking-wide">Registered since {new Date(parent?.createdAt).toLocaleDateString()}</p>

                            <div className="flex justify-between items-center border-t border-white/10">
                                <span className="text-[10px] uppercase font-bold text-slate-500">Parent Status</span>
                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold uppercase">
                                    {parent?.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                        </div>
                    </div>
                </form>
            </div>
        </ParentLayout>
    );
};

// Helper Component for consistent Layout
const DataField = ({ label, name, value, isEditing, onChange, icon, subtext }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
        {isEditing ? (
            <input
                type="text"
                name={name}
                value={value}
                onChange={onChange}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
            />
        ) : (
            <div className="flex items-center gap-2">
                {icon && <span className="text-slate-400">{icon}</span>}
                <p className="text-[16px] font-semibold text-slate-700">{value || "—"}</p>
            </div>
        )}
        {subtext && !isEditing && <p className="text-[10px] text-slate-400 italic">{subtext}</p>}
    </div>
);

export default ParentProfilePage;