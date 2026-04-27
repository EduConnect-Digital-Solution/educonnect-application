import React, { useEffect, useRef, useState } from 'react';

import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "./ui/input-otp.jsx"
import { Images } from "./images.jsx"
import {NavLink, useNavigate} from "react-router-dom";
import {Modal} from "../pages/application/AdminDashboard/components/ui/modals.jsx";
import {resendOTP, verifyOTP} from "../pages/auth/authAPIs.js";



export const VerifySchoolModal = ({ onClose, email, showToast }) => {
    const navigate = useNavigate();
    const [verificationCode, setVerificationCode] = useState('');
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        let timer;
        if (cooldown > 0) {
            timer = setInterval(() => {
                setCooldown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

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
        try {
            await verifyOTP({email: email, otp: verificationCode});
            showToast('School verified successfully! Please proceed to login', 'success');
            onClose(); // Close modal on success
            setTimeout(() => {
                navigate('/login');
            }, 3000); // Wait 1 second before navigating
        } catch (err) {
            const message = err?.message || err?.error || 'Verification failed';
            showToast(message, 'error');
        }
    };


    return (
        <Modal  onClose={onClose} onSubmit={handleSubmit}>
            <div className="text-center mb-8">
                <NavLink to={`/`}>
                    <img
                        src={`${Images.main_logo}`}
                        alt="EduConnect Logo Icon"
                        className="w-[120px] md:w-[170px] "
                    />
                </NavLink>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Verify Your School
                </h2>
                <p className="text-gray-600">
                    We sent a 6-digit verification code to <span className="font-semibold">{email}</span>. Please enter the code below.
                </p>
            </div>

            <div className="mb-6 mx-auto w-auto items-center content-center justify-center">
                <InputOTP
                    id="otp-input"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(value) => setVerificationCode(value)}
                >
                    <InputOTPGroup className={`mx-auto items-center content-center justify-center`}>
                        <InputOTPSlot className={`p-5`} index={0} />
                        <InputOTPSlot className={`p-5`} index={1} />
                        <InputOTPSlot className={`p-5`} index={2} />
                        <InputOTPSlot className={`p-5`} index={3} />
                        <InputOTPSlot className={`p-5`} index={4} />
                        <InputOTPSlot className={`p-5`} index={5} />
                    </InputOTPGroup>
                </InputOTP>
            </div>

            <p className="text-center text-sm text-gray-600 mt-6">
                Didn't receive the code?{" "}
                <button
                    onClick={handleResend}
                    disabled={cooldown > 0}
                    className={`font-semibold hover:underline ${
                        cooldown > 0
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-[#0A61A4] cursor-pointer"
                    }`}
                >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
                </button>
            </p>
        </Modal>
    );
};