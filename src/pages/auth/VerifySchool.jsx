import { notify } from '@/components/patterns/toastBus.js';
import LoaderIcon from '@/components/brand/LoaderIcon.jsx';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, NavLink } from 'react-router-dom';
import { Check, Home } from 'lucide-react';

import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "../../components/ui/input-otp.jsx";
import { Images } from "../../components/images.jsx";
import { resendOTP, verifyOTP } from "./authAPIs.js";

export function VerifySchool() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email');
    
    const [verificationCode, setVerificationCode] = useState('');
    const [cooldown, setCooldown] = useState(0);
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

    const showToast = (message, type = 'error', duration, onClose = null) => notify(message, type, duration, onClose);

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
                            className="flex items-center justify-center gap-1.5 w-full max-w-xs px-6 py-3.5 text-sm font-semibold text-white bg-[#002684] hover:bg-[#085490] disabled:opacity-60 rounded-xl transition-colors shadow-sm"
                        >
                            {loading ? (
                                <>
                                    <LoaderIcon size={16} className="text-white" />
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
                                        : "text-[#002684] hover:underline"
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
