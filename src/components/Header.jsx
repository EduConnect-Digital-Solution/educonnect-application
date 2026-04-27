import React, {useCallback, useEffect, useState} from 'react';
import {NavLink, useNavigate, useLocation} from "react-router-dom";
import {Images} from "./images.jsx";
import {Icons} from "./icons.jsx";
import {navItems} from "../utils/imports.jsx";
import {useAuth} from "../contexts/AuthContext.jsx";
import {ChevronDown} from 'lucide-react';
import {Phone} from "lucide-react";
import ScheduleButton from "./ScheduleButton.jsx";

// TODO: make header floating with dynamic stickyness when scroll

export const Header = () => {
    const [openDropdown, setOpenDropdown] = useState(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const mapNavKeytoID = useCallback((key) => {
        switch (key) {
            case 'home': return 'home';
            case 'about': return 'about';
            case 'services': return 'services';
            case 'resources': return 'resources';
            case 'faqs': return 'faqs';
        }
    }, []);

    const smoothScrollTo = useCallback((targetId) => {
        const el = document.getElementById(targetId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (targetId === 'home') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    const handleNavClick = useCallback((itemKey) => {
        const id = mapNavKeytoID(itemKey);
        if (location.pathname === '/') {
            smoothScrollTo(id);
        } else {
            navigate(`/#${id}`);
        }
        setMobileOpen(false);
    }, [mapNavKeytoID, smoothScrollTo, location.pathname, navigate]);

    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const { checkAuthStatus, user } = useAuth();

    const getDashboardRoute = (u) => {
        if (!u) return '/';
        // adjust this to match your user payload (e.g., role, isAdmin, school)
        if (u.role === 'admin') return '/dashboard/admin';
        if (u.role === 'teacher') return '/dashboard/teacher';
        if (u.role === 'parent') return '/dashboard/parent';
        // if (u.schoolId || u.school) return '/school/dashboard';
        return '/dashboard';
    };

    const handleClick = async () => {
        // Try to rehydrate session from httpOnly cookie if needed
        const hasSession = await checkAuthStatus();
        if (hasSession) {
            navigate(getDashboardRoute(user));
        } else {
            navigate('/login'); // or your login route
        }
    };

    return (
        <>
            <nav className={`py-5 sticky top-0 z-40 shadow-md bg-white px-6 md:px-12 flex items-center justify-between`}>

                {/* Logo */}
                <div className="flex items-center space-x-2">
                    {/* Logo Icon Placeholder */}
                    <NavLink to={`/`}>
                        <img
                            src={`${Images.main_logo}`} // Placeholder for the book icon
                            alt="EduConnect Logo Icon"
                            className="w-[120px] md:w-[170px] md:ml-14"
                        />
                    </NavLink>

                </div>

                {/* Navigation Links (Hidden on small screens, shown on medium and up) */}
                <div className="hidden md:flex space-x-8">
                    {navItems.map((item) => (
                    <div
                        key={item.label}
                        className="relative "
                        onMouseEnter={() => item.hasDropdown && setOpenDropdown(item.label)}
                        onMouseLeave={() => setOpenDropdown(null)}
                    >
                        <button onClick={() => handleNavClick(item.key)} className="flex hover:cursor-pointer items-center gap-1 text-gray-700 hover:text-teal-700 transition-colors">
                            {item.label}
                            {item.hasDropdown && <ChevronDown size={16} />}
                        </button>
                    </div>
                    ))}
                    <NavLink to="/pricing" className="flex hover:cursor-pointer items-center gap-1 text-gray-700 hover:text-teal-700 transition-colors">
                        Pricing
                    </NavLink>
                    <NavLink to="/contact" className="flex hover:cursor-pointer items-center gap-1 text-gray-700 hover:text-teal-700 transition-colors">
                        Contact
                    </NavLink>
                </div>

                {/* Action Buttons */}
                <div className=" flex space-x-4">
                    <NavLink to={`/login`}>
                        <button
                            // onClick={handleClick}
                            className="px-5 py-2 hidden md:flex bg-[#104889] text-white rounded-md hover:bg-[#FEC11B] hover:text-black transition duration-150">
                            Log in
                        </button>
                    </NavLink>

                    <NavLink to={`/register`}>
                    <button className="px-2 py-2 hidden md:flex border border-gray-300 text-gray-800 rounded-md hover:bg-gray-100 transition duration-150">
                        <span className={``}>Get Started</span>
                    </button>
                    </NavLink>

                    <NavLink to={`/register`}>

                        <button className="px-3 py-2 md:hidden bg-[#104889] text-white rounded-2xl hover:bg-[#FEC11B] hover:text-black transition duration-150">
                            Get Started
                        </button>
                    </NavLink>

                    <div className="md:hidden items-center justify-center my-auto">
                        <button
                            onClick={() => setMobileOpen(v => !v)}
                            className="rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none">
                            {!mobileOpen ? (
                                <img
                                    src={`${Icons.hamburger}`} // Placeholder for the book icon
                                    alt="EduConnect Logo Icon"
                                    className="md:hidden w-6 h-6 mt-1"
                                />
                            ) : (
                                <img
                                    src={`${Icons.main_close}`} // Placeholder for the book icon
                                    alt="EduConnect Logo Icon"
                                    className="md:hidden w-6 h-6 mt-1"
                                />
                            )}
                        </button>
                    </div>
                </div>

            </nav>
            {mobileOpen && (
                <div className="fixed mt-18 md:hidden inset-0 z-50 bg-white/95 backdrop-blur-sm px-6 py-10 overflow-y-auto">
                    <div className="max-w-7xl mx-auto">
                        <nav className="flex flex-col gap-4">
                            {navItems.map((item) => (
                                <button key={item.key} className="text-lg text-gray-800 text-left py-3 border-b border-gray-100" onClick={() => handleNavClick(item.key)}>
                                    {item.label}
                                </button>
                            ))}
                            <NavLink to="/pricing" className="text-lg text-gray-800 text-left py-3 border-b border-gray-100">
                                Pricing
                            </NavLink>
                            <NavLink to="/contact" className="text-lg text-gray-800 text-left py-3 border-b border-gray-100">
                                Contact
                            </NavLink>
                        </nav>
                    </div>
                    <div className={`absolute border-t border-gray-300 bottom-0 w-full mx-auto justify-center content-center left-0 h-auto px-4 pb-4`}>
                        <div className={`flex flex-col mx-auto items-center`}>
                            <button id="open-popup-button" className="mt-4 bg-[#104889] text-white text-center w-full px-4 py-2 rounded-full flex gap-3 items-center justify-center">
                                Book Consultation <Phone className={`w-5 h-5`} />
                            </button>

                            <NavLink to={`/login`} className="mt-4 text-black px-4 py-2 rounded-full w-fit">
                                Log in
                            </NavLink>
                        </div>
                    </div>
                </div>
            )}

        </>
    )
}