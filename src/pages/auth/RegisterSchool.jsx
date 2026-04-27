// src/pages/auth/RegisterSchool.jsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {Eye, EyeOff, ArrowLeft, ArrowRight, Check, Home} from 'lucide-react';
import { RegSchool } from './authAPIs.js';
import { Toast } from '../application/AdminDashboard/components/ui/Toast.jsx';
import { VerifySchoolModal } from '../../components/modals.jsx';

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputCls =
    'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#0A61A4] focus:border-transparent transition-all';

// ─── Field wrapper ────────────────────────────────────────────────────────────
const Field = ({ label, required, hint, children }) => (
    <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
            {hint && <span className="text-xs text-gray-400 font-normal ml-1">({hint})</span>}
        </label>
        {children}
    </div>
);

// ─── Password strength ────────────────────────────────────────────────────────
const getStrength = (pw) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[!@#$%^&*]/.test(pw)) s++;
    return s;
};
const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
const strengthText  = ['', 'text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600'];

// ─── Steps ───────────────────────────────────────────────────────────────────
const STEPS = [
    { id: 1, label: 'School Info' },
    { id: 2, label: 'Location' },
    { id: 3, label: 'Your Account' },
];

// ─── Nigerian states ──────────────────────────────────────────────────────────
const NG_STATES = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
    'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
    'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
    'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
    'Yobe','Zamfara',
];

