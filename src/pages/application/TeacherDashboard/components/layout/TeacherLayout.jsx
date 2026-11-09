import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, LogOut, Menu, X, GraduationCap, User,
    ClipboardCheck, ClipboardList, BookOpen, ChevronDown, ChevronLeft, ChevronRight, School
} from 'lucide-react';
import { Header } from '../../../dashboardUtilities.jsx';
import { useAuth } from '../../../../../contexts/AuthContext.jsx';
import { Images } from '../../../../../components/images.jsx';
import { getMyPolicyPermission } from '../../services/teacherPoliciesAPIs.js';
import { ToastHost } from '../../../../../components/patterns';

const OPEN_GROUPS_KEY = 'educonnect-teacher-nav-open';
const COLLAPSED_KEY   = 'teacher-sidebar-collapsed';

/* ─── Nav list (shared by desktop sidebar and mobile drawer) ───────────────── */
const NavList = ({ collapsed, onNavigate, hasPolicyPermission }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const baseNavItems = [
        { name: 'Dashboard',    icon: LayoutDashboard, link: '/dashboard/teacher', exact: true },
        { name: 'My Classes',   icon: GraduationCap,   link: '/dashboard/teacher/classes' },
        { name: 'Attendance',   icon: ClipboardCheck,  link: '/dashboard/teacher/attendance' },
        { name: 'Score Entry',  icon: ClipboardList,   link: '/dashboard/teacher/score-entry' },
        { name: 'User Profile', icon: User,            link: '/dashboard/teacher/profile' },
    ];

    const navItems = hasPolicyPermission
        ? [
            ...baseNavItems.slice(0, 4),
            { name: 'Assessment Policies', icon: BookOpen, link: '/dashboard/teacher/assessment-policies' },
            ...baseNavItems.slice(4),
          ]
        : baseNavItems;

    return (
        <nav className="space-y-0.5">
            {navItems.map(item => {
                const isActive = item.exact
                    ? location.pathname === item.link
                    : location.pathname.startsWith(item.link);

                return (
                    <div key={item.name}>
                        <button
                            onClick={() => {
                                onNavigate?.();
                                navigate(item.link);
                            }}
                            className={`w-full flex items-center ${collapsed && !onNavigate ? 'justify-center px-1' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm transition-all duration-150 ${
                                isActive
                                    ? 'bg-blue-50 text-blue-700 font-semibold'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                            title={collapsed && !onNavigate ? item.name : undefined}
                        >
                            <item.icon className="w-[18px] h-[18px] shrink-0" />
                            {(!collapsed || onNavigate) && <span className="flex-1 text-left">{item.name}</span>}
                        </button>
                    </div>
                );
            })}
        </nav>
    );
};

/* ─── Pinned bottom: school branding ────────────────────────────── */
const SidebarFooter = ({ collapsed, onNavigate }) => {
    const { user } = useAuth();
    // Assuming we don't have schoolBrand loaded globally for teachers, fallback to standard icon
    const schoolName = 'Your school';
    const initials = 'YS';

    return (
        <div className="shrink-0 border-t border-gray-100 px-3 py-3 space-y-1.5">
            <div className={`flex items-center ${collapsed && !onNavigate ? 'justify-center' : 'gap-2.5 px-2'} py-1.5`}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm">
                    {initials || <School size={14} />}
                </div>
                {(!collapsed || onNavigate) && (
                    <div className="min-w-0">
                        <p className="text-[13px] font-bold text-gray-800 truncate leading-tight">{schoolName}</p>
                        <p className="text-[10px] font-semibold text-gray-400 truncate uppercase tracking-wide">
                            {user?.schoolId || 'Teacher'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ─── Sidebar shell ──────────── */
const SidebarShell = ({ collapsed, setCollapsed, onNavigate, hasPolicyPermission }) => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const update = () => setIsDark(document.documentElement.dataset.theme === 'dark');
        update();
        window.addEventListener('themeChange', update);
        return () => window.removeEventListener('themeChange', update);
    }, []);

    const logoSrc = isDark ? Images.main_logo_light : Images.main_logo;

    return (
        <div className="flex flex-col h-full">
            {/* Product logo */}
            <div className={`flex items-center h-14 border-b border-gray-100 shrink-0 ${collapsed && !onNavigate ? 'justify-center px-2' : 'justify-between px-5'}`}>
                {(!collapsed || onNavigate) ? (
                    <img src={logoSrc} alt="EduConnect" className="w-30 max-w-[120px] transition-opacity duration-300" />
                ) : (
                    <img src={Images.logo} alt="EduConnect" className="w-7 transition-opacity duration-300" />
                )}
                {!onNavigate && (
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                )}
            </div>

            {/* Nav */}
            <div className="flex-1 overflow-y-auto py-3 px-3">
                <NavList collapsed={collapsed} onNavigate={onNavigate} hasPolicyPermission={hasPolicyPermission} />
            </div>

            <SidebarFooter collapsed={collapsed} onNavigate={onNavigate} />
        </div>
    );
};

const TeacherLayout = ({ children, className = '' }) => {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true');
    const [hasPolicyPermission, setHasPolicyPermission] = useState(false);

    useEffect(() => { localStorage.setItem(COLLAPSED_KEY, collapsed); }, [collapsed]);
    useEffect(() => { setMobileOpen(false); }, [location]);

    useEffect(() => {
        getMyPolicyPermission()
            .then(res => setHasPolicyPermission(res.data?.granted === true))
            .catch(() => {});
    }, []);

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Mobile backdrop */}
            {mobileOpen && (
                <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
            )}

            {/* Mobile drawer */}
            <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <button
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-3.5 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 z-10"
                >
                    <X className="w-5 h-5" />
                </button>
                <SidebarShell collapsed={false} setCollapsed={() => {}} onNavigate={() => setMobileOpen(false)} hasPolicyPermission={hasPolicyPermission} />
            </div>

            {/* Desktop sidebar */}
            <aside className={`hidden lg:flex flex-col shrink-0 bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-64'}`}>
                <SidebarShell collapsed={collapsed} setCollapsed={setCollapsed} hasPolicyPermission={hasPolicyPermission} />
            </aside>

            {/* Main column */}
            <div className="flex-1 flex flex-col min-w-0">
                <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                     <button
                        onClick={() => setMobileOpen(true)}
                        className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                     >
                         <Menu size={18} />
                     </button>
                </div>
                <Header />
                <main className={`flex-1 p-2 md:p-4 ${className}`}>
                    {children}
                </main>
            </div>

            <ToastHost />
        </div>
    );
};

export default TeacherLayout;
