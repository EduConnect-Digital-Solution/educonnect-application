import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { X, ChevronDown, ChevronLeft, ChevronRight, School } from 'lucide-react';
import { useAuth } from '../../../../../contexts/AuthContext.jsx';
import { Images } from '../../../../../components/images.jsx';
import { NAV_GROUPS, SETTINGS_NAV } from '../../navigation/navConfig.js';
import Topbar from '../topbar/Topbar.jsx';
import useSchoolBrand from '../../hooks/useSchoolBrand.js';
import { ToastHost } from '../../../../../components/patterns';

/**
 * AdminLayout — the application shell for every admin page.
 *
 * Structure:
 *   • Sidebar (desktop sticky / mobile drawer) — job-to-be-done navigation,
 *     Settings pinned to the bottom beneath the school's branding block.
 *   • Topbar — global search (⌘K), academic scope, setup progress,
 *     approvals, notifications, profile.
 */

const OPEN_GROUPS_KEY = 'educonnect-admin-nav-open';
const COLLAPSED_KEY   = 'admin-sidebar-collapsed';

/* ─── Nav list (shared by desktop sidebar and mobile drawer) ───────────────── */
const NavList = ({ collapsed, onNavigate }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const [openGroups, setOpenGroups] = useState(() => {
        try { return JSON.parse(localStorage.getItem(OPEN_GROUPS_KEY)) ?? {}; } catch { return {}; }
    });

    // Auto-open the group containing the current route
    useEffect(() => {
        NAV_GROUPS.forEach(group => {
            if (group.children && location.pathname.startsWith(group.base)) {
                setOpenGroups(prev => (prev[group.name] ? prev : { ...prev, [group.name]: true }));
            }
        });
    }, [location.pathname]);

    useEffect(() => {
        localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(openGroups));
    }, [openGroups]);

    const toggleGroup = (name) => setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }));

    return (
        <nav className="space-y-0.5">
            {NAV_GROUPS.map(group => {
                const hasChildren = !!group.children;
                const isOpen = openGroups[group.name] || false;
                const isActive = hasChildren
                    ? location.pathname.startsWith(group.base)
                    : group.exact
                        ? location.pathname === group.link
                        : location.pathname.startsWith(group.link);

                return (
                    <div key={group.name}>
                        <button
                            onClick={() => {
                                if (hasChildren) {
                                    if (collapsed && !onNavigate) {
                                        // Expanding a group from the icon rail re-expands the sidebar
                                        localStorage.setItem(COLLAPSED_KEY, 'false');
                                        window.dispatchEvent(new Event('admin-sidebar-expand'));
                                        setOpenGroups(prev => ({ ...prev, [group.name]: true }));
                                    } else {
                                        toggleGroup(group.name);
                                    }
                                } else {
                                    onNavigate?.();
                                    navigate(group.link);
                                }
                            }}
                            className={`w-full flex items-center ${collapsed && !onNavigate ? 'justify-center px-1' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm transition-all duration-150 ${
                                isActive && !hasChildren
                                    ? 'bg-blue-50 text-blue-700 font-semibold'
                                    : isActive
                                        ? 'text-gray-900 font-semibold'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                            title={collapsed && !onNavigate ? group.name : undefined}
                        >
                            <group.icon className="w-[18px] h-[18px] shrink-0" />
                            {(!collapsed || onNavigate) && <span className="flex-1 text-left">{group.name}</span>}
                            {(!collapsed || onNavigate) && hasChildren && (
                                <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                            )}
                        </button>

                        {hasChildren && (!collapsed || onNavigate) && (
                            <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="ml-5 border-l border-gray-100 mt-0.5 mb-1 pl-3 space-y-0.5">
                                    {group.children.map(child => (
                                        <NavLink
                                            key={child.link}
                                            to={child.link}
                                            onClick={onNavigate}
                                            className={() => {
                                                // startsWith so nested routes (e.g. timetables/builder) keep their parent lit
                                                const active = location.pathname === child.link ||
                                                    location.pathname.startsWith(`${child.link}/`);
                                                return `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors duration-150 ${
                                                    active
                                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                                }`;
                                            }}
                                        >
                                            {child.name}
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </nav>
    );
};

/* ─── Pinned bottom: school branding + Settings ────────────────────────────── */
const SidebarFooter = ({ collapsed, onNavigate }) => {
    const location = useLocation();
    const { user } = useAuth();
    const brand = useSchoolBrand();

    const schoolName = brand?.name ?? 'Your school';
    const initials = schoolName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
    const settingsActive = location.pathname.startsWith(SETTINGS_NAV.base);

    return (
        <div className="shrink-0 border-t border-gray-100 px-3 py-3 space-y-1.5">
            {/* School branding block — shows the uploaded logo when present */}
            <div className={`flex items-center ${collapsed && !onNavigate ? 'justify-center' : 'gap-2.5 px-2'} py-1.5`}>
                {brand?.logoUrl ? (
                    <img src={brand.logoUrl} alt={schoolName} className="w-8 h-8 rounded-lg object-cover shrink-0 ring-1 ring-gray-200" />
                ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-500 text-white flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm">
                        {initials || <School size={14} />}
                    </div>
                )}
                {(!collapsed || onNavigate) && (
                    <div className="min-w-0">
                        <p className="text-[13px] font-bold text-gray-800 truncate leading-tight">{schoolName}</p>
                        <p className="text-[10px] font-semibold text-gray-400 truncate uppercase tracking-wide">
                            {brand?.schoolId || user?.schoolId || ''}
                        </p>
                    </div>
                )}
            </div>

            {/* Settings — always pinned at the bottom */}
            <NavLink
                to={SETTINGS_NAV.link}
                onClick={onNavigate}
                className={`flex items-center ${collapsed && !onNavigate ? 'justify-center px-1' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                    settingsActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={collapsed && !onNavigate ? 'Settings' : undefined}
            >
                <SETTINGS_NAV.icon className="w-[18px] h-[18px] shrink-0" />
                {(!collapsed || onNavigate) && <span>Settings</span>}
            </NavLink>
        </div>
    );
};

/* ─── Sidebar shell ──────────── */
const SidebarShell = ({ collapsed, setCollapsed, onNavigate }) => {
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
                <NavList collapsed={collapsed} onNavigate={onNavigate} />
            </div>

            {/* Branding + Settings, pinned */}
            <SidebarFooter collapsed={collapsed} onNavigate={onNavigate} />
        </div>
    );
};

/* ─── AdminLayout ────────────── */
const AdminLayout = ({ children, className = '' }) => {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true');

    useEffect(() => { localStorage.setItem(COLLAPSED_KEY, collapsed); }, [collapsed]);
    useEffect(() => { setMobileOpen(false); }, [location]);

    // Icon-rail group clicks re-expand the sidebar (event from NavList)
    useEffect(() => {
        const expand = () => setCollapsed(false);
        window.addEventListener('admin-sidebar-expand', expand);
        return () => window.removeEventListener('admin-sidebar-expand', expand);
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
                <SidebarShell collapsed={false} setCollapsed={() => {}} onNavigate={() => setMobileOpen(false)} />
            </div>

            {/* Desktop sidebar */}
            <aside className={`hidden lg:flex flex-col shrink-0 bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-64'}`}>
                <SidebarShell collapsed={collapsed} setCollapsed={setCollapsed} />
            </aside>

            {/* Main column */}
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
                <main className={`flex-1 p-2 md:p-4 ${className}`}>
                    {children}
                </main>
            </div>

            <ToastHost />
        </div>
    );
};

export default AdminLayout;
