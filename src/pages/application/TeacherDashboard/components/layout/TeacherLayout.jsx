import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    LogOut,
    Menu,
    School,
    Settings,
    Users,
    X,
    GraduationCap, User
} from 'lucide-react';
import { Header } from '../../../dashboardUtilities.jsx';
import { useAuth } from '../../../../../contexts/AuthContext.jsx';
import {Images} from "../../../../../components/images.jsx";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger
} from "../../../../../components/ui/alert-dialog.jsx";

export const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const { logout } = useAuth();

    useEffect(() => {
        setIsOpen(false);
    }, [location]);

    const handleLogout = async () => {
        await logout();
    };

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, link: '/dashboard/teacher' },
        { name: 'My Classes', icon: GraduationCap, link: '/dashboard/teacher/classes', label: '' },
        { name: 'User Profile', icon: User, link: '/dashboard/teacher/profile' },
    ];

    return (
        <>
            {/* Mobile Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-md"
                >
                    <Menu className="w-6 h-6 text-gray-600" />
                </button>
            )}

            {/* Backdrop Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 
                    flex flex-col h-screen transition-transform duration-300 ease-in-out
                    lg:translate-x-0 lg:sticky lg:top-0
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}>

                <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 shrink-0">
                    {/*<NavLink to="/" className="flex items-center">*/}
                        <img src={`${Images.main_logo}`} alt="Logo" className="w-32" />
                    {/*</NavLink>*/}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden text-gray-500 hover:text-gray-600 p-2"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pt-6 px-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
                        Menu
                    </p>
                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.link}
                                end={item.name === 'Dashboard'}
                                className={({ isActive }) =>
                                    `flex items-center p-3 rounded-lg transition duration-150 ${
                                        isActive
                                            ? 'bg-blue-50 text-blue-600 font-semibold'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5 mr-3" />
                                <span className="flex-1 text-sm">{item.name}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className="p-4 border-t border-gray-200 shrink-0 relative z-60">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <button
                                className="flex items-center cursor-pointer w-full p-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition duration-150"
                            >
                                <LogOut className="w-5 h-5 mr-3" />
                                Logout
                            </button>
                        </AlertDialogTrigger>
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
                                    className={` bg-red-600`}
                                    onClick={handleLogout}
                                >Logout</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </>
    );
}


const TeacherLayout = ({ children }) => {
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Header handleLogout={handleLogout} />
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default TeacherLayout;
