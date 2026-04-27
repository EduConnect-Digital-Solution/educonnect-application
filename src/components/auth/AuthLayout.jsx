// src/components/auth/AuthLayout.jsx
import React, {useEffect, useState} from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Images } from '../images.jsx';
import AOS from 'aos';
import 'aos/dist/aos.css';

const stats = [
    { value: '500+', label: 'Schools onboarded' },
    { value: '120k+', label: 'Students managed' },
    { value: '99.9%', label: 'Uptime guaranteed' },
];

export function AuthLayout() {
    useEffect(() => {
        AOS.init({ once: true, duration: 700 });
    }, []);

    const [currentIndex, setCurrentIndex] = useState(0);

// Array of images for the carousel
    const carouselImages = [
        Images.reg_image_2,
        Images.reg_image_1,
        Images.reg_image_3
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % carouselImages.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [currentIndex]);

    return (
        <div className="min-h-screen flex bg-white">

            {/* ── LEFT PANEL ──────────────────────────────────────────────── */}
            <div className="hidden xl:flex flex-col w-[52%] relative overflow-hidden  ">

                {/* Carousel Images */}
                {carouselImages.map((src, index) => (
                    <img
                        key={index}
                        src={src}
                        alt={`Slide ${index}`}
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
                            index === currentIndex ? "opacity-100" : "opacity-0"
                        }`}
                    />
                ))}

                {/* Bottom gradient fade - Keep this above the images */}
                <div className="absolute inset-0 bg-linear-to-t from-[#063d6b] via-transparent to-transparent z-1"  />

                {/* Logo */}
                <div className="relative w-auto z-10 p-10">
                    <div className="">
                        <img
                            src={`${Images.main_logo_light}`}
                            alt="EduConnect"
                            className="w-[140px]"
                        />
                    </div>
                </div>

                <div className="absolute bottom-10 left-0 right-0 z-20 flex justify-center gap-3">
                    {carouselImages.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`h-2 transition-all duration-300 rounded-full ${
                                index === currentIndex
                                    ? "w-8 bg-white"
                                    : "w-2 bg-white/40 hover:bg-white/60"
                            }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* ── RIGHT PANEL ─────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col bg-[#F4F6FB] overflow-y-auto">

                {/* Mobile logo (only visible below xl) */}
                <div className="xl:hidden px-8 pt-8 pb-2">
                    <NavLink to="/">
                        <img src={Images.main_logo} alt="EduConnect" className="w-[130px]" />
                    </NavLink>
                </div>

                {/* Centred form area */}
                <div className="flex-1 flex items-center justify-center px-6 py-12">
                    <div className="w-full max-w-[560px]">
                        <Outlet />
                    </div>
                </div>

                {/* Right-panel footer */}
                <p className="text-center text-xs text-gray-400 pb-6">
                    © {new Date().getFullYear()} EduConnect · All rights reserved
                </p>
            </div>
        </div>
    );
}