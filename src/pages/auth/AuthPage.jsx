import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { Images } from '../../components/images';
import { LoginSchool, LoginUser } from './authAPIs';
import { Toast } from '../application/AdminDashboard/components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext.jsx';

// ─── Role Selection Card ─────────────────────────────────────────────────────
const RoleCard = ({ title, description, icon, onClick }) => (
    <button
        onClick={onClick}
        className="group w-full flex items-center gap-4 px-5 py-4 bg-white border border-gray-200 rounded-2xl hover:border-[#0a61a4] hover:shadow-lg hover:shadow-blue-100 transition-all duration-200 text-left active:scale-[0.98]"
    >
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-lg shrink-0 group-hover:bg-[#0a61a4] group-hover:text-white transition-all duration-200">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{title}</p>
            <p className="text-xs text-gray-400 truncate">{description}</p>
        </div>
        <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
    </button>
);

// ─── Input Field ─────────────────────────────────────────────────────────────
const Field = ({ label, required, children }) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

const inputCls = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AuthPage() {
    const [selectedRole, setSelectedRole] = useState(null);
    const [view, setView] = useState('login'); // 'login' | 'forgot' | 'reset' | 'confirmed'
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ schoolId: '', email: '', password: '' });
    const [forgotData, setForgotData] = useState({ schoolId: '', email: '' });
    const [resetData, setResetData] = useState({ otp: '', email: '', newPassword: '', confirmPassword: '' });
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });
    const [isLoading, setIsLoading] = useState(false);
    const [checkedSession, setCheckedSession] = useState(false);
    const [showLoggedIn, setShowLoggedIn] = useState(false);
    const navigate = useNavigate();
    const { user, login, logout, checkAuthStatus } = useAuth();

    const showToast = (message, type = 'error', duration = 3000, onClose = null) => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast(p => ({ ...p, show: false }));
            if (onClose) onClose();
        }, duration);
    };

    const handleRoleSelection = async (role) => {
        setSelectedRole(role);
        setIsLoading(true);
        setCheckedSession(false);
        try {
            const resultUser = await checkAuthStatus();
            setShowLoggedIn(!!(resultUser && resultUser.role === role));
        } catch {
            setShowLoggedIn(false);
        } finally {
            setIsLoading(false);
            setCheckedSession(true);
        }
    };

    const handleLogin = async () => {
        if (!formData.schoolId) return showToast('Please enter your School ID.');
        if (!formData.email) return showToast('Please enter your email address.');
        if (!formData.password) return showToast('Please enter your password.');

        setIsLoading(true);
        try {
            const payload = { schoolId: formData.schoolId.trim(), email: formData.email.trim().toLowerCase(), password: formData.password };
            const res = selectedRole === 'admin' ? await LoginSchool(payload) : await LoginUser(payload);
            if (res.success) {
                await login(res);
                setShowLoggedIn(true);
                setView('confirmed');
                showToast('Login successful!', 'success');
            } else {
                showToast(res.message || 'Login failed. Please try again.');
            }
        } catch (err) {
            showToast(err?.response?.data?.message || err?.message || 'Login failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!forgotData.schoolId) return showToast('Please enter your School ID.');
        if (!forgotData.email) return showToast('Please enter your email address.');
        setIsLoading(true);
        try {
            const res = await fetch('/api/school/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotData.email.trim().toLowerCase(), schoolId: forgotData.schoolId.trim() }),
            });
            const data = await res.json();
            if (data.success) {
                setResetData(p => ({ ...p, email: forgotData.email.trim().toLowerCase() }));
                showToast('OTP sent! Check your email.', 'success');
                setView('reset');
            } else {
                showToast(data.message || 'Failed to send reset link.');
            }
        } catch {
            showToast('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resetData.otp) return showToast('Please enter the OTP sent to your email.');
        if (!resetData.newPassword) return showToast('Please enter a new password.');
        if (resetData.newPassword !== resetData.confirmPassword) return showToast('Passwords do not match.');
        setIsLoading(true);
        try {
            const res = await fetch('/api/school/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resetData),
            });
            const data = await res.json();
            if (data.success) {
                showToast('Password reset successfully!', 'success', 2000, () => setView('login'));
            } else {
                showToast('Password reset failed.');
            }
        } catch {
            showToast('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const resetAll = () => {
        setSelectedRole(null);
        setView('login');
        setShowLoggedIn(false);
        setCheckedSession(false);
        setFormData({ schoolId: '', email: '', password: '' });
    };

    const roleLabel = selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : '';

    return (
        <>
            {/* Logo */}
            <div className="absolute top-0 left-0 z-50 m-8">
                {/*<NavLink to="/">*/}
                    <img src={Images.main_logo} alt="EduConnect Logo" className="w-[130px] md:w-[160px]" />
                {/*</NavLink>*/}
            </div>

            {/* Toast */}
            {toast.show && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(p => ({ ...p, show: false }))} />
            )}

            {/* Background */}
            <div className="min-h-screen flex items-center justify-center p-4 bg-[#F0F2F8]">
                <img src={Images.verify_bg} alt="" className="fixed inset-0 h-full w-full object-cover z-0" />

                <div className="relative z-10 w-full max-w-[440px]">

                    {/* ── Role Selection ── */}
                    {!selectedRole && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
                                <p className="text-gray-500 text-sm mt-1.5">Select your portal to sign in</p>
                            </div>
                            <div className="space-y-3">
                                <RoleCard title="School Administrator" description="Manage staff, students, and school data" icon="🏫" onClick={() => handleRoleSelection('admin')} />
                                <RoleCard title="Teacher" description="Access classrooms, grades, and lessons" icon="📚" onClick={() => handleRoleSelection('teacher')} />
                                <RoleCard title="Parent" description="Monitor your child's progress" icon="👨‍👩‍👧" onClick={() => handleRoleSelection('parent')} />
                            </div>
                            <p className="text-center text-xs text-gray-400 font-medium uppercase tracking-widest">Secure Access Portal</p>
                        </div>
                    )}

                    {/* ── Loading ── */}
                    {selectedRole && (isLoading && !checkedSession) && (
                        <div className="flex flex-col items-center justify-center gap-4 py-16">
                            <div className="relative w-14 h-14">
                                <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
                                <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                            <p className="text-gray-400 text-sm animate-pulse">Loading...</p>
                        </div>
                    )}

                    {selectedRole && checkedSession && showLoggedIn && user && user.role === selectedRole && view !== 'confirmed' && (
                        <div className="bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden max-w-sm mx-auto">
                            <div className="flex">

                                <div className="px-6 py-8 w-full">
                                    <header className="mb-6">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 block mb-1">
                                            Authentication Verified
                                        </span>
                                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight">
                                            Welcome back,<br />
                                            <span className="text-gray-700">{user.name ?? user.fullName}</span>
                                        </h2>

                                        <p className="text-xs text-gray-500 mt-1 font-medium">
                                            Accessing <span className="text-gray-700 capitalize">{user.role} Control Panel</span>
                                        </p>
                                    </header>

                                    <div className={`flex flex-col`}>
                                        <button
                                            onClick={() => navigate(`/dashboard/${user.role}`, { replace: true })}
                                            className="inline-flex items-center justify-center px-5 py-2.5 bg-gray-900 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 rounded-sm w-full md:w-auto"
                                        >
                                            Enter Dashboard
                                        </button>

                                        <button
                                            onClick={async () => { setIsLoading(true); try { await logout(); resetAll(); } finally { setIsLoading(false); } }}
                                            className="w-full sm:w-auto px-6 py-3 bg-transparent hover:bg-gray-50 text-gray-400 hover:text-red-600 text-[13px] font-bold uppercase tracking-wider transition-all duration-200 rounded-sm"
                                        >
                                            Logout
                                        </button>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Login Form ── */}
                    {selectedRole && checkedSession && !showLoggedIn && view === 'login' && (
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="px-8 pt-8 pb-6 border-b border-gray-100">
                                <button onClick={resetAll} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-5 transition-colors group">
                                    <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back
                                </button>
                                <h2 className="text-2xl font-bold text-gray-900">{roleLabel} Sign In</h2>
                                <p className="text-gray-400 text-sm mt-1">Enter your credentials to continue</p>
                            </div>

                            <div className="px-8 py-6 space-y-4">
                                <Field label="School ID" required>
                                    <input type="text" value={formData.schoolId} onChange={e => setFormData(p => ({ ...p, schoolId: e.target.value }))} placeholder="e.g. NUM1234" className={inputCls} />
                                </Field>
                                <Field label="Email" required>
                                    <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="Enter your email address" className={inputCls} />
                                </Field>
                                <Field label="Password" required>
                                    <div className="relative">
                                        <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="Enter your password" className={inputCls + ' pr-11'} />
                                        <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </Field>

                                <div className="flex items-center justify-between pt-1 relative">
                                    <button onClick={() => setView('forgot')} className="text-sm text-blue-600 font-medium hover:underline ">
                                        Forgot password?
                                    </button>
                                </div>

                                <button onClick={handleLogin} disabled={isLoading} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors mt-2 shadow-sm shadow-blue-200">
                                    {isLoading ? 'Signing in…' : 'Sign In'}
                                </button>
                            </div>

                            <div className="px-8 pb-8 text-center">
                                <p className="text-sm text-gray-500">
                                    New to EduConnect?{' '}
                                    <NavLink to="/register/school" className="text-blue-600 font-semibold hover:underline">Create an account</NavLink>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── Post-login Confirmed ── */}
                    {selectedRole && view === 'confirmed' && user && (
                        <div className="bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden max-w-sm mx-auto">
                            <div className="flex">

                                <div className="px-6 py-8 w-full">
                                    <header className="mb-6">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 block mb-1">
                                            Authentication Verified
                                        </span>
                                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight">
                                            Welcome back,<br />
                                            <span className="text-gray-700">{user.name ?? user.fullName}</span>
                                        </h2>

                                        <p className="text-xs text-gray-500 mt-1 font-medium">
                                            Accessing <span className="text-gray-700 capitalize">{user.role} Control Panel</span>
                                        </p>
                                    </header>

                                    <div className={`flex flex-col`}>
                                        <button
                                            onClick={() => navigate(`/dashboard/${user.role}`, { replace: true })}
                                            className="inline-flex items-center justify-center px-5 py-2.5 bg-gray-900 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 rounded-sm w-full md:w-auto"
                                        >
                                            Enter Dashboard
                                        </button>

                                        <button
                                            onClick={async () => { setIsLoading(true); try { await logout(); resetAll(); } finally { setIsLoading(false); } }}
                                            className="w-full sm:w-auto px-6 py-3 bg-transparent hover:bg-gray-50 text-gray-400 hover:text-red-600 text-[13px] font-bold uppercase tracking-wider transition-all duration-200 rounded-sm"
                                        >
                                            Logout
                                        </button>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Forgot Password ── */}
                    {selectedRole && checkedSession && view === 'forgot' && (
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="px-8 pt-8 pb-6 border-b border-gray-100">
                                <button onClick={() => setView('login')} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-5 transition-colors group">
                                    <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back to sign in
                                </button>
                                <h2 className="text-2xl font-bold text-gray-900">Forgot Password?</h2>
                                <p className="text-gray-400 text-sm mt-1">We'll send a reset OTP to your email</p>
                            </div>
                            <div className="px-8 py-6 space-y-4">
                                <Field label="School ID" required>
                                    <input type="text" value={forgotData.schoolId} onChange={e => setForgotData(p => ({ ...p, schoolId: e.target.value }))} placeholder="e.g. NUM1234" className={inputCls} />
                                </Field>
                                <Field label="Email" required>
                                    <input type="email" value={forgotData.email} onChange={e => setForgotData(p => ({ ...p, email: e.target.value }))} placeholder="Enter your email address" className={inputCls} />
                                </Field>
                                <button onClick={handleForgotPassword} disabled={isLoading} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm shadow-blue-200">
                                    {isLoading ? 'Sending…' : 'Send Reset Link'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Reset Password ── */}
                    {selectedRole && checkedSession && view === 'reset' && (
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="px-8 pt-8 pb-6 border-b border-gray-100">
                                <button onClick={() => setView('forgot')} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 mb-5 transition-colors group">
                                    <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Back
                                </button>
                                <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
                                <p className="text-gray-400 text-sm mt-1">Enter the OTP sent to your email</p>
                            </div>
                            <div className="px-8 py-6 space-y-4">
                                <Field label="OTP Code" required>
                                    <input type="text" value={resetData.otp} onChange={e => setResetData(p => ({ ...p, otp: e.target.value }))} placeholder="Enter 6-digit OTP" maxLength={6} className={inputCls + ' tracking-widest text-center text-lg font-mono'} />
                                </Field>
                                <Field label="New Password" required>
                                    <div className="relative">
                                        <input type={showPassword ? 'text' : 'password'} value={resetData.newPassword} onChange={e => setResetData(p => ({ ...p, newPassword: e.target.value }))} placeholder="Enter new password" className={inputCls + ' pr-11'} />
                                        <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </Field>
                                <Field label="Confirm Password" required>
                                    <input type="password" value={resetData.confirmPassword} onChange={e => setResetData(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="Confirm new password" className={inputCls} />
                                </Field>
                                {resetData.newPassword && resetData.confirmPassword && resetData.newPassword !== resetData.confirmPassword && (
                                    <p className="text-xs text-red-500">Passwords do not match</p>
                                )}
                                <button onClick={handleResetPassword} disabled={isLoading} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm shadow-blue-200">
                                    {isLoading ? 'Resetting…' : 'Reset Password'}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}