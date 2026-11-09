import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, NavLink } from 'react-router-dom';
import { Check, ArrowLeft, Home } from 'lucide-react';

import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "../../components/ui/input-otp.jsx";
import { Images } from "../../components/images.jsx";
import { resendOTP, verifyOTP } from "./authAPIs.js";
import { Toast } from '../application/AdminDashboard/components/ui/Toast.jsx';

export function VerifySchool() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email');
    
    const [verificationCode, setVerificationCode] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [toast, setToast] = useState({ show: false, message: '', type: 'error' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!email) {
            navigate('/register/school'); // Redirect if no email is provided
        }
    }, [email, navigate]);

    useEffect(() => {
        let timer;
        if (cooldown > 0) {
            timer = setInterval(() => {
                setCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    const showToast = (message, type = 'error', duration = 3000, onClose = null) => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast(p => ({ ...p, show: false }));
            if (onClose) onClose();
        }, duration);
    };

    const handleResend = async () => {
        if (cooldown > 0) return;
        try {
            await resendOTP({ email });
            showToast('Verification code resent!', 'success');
            setCooldown(59);
        } catch (error) {
            showToast(error.message || 'Failed to resend code.', 'error');
        }
    };

    const handleSubmit = async () => {
        if (verificationCode.length !== 6) {
            return showToast('Please enter the 6-digit verification code.', 'error');
        }

        setLoading(true);
        try {
            await verifyOTP({ email: email, otp: verificationCode });
            showToast('School verified successfully! Redirecting...', 'success');
            setTimeout(() => {
                navigate('/');
            }, 3000);
        } catch (err) {
            const message = err?.message || err?.error || 'Verification failed';
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {toast.show && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(p => ({ ...p, show: false }))} />
            )}

            <div className="mb-6">
                <NavLink
                    to="/"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors group"
                >
                    <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-blue-50 transition-colors">
                        <Home size={14} />
                    </div>
                    Back to Home
                </NavLink>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-7 py-10">
                    <div className="text-center mb-8">
                        <NavLink to={`/`} className="inline-block mb-4">
                            <img
                                src={Images.main_logo}
                                alt="EduConnect Logo Icon"
                                className="w-[120px] md:w-[150px] mx-auto"
                            />
                        </NavLink>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Verify Your School
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            We sent a 6-digit verification code to <br/>
                            <span className="font-semibold text-gray-900">{email}</span>. <br/>
                            Please enter the code below.
                        </p>
                    </div>

                    <div className="mb-8 flex justify-center">
                        <InputOTP
                            id="otp-input"
                            maxLength={6}
                            value={verificationCode}
                            onChange={(value) => setVerificationCode(value)}
                        >
                            <InputOTPGroup>
                                <InputOTPSlot className="p-5 w-12 h-14 text-lg" index={0} />
                                <InputOTPSlot className="p-5 w-12 h-14 text-lg" index={1} />
                                <InputOTPSlot className="p-5 w-12 h-14 text-lg" index={2} />
                                <InputOTPSlot className="p-5 w-12 h-14 text-lg" index={3} />
                                <InputOTPSlot className="p-5 w-12 h-14 text-lg" index={4} />
                                <InputOTPSlot className="p-5 w-12 h-14 text-lg" index={5} />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <button
                            onClick={handleSubmit}
                            disabled={loading || verificationCode.length !== 6}
                            className="flex items-center justify-center gap-1.5 w-full max-w-xs px-6 py-3.5 text-sm font-semibold text-white bg-[#0A61A4] hover:bg-[#085490] disabled:opacity-60 rounded-xl transition-colors shadow-sm"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                    </svg>
                                    Verifying…
                                </>
                            ) : (
                                <>Verify Account <Check size={16} /></>
                            )}
                        </button>

                        <p className="text-center text-sm text-gray-500">
                            Didn't receive the code?{" "}
                            <button
                                onClick={handleResend}
                                disabled={cooldown > 0}
                                className={`font-semibold transition-colors ${
                                    cooldown > 0
                                        ? "text-gray-400 cursor-not-allowed"
                                        : "text-[#0A61A4] hover:underline"
                                }`}
                            >
                                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
