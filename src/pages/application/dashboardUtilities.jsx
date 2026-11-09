// javascript
import React, { useState, useRef, useEffect } from 'react';
import { Bell, User, ChevronDown, LogOut, Settings, UserCircle, Moon, Sun } from 'lucide-react';
import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { Avatar } from "../../components/patterns";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger
} from "../../components/ui/alert-dialog.jsx";
import './dark-mode.css'

import { getTheme, toggleTheme } from "../../utils/theme.js";
import { getAcademicProfile } from "./AdminDashboard/timetable/timetableAPIs.js";
import { getParentDashboard, getTeacherDashboard } from "../auth/authAPIs.js";

let cachedAcademicContext = null;

export const Header = () => {
    const { user, logout } = useAuth();
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
    const [isDark, setIsDark] = useState(() => getTheme() === 'dark');
    const role = user?.role;
    const email = user?.email;
    const displayName = user?.firstName
        ? `${user.firstName} ${user.lastName ?? ''}`
        : (user?.fullName ?? 'User');

    const [academicContext, setAcademicContext] = useState(() => {
        return cachedAcademicContext || { year: 'Loading...', term: '...' };
    });
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const dropdownRef = useRef(null);


    useEffect(() => {
        function handleClickOutside(event) {
            // If the ref exists and the clicked element is NOT inside the ref
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    useEffect(() => {
        if (cachedAcademicContext) {
            return;
        }
        const fetchContext = async () => {
            try {
                let res;
                let yearName = 'No Active Year';
                let termName = 'No Active Term';

                if (role === 'parent') {
                    res = await getParentDashboard();
                    if (res.success && res.data?.school) {
                        yearName = res.data.school.currentAcademicYear?.name || 'No Active Year';
                        termName = res.data.school.currentAcademicTerm?.name || 'No Active Term';
                    }
                } else if (role === 'teacher') {
                    res = await getTeacherDashboard();
                    if (res.success && res.data?.school) {
                        yearName = res.data.school.currentAcademicYear?.name || 'No Active Year';
                        termName = res.data.school.currentAcademicTerm?.name || 'No Active Term';
                    }
                } else {
                    res = await getAcademicProfile();
                    if (res.success && res.data?.school) {
                        yearName = res.data.currentAcademicYear?.name || 'No Active Year';
                        termName = res.data.currentTerm?.name || 'No Active Term';
                    }
                }

                const ctx = {
                    year: yearName,
                    term: termName
                };
                cachedAcademicContext = ctx;
                setAcademicContext(ctx);
            } catch (err) {
                console.error('Failed to fetch academic context:', err);
                setAcademicContext({ year: 'Setup Needed', term: 'Setup Needed' });
            }
        };
        if (role) {
            fetchContext();
        }
    }, [role]);



    const handleLogout = async () => {
        cachedAcademicContext = null;
        await logout();
    };

    const handleThemeToggle = () => {
        toggleTheme();
        setIsDark(getTheme() === 'dark');
    };

    return (
        <>
            <header className="md:flex bg-white border-b border-gray-200 justify-between sticky top-0 z-30">
                {/* Academic Context Display */}

                <div className='hidden md:flex flex-col justify-center m-2 px-4 ml-20 lg:ml-0'>
                    <span className="tracking-wide capitalize font-bold text-gray-800">{academicContext.term}</span>
                    <span className="text-xs font-medium text-blue-600 uppercase">{academicContext.year}</span>
                </div>

                <div className="flex h-16 px-4 sm:px-6 lg:px-8 items-center justify-end">
                    <div className="flex items-center space-x-3 relative" ref={dropdownRef}>
                        {/* Dark Mode Toggle */}
                        <button
                            onClick={handleThemeToggle}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            aria-label="Toggle dark mode"
                        >
                            {isDark ? (
                                <Sun className="w-5 h-5 text-gray-600" />
                            ) : (
                                <Moon className="w-5 h-5 text-gray-600" />
                            )}
                        </button>

                        <div className="h-6 w-px bg-gray-200 mx-2"></div>

                        {/* Profile Trigger */}
                        <div
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className={`flex items-center px-2 py-1.5 space-x-2 cursor-pointer rounded-xl transition-all duration-150 ${isProfileOpen ? 'bg-gray-100' : 'hover:bg-gray-50'
                                }`}
                        >
                            <Avatar name={displayName} src={user?.profileImage} size={32} />
                            <div className="hidden sm:flex flex-col items-start leading-none">
                                <span className="text-sm font-bold text-gray-800">{displayName}</span>
                                <span className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">{role}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {/* Dropdown Menu */}
                        {isProfileOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50">
                                <div className="px-4 py-3 border-b border-gray-50 mb-1">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Account Details</p>
                                    <p className="text-sm font-bold text-gray-700 truncate">{email}</p>
                                </div>

                                <div className="block md:hidden px-4 py-3 border-b border-gray-50 mb-1">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Academic Calendar</p>
                                    <p className="text-sm font-bold text-gray-700 truncate">{academicContext.term}</p>
                                    <p className="text-xs font-medium text-blue-600 uppercase">{academicContext.year}</p>
                                </div>
                                <NavLink
                                    to={`/dashboard/${role}/profile`}
                                    onClick={() => setIsProfileOpen(false)}
                                    className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                >
                                    <UserCircle className="w-4 h-4 mr-3" />
                                    Account Profile
                                </NavLink>

                                <div className="h-px bg-gray-50 my-1"></div>

                                <button
                                    onClick={() => {
                                        setIsLogoutDialogOpen(true);
                                        setIsProfileOpen(false); // Close the dropdown menu
                                    }}
                                    className="flex items-center cursor-pointer w-full px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="w-4 h-4 mr-3" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* AlertDialog moved outside the conditional dropdown logic */}
            <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to logout?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleLogout}
                        >
                            Logout
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
