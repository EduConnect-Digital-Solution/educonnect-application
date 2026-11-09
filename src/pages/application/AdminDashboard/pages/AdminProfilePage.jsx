import React, { useState } from 'react';
import { Save } from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';
import Input from '../components/ui/Input';
import {updateAdminProfile} from "../../../auth/authAPIs.js";
import { pushToast, ImageUploadField } from '../../../../components/patterns';
import { useAuth } from '../../../../contexts/AuthContext.jsx';

const AdminProfilePage = () => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        schoolId: '',
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        phone: user?.phone ?? '',
        profileImage: user?.profileImage ?? null,
    });
    const showToast = (message, type) => pushToast({ message, type });
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };



    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData?.lastName || !formData?.firstName || !formData?.phone)
            return showToast("Please fill in all input fields");

        const payload = {
            lastName: formData.lastName,
            firstName: formData.firstName,
            phone: formData.phone,
            profileImage: formData.profileImage ?? null,
        }

        try{
            updateAdminProfile(payload).then(() => {
                showToast('Profile updated successfully!');
            }).catch(() => {
                showToast('Failed to update profile. Please try again.');
            });
        }catch{
            showToast('Failed to update profile. Please try again.');
        }
    };

    return (
        <AdminLayout>
            <div className="max-w-3xl items-start mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Profile</h1>
                    <p className="text-sm text-gray-500">Update your basic account information</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
                    <ImageUploadField
                        name={`${formData.firstName} ${formData.lastName}`.trim()}
                        value={formData.profileImage}
                        onChange={(url) => setFormData(p => ({ ...p, profileImage: url }))}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <Input
                            label="First Name"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            placeholder="John"
                        />
                        <Input
                            label="Last Name"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            placeholder="Doe"
                        />
                        <Input
                            label="Phone Number"
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+234 801 234 5678"
                        />
                    </div>
                    <div className="flex justify-end pt-4 border-t border-gray-100">
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                        >
                            <Save size={16} />
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
};

export default AdminProfilePage;
