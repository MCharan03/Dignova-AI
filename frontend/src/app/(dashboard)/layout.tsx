'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Activity, ShieldCheck, LogOut, Menu, X, LayoutDashboard, History, Settings, Users, UserCircle, GraduationCap, Stethoscope, HeartPulse, Zap, Radio, Building2, Bell, Calendar, ClipboardList, FileText, BarChart3, AlertTriangle } from 'lucide-react';
import { useSentientObserver } from '@/hooks/useSentientObserver';
import { useNetworkResilience } from '@/hooks/useNetworkResilience';
import { useNotificationStream } from '@/hooks/useNotificationStream';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';
import { CherryHUD } from '@/components/dashboard/CherryHUD';
import './dashboard.css';

interface UserState { id: number; name: string; email: string; role: string; tier?: string; organization_id?: number; is_verified: boolean; avg_stress_level: number; diagnostic_accuracy: number; }
interface OrganizationState { id: number; name: string; primary_color: string; accent_color: string; }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const telemetry = useSentientObserver();
    const { survivorMode } = useNetworkResilience();

    const [user, setUser] = useState<UserState | null>(null);
    const [org, setOrg] = useState<OrganizationState | null>(null);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notifToast, setNotifToast] = useState<string | null>(null);

    const userFetchedRef = useRef(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // --- GPU MOUSE TRACKING ---
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
            document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
        };
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // --- APPLE PHYSICS SCROLL ---
    const { scrollY } = useScroll({ container: scrollContainerRef });
    const islandWidth = useTransform(scrollY, [0, 100], ['92%', '40%']);
    const islandHeight = useTransform(scrollY, [0, 100], ['64px', '40px']);
    const islandY = useTransform(scrollY, [0, 100], [0, 10]);
    const islandOpacity = useTransform(scrollY, [200, 350], [1, 0]);
    const smoothWidth = useSpring(islandWidth, { stiffness: 300, damping: 30 });
    const smoothHeight = useSpring(islandHeight, { stiffness: 300, damping: 30 });
    const smoothY = useSpring(islandY, { stiffness: 300, damping: 30 });
    const smoothOpacity = useSpring(islandOpacity, { stiffness: 300, damping: 30 });

    // --- SSE Notifications ---
    const handleNotification = useCallback((payload: any) => {
        setNotifToast(payload.type === 'SOS' ? `🚨 SOS from ${payload.patient}` : payload.title || 'New notification');
        setTimeout(() => setNotifToast(null), 4000);
        setUnreadCount(c => c + 1);
    }, []);

    useNotificationStream({
        onNotification: handleNotification,
        onCountUpdate: setUnreadCount,
    });

    // --- DATA FETCH ---
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) { router.push('/login'); return; }
        if (userFetchedRef.current && user) { setLoading(false); return; }
        const fetchData = async () => {
            try {
                const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                if (!meRes.ok) throw new Error('Invalid session');
                const userData = await meRes.json();
                setUser(userData);
                if (userData.organization_id) {
                    const orgRes = await fetch('/api/hospital/organization/me', { headers: { Authorization: `Bearer ${token}` } });
                    if (orgRes.ok) {
                        const orgData = await orgRes.json();
                        setOrg(orgData);
                        document.documentElement.style.setProperty('--org-primary', orgData.primary_color);
                        document.documentElement.style.setProperty('--org-accent', orgData.accent_color);
                    }
                }
                try {
                    const notifRes = await fetch('/api/notifications/count', { headers: { Authorization: `Bearer ${token}` } });
                    if (notifRes.ok) { const d = await notifRes.json(); setUnreadCount(d.unread_count || 0); }
                } catch {}
                userFetchedRef.current = true;
                setLoading(false);
            } catch {
                localStorage.removeItem('access_token');
                router.push('/login');
            }
        };
        fetchData();
    }, [router]);

    useEffect(() => {
        if (!user || loading) return;
        const isProfilePage = pathname === '/user/profile';
        const isInternPath = pathname.startsWith('/intern');
        if (user.role === 'super_admin') { if (!pathname.startsWith('/admin') && !isProfilePage) router.push('/admin'); }
        else if (user.role === 'org_admin') { if (!pathname.startsWith('/org-admin') && !isProfilePage) router.push('/org-admin'); }
        else if (user.role === 'doctor') {
            const isShared = pathname.startsWith('/user/messages') || isProfilePage;
            if (user.tier === 'intern') { if (!isInternPath && !isShared) router.push('/intern'); }
            else { if (!pathname.startsWith('/doctor') && !isShared) router.push('/doctor'); }
        } else if (user.role === 'org_admin' || user.role === 'receptionist') {
            if (!pathname.startsWith('/org-admin') && !isProfilePage) router.push('/org-admin');
        } else { if (!pathname.startsWith('/user') && !isProfilePage) router.push('/user'); }
    }, [pathname, user, loading, router]);

    const handleLogout = () => { localStorage.removeItem('access_token'); router.push('/login'); };

    const getNavItems = () => {
        if (!user) return [];
        if (user.role === 'super_admin') return [
            { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
            { name: 'Analytics', path: '/admin/analytics', icon: <BarChart3 size={20} /> },
            { name: 'Organizations', path: '/admin/organizations', icon: <Building2 size={20} /> },
            { name: 'Users', path: '/admin/users', icon: <Users size={20} /> },
            { name: 'Doctors', path: '/admin/doctors', icon: <Stethoscope size={20} /> },
            { name: 'Activity Log', path: '/admin/history', icon: <History size={20} /> },
            { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
        ];
        if (user.role === 'org_admin' || user.role === 'receptionist') return [
            { name: 'Dashboard', path: '/org-admin', icon: <Building2 size={20} /> },
            { name: 'Patients', path: '/org-admin/admissions', icon: <Users size={20} /> },
            { name: 'Departments', path: '/org-admin/departments', icon: <ClipboardList size={20} /> },
            { name: 'Staff', path: '/org-admin/staff', icon: <Stethoscope size={20} /> },
            { name: 'Schedule', path: '/org-admin/schedules', icon: <Calendar size={20} /> },
            { name: 'Settings', path: '/org-admin/settings', icon: <Settings size={20} /> },
            { name: 'Profile', path: '/user/profile', icon: <UserCircle size={20} /> },
        ];
        if (user.role === 'doctor') {
            if (user.tier === 'intern') return [
                { name: 'Training', path: '/intern', icon: <GraduationCap size={20} /> },
                { name: 'Reports', path: '/intern/reports', icon: <History size={20} /> },
                { name: 'Profile', path: '/user/profile', icon: <UserCircle size={20} /> },
            ];
            return [
                { name: 'Dashboard', path: '/doctor', icon: <Stethoscope size={20} /> },
                { name: 'Appointments', path: '/doctor/appointments', icon: <Calendar size={20} /> },
                { name: 'Availability', path: '/doctor/availability', icon: <ClipboardList size={20} /> },
                { name: 'Prescriptions', path: '/doctor/prescriptions', icon: <FileText size={20} /> },
                { name: 'Training', path: '/doctor/training', icon: <GraduationCap size={20} /> },
                { name: 'Call History', path: '/doctor/history', icon: <History size={20} /> },
                { name: 'Messages', path: '/user/messages', icon: <Radio size={20} /> },
                { name: 'Profile', path: '/user/profile', icon: <UserCircle size={20} /> },
            ];
        }
        return [
            { name: 'Home', path: '/user', icon: <LayoutDashboard size={20} /> },
            { name: 'Call Doctor', path: '/user/call', icon: <HeartPulse size={20} /> },
            { name: 'Prescriptions', path: '/user/prescriptions', icon: <FileText size={20} /> },
            { name: 'Vitals', path: '/user/vitals', icon: <Activity size={20} /> },
            { name: 'Messages', path: '/user/messages', icon: <Radio size={20} /> },
            { name: 'Call History', path: '/user/history', icon: <History size={20} /> },
            { name: 'Profile', path: '/user/profile', icon: <UserCircle size={20} /> },
        ];
    };

    const navItems = getNavItems();

    return (
        <div className="dashboard-layout">
            <AnimatePresence>
                {loading && (
                    <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }} transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }} className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
                        <div className="flex flex-col items-center gap-6">
                            <Activity className="text-accent-cyan animate-pulse" size={60} />
                            <p className="text-accent-cyan text-xl font-mono tracking-[0.3em] uppercase opacity-50">Loading your dashboard...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SSE Toast notification */}
            <AnimatePresence>
                {notifToast && (
                    <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className="fixed top-20 left-1/2 z-[9998] px-6 py-3 rounded-2xl bg-black border border-accent-cyan/40 text-sm text-white font-mono shadow-2xl shadow-accent-cyan/20">
                        {notifToast}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="neural-glow" style={{ left: 'var(--mouse-x)', top: 'var(--mouse-y)', transform: 'translate(-50%, -50%)', opacity: loading ? 0 : 0.05 }} />
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.03] z-10" />
                <div className="fixed inset-0 scanlines opacity-5 z-10" />
            </div>

            <header className="top-header">
                <motion.div style={{ width: smoothWidth, height: smoothHeight, y: smoothY, opacity: smoothOpacity, borderRadius: '24px' }} className="top-header-glass">
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4 text-white">
                            <ShieldCheck className="text-accent-cyan" size={24} />
                            <h1 className="header-title tracking-widest hidden sm:block">Dignova OS // <span className="opacity-40">{user?.role?.replace('_', ' ')}</span></h1>
                        </div>
                        <div className="header-actions flex items-center gap-3">
                            <AnimatePresence>
                                {telemetry.stress > 0.8 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                                        <Radio size={12} className="animate-pulse" /> Path_Clearing
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            {survivorMode && <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-[10px] font-black text-rose-400 uppercase animate-pulse"><Zap size={12} /> Survivor</div>}

                            <CherryHUD />
                            <ThemeToggle />

                            {/* Notification Bell */}
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => router.push(user?.role === 'super_admin' ? '/admin' : user?.role === 'org_admin' ? '/org-admin' : '/user')} className="relative p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                                <Bell size={16} className="text-white/60" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-[8px] font-black text-white flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </motion.button>

                            <div className="user-profile-badge hidden sm:flex"><div className="avatar" /><span className="text-[10px] font-black uppercase text-white/60">{user?.name?.split(' ')[0]}</span></div>

                            {/* Mobile hamburger */}
                            <button className="md:hidden p-2 rounded-xl bg-white/5 border border-white/5" onClick={() => setMobileMenuOpen(v => !v)}>
                                {mobileMenuOpen ? <X size={18} className="text-white/60" /> : <Menu size={18} className="text-white/60" />}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </header>

            {/* Mobile slide-out menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }}
                        className="fixed inset-y-0 right-0 w-72 z-[998] bg-[#0B0F19]/95 backdrop-blur-xl border-l border-white/10 flex flex-col p-6 gap-3 pt-24">
                        {navItems.map(item => {
                            const isActive = pathname === item.path || (!['/admin', '/org-admin', '/doctor', '/user'].includes(item.path) && pathname.startsWith(item.path));
                            return (
                                <button key={item.name} onClick={() => { router.push(item.path); setMobileMenuOpen(false); }}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isActive ? 'bg-accent-cyan/20 border border-accent-cyan/30 text-accent-cyan' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
                                    {item.icon}{item.name}
                                </button>
                            );
                        })}
                        <div className="mt-auto">
                            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-rose-400 hover:bg-rose-500/10 transition-all w-full"><LogOut size={20} /> Logout</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main ref={scrollContainerRef} className={`main-content-area ${pathname.includes('triage') ? 'no-dock' : ''}`}>
                <div className="page-content animate-in">{!loading && children}</div>
            </main>

            {/* Desktop bottom dock */}
            {!pathname.includes('triage') && (
                <nav className="bottom-dock hidden md:flex">
                    {navItems.map(item => {
                        const isActive = pathname === item.path || (!['/admin', '/org-admin', '/doctor', '/user'].includes(item.path) && pathname.startsWith(item.path));
                        return (
                            <button key={item.name} className={`dock-item ${isActive ? 'active' : ''}`} onClick={() => router.push(item.path)}>
                                {item.icon}<span className="dock-tooltip">{item.name}</span>
                            </button>
                        );
                    })}
                    <div className="w-[1px] h-6 bg-white/10 mx-2" />
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="dock-item hover:text-rose-500" onClick={handleLogout}>
                        <LogOut size={20} /><span className="dock-tooltip">Shutdown</span>
                    </motion.button>
                </nav>
            )}
        </div>
    );
}
