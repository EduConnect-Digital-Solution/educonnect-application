import React, {useEffect, useState} from 'react';
import { School, Phone, Mail, Globe, MapPin, PencilLine, Power, Info } from 'lucide-react';
import AdminLayout from '../components/layout/AdminLayout';
import Input from '../components/ui/Input';
import {getSchoolProfile, updateSchool, deactivateSchool, reactivateSchool} from "../../../auth/authAPIs.js";
import {Toast} from "../components/ui/Toast.jsx";

const Field = ({ label, value, icon: Icon, editable, name, onChange }) => (
    <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            {label}
        </p>
        <div className="flex items-center gap-2">
            <Icon size={14} className="text-blue-500" />
            {editable ? (
                <Input
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="w-full text-sm font-medium text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
                />
            ) : (
                <p className="text-sm font-bold text-gray-800">{value}</p>
            )}
        </div>
    </div>
);

const SchoolProfilePage = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusAction, setStatusAction] = useState(''); // 'activate' or 'deactivate'
    const [statusReason, setStatusReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [school, setSchool] = useState({});
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });

    const showToast = (message, type = 'error') => {
        setToast({ show: true, message, type });
    };

    const [formData, setFormData] = useState({
        schoolName: '',
        phone: '',
        address: '',
        schoolType: '',
        website: '',
        description: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const fetchSchoolProfile = async () => {
        try {
            setLoading(true);
            const response = await getSchoolProfile();
            const schoolInformation = response.data.school;
            const mockUsersList = {
                id: schoolInformation.id,
                schoolName: schoolInformation.schoolName,
                schoolType: schoolInformation.schoolType,
                phone: schoolInformation.phone,
                isVerified: schoolInformation.isVerified,
                isActive: schoolInformation.isActive,
                address: schoolInformation.address,
                email: schoolInformation.email,
                schoolId: schoolInformation.schoolId,
                statistics: schoolInformation.statistics,
                description: null
            };

            setSchool(mockUsersList);
            setFormData({
                schoolName: schoolInformation.schoolName || '',
                phone: schoolInformation.phone || '',
                schoolType: schoolInformation.schoolType || '',
                address: schoolInformation.address || '',
                website: schoolInformation.website || '',
                description: schoolInformation.description || '',
            });
        } catch (error) {
            console.error(error)
            showToast(error.message || 'Failed to fetch school profile.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchoolProfile();
    }, []);

    const handleUpdateSchool = async () => {
        try {
            await updateSchool(formData);
            showToast('School profile updated successfully!', 'success');
            setIsEditing(false);
            fetchSchoolProfile(); // Refresh school data
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Failed to update school profile.', 'error');
        }
    };

    const handleStatusChangeRequest = async () => {
        try {
            if (!statusReason.trim()) {
                showToast('Please provide a reason for the status change.', 'error');
                return;
            }
            const action = !school.isActive;
            const payload = {
                schoolId: school.schoolId,
                isActive: action,
                reason: statusReason
            }

            if (school.isActive){
                await deactivateSchool(payload);
                showToast(`School deactivated successfully!`, 'success');
            }else{
                await reactivateSchool(payload);
                showToast(`School reactivated successfully!`, 'success');

            }


            setShowStatusModal(false);
            setStatusReason('');
            fetchSchoolProfile(); // Refresh school data
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Failed to change school status.', 'error');
        }
    };


    if (loading) {
        return (<AdminLayout>
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        </AdminLayout>);
    }

    return (
        <AdminLayout>
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast({ ...toast, show: false })}
                />
            )}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">School Overview</h2>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                            <PencilLine size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="School Name" name="schoolName" value={formData.schoolName} icon={School} editable={isEditing} onChange={handleInputChange} />
                        <Field label="School ID" value={school.schoolId} icon={Info} editable={false} />
                        <Field label="Phone" name="phone" value={formData.phone} icon={Phone} editable={isEditing} onChange={handleInputChange} />
                        <Field label="Email" value={school.email} icon={Mail} editable={false} />
                        <Field label="School Type" name="schoolType" value={formData.schoolType} icon={MapPin} editable={isEditing} onChange={handleInputChange} />
                        <Field label="Website" name="website" value={formData.website} icon={Globe} editable={isEditing} onChange={handleInputChange} />
                        <Field label="Address" name="address" value={formData.address} icon={MapPin} editable={isEditing} onChange={handleInputChange} />
                    </div>

                    <div className="mt-6">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</p>
                        {isEditing ? (
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={4}
                                className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500"
                            />
                        ) : (
                            <p className="text-sm text-gray-700 leading-relaxed italic">"{school.description}"</p>
                        )}
                    </div>

                    {isEditing && (
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                                Cancel
                            </button>
                            <button onClick={handleUpdateSchool} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                Save Changes
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">School Status</h2>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${school.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                            <Power size={12} />
                            {school.isActive ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                     <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-gray-700">
                            {school.isActive ? 'Request School Deactivation' : 'Request School Reactivation'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                value=""
                                className="sr-only peer"
                                checked={showStatusModal}
                                onChange={() => setShowStatusModal(!showStatusModal)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
                        </label>
                    </div>
                     <p className="text-xs text-gray-500 italic">
                         {school.isActive ? 'Deactivation requires review and will not take effect immediately.' : 'Reactivation requires review and will not take effect immediately.'}
                     </p>

                    {showStatusModal && (
                        <div className="mt-6 border-t border-gray-100 pt-4 space-y-4">
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                    Reason for {school.isActive ? 'Deactivation' : 'Reactivation'}
                                </p>
                                <textarea
                                    rows={3}
                                    required
                                    value={statusReason}
                                    onChange={(e) => setStatusReason(e.target.value)}
                                    placeholder={`Clearly state the reason for requesting ${school.isActive ? 'deactivation' : 'reactivation'}...`}
                                    className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-500"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => { setShowStatusModal(false); setStatusReason(''); }} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleStatusChangeRequest}
                                    disabled={!statusReason.trim()}
                                    className={`px-4 py-2 text-sm rounded-lg text-white transition-all ${statusReason.trim() ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 cursor-not-allowed'}`}
                                >
                                    Send {school.isActive ? 'Deactivation' : 'Reactivation'} Request
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default SchoolProfilePage;