// ─── Component ────────────────────────────────────────────────────────────────
export function RegisterSchool() {
    const [step, setStep]           = useState(1);
    const [direction, setDirection] = useState('forward');
    const [animating, setAnimating] = useState(false);
    const [loading, setLoading]     = useState(false);
    const [showPw, setShowPw]       = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [verEmail, setVerEmail]   = useState('');
    const [toast, setToast]         = useState({ show: false, message: '', type: 'error' });

    const [schoolData, setSchoolData]     = useState({ schoolName: '', website: '', phone: '', description: '' });
    const [locationData, setLocationData] = useState({ address: '', city: '', state: '' });
    const [adminData, setAdminData]       = useState({ adminFirstName: '', adminLastName: '', adminEmail: '', password: '' });

    const showToast = (msg, type = 'error', ms = 3000, cb = null) => {
        setToast({ show: true, message: msg, type });
        setTimeout(() => { setToast(p => ({ ...p, show: false })); cb?.(); }, ms);
    };

    // ── Validation ────────────────────────────────────────────────────────────
    const validate = (s) => {
        const urlPat   = /^(?:https?:\/\/)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_+.~#?&/=]*$/;
        const phonePat = /^(\+234|0)[789][01]\d{8}$/;
        const emailPat = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (s === 1) {
            if (!schoolData.schoolName.trim() || schoolData.schoolName.trim().length < 5) return 'School name must be at least 5 characters.';
            if (schoolData.website?.trim() && !urlPat.test(schoolData.website)) return 'Please enter a valid website URL.';
            if (!schoolData.phone || !phonePat.test(schoolData.phone)) return 'Please enter a valid Nigerian phone number.';
        }
        if (s === 2) {
            if (!locationData.address.trim()) return 'Street address is required.';
            if (!locationData.city.trim()) return 'City / LGA is required.';
            if (!locationData.state.trim()) return 'State is required.';
        }
        if (s === 3) {
            if (!adminData.adminFirstName.trim()) return 'First name is required.';
            if (!adminData.adminLastName.trim()) return 'Last name is required.';
            if (!adminData.adminEmail || !emailPat.test(adminData.adminEmail)) return 'Please enter a valid email address.';
            const pw = adminData.password;
            if (!pw) return 'Password is required.';
            if (pw.length < 8) return 'Password must be at least 8 characters.';
            if (!/[A-Z]/.test(pw)) return 'Password needs at least one uppercase letter.';
            if (!/[0-9]/.test(pw)) return 'Password needs at least one number.';
            if (!/[!@#$%^&*]/.test(pw)) return 'Password needs at least one special character.';
        }
        return null;
    };

    // ── Navigation ────────────────────────────────────────────────────────────
    const goTo = (next, dir) => {
        if (animating) return;
        setDirection(dir);
        setAnimating(true);
        setTimeout(() => { setStep(next); setAnimating(false); }, 220);
    };
    const handleNext = () => { const e = validate(step); if (e) return showToast(e); if (step < 3) goTo(step + 1, 'forward'); };
    const handleBack = () => { if (step > 1) goTo(step - 1, 'back'); };

    // ── Submit ────────────────────────────────────────────────────────────────
    const formatWebsite = (url) => {
        if (!url) return null;
        const c = url.trim().toLowerCase();
        return /^https?:\/\//i.test(c) ? c : `https://${c}`;
    };

    const handleSubmit = async () => {
        const e = validate(3);
        if (e) return showToast(e);
        const payload = {
            schoolName:     schoolData.schoolName.trim(),
            phone:          schoolData.phone.trim(),
            address:        `${locationData.address.trim()}, ${locationData.city.trim()}, ${locationData.state.trim()}`,
            adminFirstName: adminData.adminFirstName.trim(),
            adminLastName:  adminData.adminLastName.trim(),
            email:          adminData.adminEmail.trim().toLowerCase(),
            password:       adminData.password,
        };
        if (schoolData.website?.trim())     payload.website     = formatWebsite(schoolData.website);
        if (schoolData.description?.trim()) payload.description = schoolData.description.trim();

        setLoading(true);
        try {
            await RegSchool(payload);
            setVerEmail(payload.email);
            setShowModal(true);
        } catch (err) {
            showToast(err?.message || err?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const slideClass = animating
        ? direction === 'forward' ? 'opacity-0 translate-x-6' : 'opacity-0 -translate-x-6'
        : 'opacity-100 translate-x-0';

    const pwStrength = getStrength(adminData.password);

    return (
        <>
            {toast.show && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(p => ({ ...p, show: false }))} />
            )}

            <div className="mb-6">
                <NavLink
                    to="/"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group"
                >
                    <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-brand/10 transition-colors">
                        <Home size={14} />
                    </div>
                    Back to Home
                </NavLink>
            </div>

            {/* ── Progress stepper ── */}
            <div className="mb-7">
                <div className="h-[3px] w-full bg-gray-200 rounded-full overflow-hidden mb-5">
                    <div
                        className="h-full bg-[#0A61A4] rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
                    />
                </div>
                <div className="flex justify-between">
                    {STEPS.map((s) => (
                        <div key={s.id} className="flex flex-col items-center gap-1.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                step > s.id  ? 'bg-[#0A61A4] text-white' :
                                    step === s.id ? 'bg-[#0A61A4] text-white ring-[3px] ring-[#0A61A4]/20' :
                                        'bg-white border-2 border-gray-200 text-gray-400'
                            }`}>
                                {step > s.id ? <Check size={13} strokeWidth={3} /> : s.id}
                            </div>
                            <span className={`text-xs font-medium ${step >= s.id ? 'text-gray-700' : 'text-gray-400'}`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Card ── */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

                <div
                    className={`px-7 py-7 transition-all ease-in-out ${slideClass}`}
                    style={{ transition: 'opacity 0.22s ease, transform 0.22s ease' }}
                >
                    {/* ── Step 1 ───────────────────────────────────────────── */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Tell us about your school</h2>
                                <p className="text-sm text-gray-400 mt-0.5">Basic information about your institution</p>
                            </div>
                            <Field label="School Name" required>
                                <input type="text" value={schoolData.schoolName}
                                       onChange={e => setSchoolData(p => ({ ...p, schoolName: e.target.value }))}
                                       placeholder="e.g. Greenfield Academy" className={inputCls} />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Website" hint="optional">
                                    <input type="text" value={schoolData.website}
                                           onChange={e => setSchoolData(p => ({ ...p, website: e.target.value }))}
                                           placeholder="www.school.edu.ng" className={inputCls} />
                                </Field>
                                <Field label="Phone Number" required>
                                    <input type="tel" value={schoolData.phone}
                                           onChange={e => setSchoolData(p => ({ ...p, phone: e.target.value }))}
                                           placeholder="08012345678" className={inputCls} />
                                </Field>
                            </div>
                            <Field label="Short Description" hint="optional">
                                <textarea value={schoolData.description}
                                          onChange={e => setSchoolData(p => ({ ...p, description: e.target.value }))}
                                          placeholder="A brief overview of your school…"
                                          rows={3} maxLength={200}
                                          className={inputCls + ' resize-none'} />
                                <p className="text-right text-xs text-gray-400 -mt-1">{schoolData.description.length}/200</p>
                            </Field>
                        </div>
                    )}

                    {/* ── Step 2 ───────────────────────────────────────────── */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Where is your school located?</h2>
                                <p className="text-sm text-gray-400 mt-0.5">Your school's physical address</p>
                            </div>
                            <Field label="Street Address" required>
                                <input type="text" value={locationData.address}
                                       onChange={e => setLocationData(p => ({ ...p, address: e.target.value }))}
                                       placeholder="12 Adetokunbo Ademola Street" className={inputCls} />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="City / LGA" required>
                                    <input type="text" value={locationData.city}
                                           onChange={e => setLocationData(p => ({ ...p, city: e.target.value }))}
                                           placeholder="Ikeja" className={inputCls} />
                                </Field>
                                <Field label="State" required>
                                    <select value={locationData.state}
                                            onChange={e => setLocationData(p => ({ ...p, state: e.target.value }))}
                                            className={inputCls + ' cursor-pointer'}>
                                        <option value="">Select state</option>
                                        {NG_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3 ───────────────────────────────────────────── */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Create your admin account</h2>
                                <p className="text-sm text-gray-400 mt-0.5">You'll use these credentials to sign in</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="First Name" required>
                                    <input type="text" value={adminData.adminFirstName}
                                           onChange={e => setAdminData(p => ({ ...p, adminFirstName: e.target.value }))}
                                           placeholder="John" className={inputCls} />
                                </Field>
                                <Field label="Last Name" required>
                                    <input type="text" value={adminData.adminLastName}
                                           onChange={e => setAdminData(p => ({ ...p, adminLastName: e.target.value }))}
                                           placeholder="Doe" className={inputCls} />
                                </Field>
                            </div>
                            <Field label="Email Address" required>
                                <input type="email" value={adminData.adminEmail}
                                       onChange={e => setAdminData(p => ({ ...p, adminEmail: e.target.value }))}
                                       placeholder="admin@school.edu.ng" className={inputCls} />
                            </Field>
                            <Field label="Password" required>
                                <div className="relative">
                                    <input type={showPw ? 'text' : 'password'} value={adminData.password}
                                           onChange={e => setAdminData(p => ({ ...p, password: e.target.value }))}
                                           placeholder="Create a strong password"
                                           className={inputCls + ' pr-11'} />
                                    <button type="button" onClick={() => setShowPw(p => !p)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {adminData.password && (
                                    <div className="mt-2 space-y-1">
                                        <div className="flex gap-1">
                                            {[1,2,3,4].map(i => (
                                                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= pwStrength ? strengthColor[pwStrength] : 'bg-gray-200'}`} />
                                            ))}
                                        </div>
                                        <p className={`text-xs font-medium ${strengthText[pwStrength]}`}>{strengthLabel[pwStrength]} password</p>
                                    </div>
                                )}
                                <p className="text-xs text-gray-400 mt-1">Min 8 chars · uppercase · number · special character</p>
                            </Field>
                        </div>
                    )}

                    {/* ── Navigation ───────────────────────────────────────── */}
                    <div className={`mt-7 flex gap-3 ${step === 1 ? 'justify-end' : 'justify-between'}`}>
                        {step > 1 && (
                            <button onClick={handleBack}
                                    className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                                <ArrowLeft size={14} /> Back
                            </button>
                        )}
                        {step < 3 ? (
                            <button onClick={handleNext}
                                    className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-white bg-[#0A61A4] hover:bg-[#085490] rounded-xl transition-colors shadow-sm ml-auto">
                                Continue <ArrowRight size={14} />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={loading}
                                    className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold text-white bg-[#0A61A4] hover:bg-[#085490] disabled:opacity-60 rounded-xl transition-colors shadow-sm ml-auto">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                        </svg>
                                        Creating account…
                                    </>
                                ) : (
                                    <>Create My Account <Check size={14} /></>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <div className="mt-5 text-center space-y-2">
                <p className="text-sm text-gray-500">
                    Already registered?{' '}
                    <NavLink to="/login" className="text-[#0A61A4] font-semibold hover:underline">Sign in</NavLink>
                </p>
                {step === 3 && (
                    <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                        By creating an account you agree to EduConnect's{' '}
                        <NavLink to="/terms" className="text-[#0A61A4] hover:underline">Terms of Service</NavLink>
                        {' '}and{' '}
                        <NavLink to="/privacy" className="text-[#0A61A4] hover:underline">Privacy Policy</NavLink>
                    </p>
                )}
            </div>

            {showModal && (
                <VerifySchoolModal onClose={() => setShowModal(false)} email={verEmail} showToast={showToast} />
            )}
        </>
    );
}