'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Activity, ShieldCheck, LogOut, Menu, X, LayoutDashboard, History, Settings, Users, UserCircle, GraduationCap, Stethoscope, HeartPulse, Zap, Radio, Building2, Bell, Calendar, ClipboardList, FileText } from 'lucide-react';
import { useSentientObserver } from '@/hooks/useSentientObserver';
import { useNetworkResilience } from '@/hooks/useNetworkResilience';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';
import './dashboard.css';

interface UserState {
    id: number;
    name: string;
    email: string;
    role: string;
    tier?: string;
    organization_id?: number;
    is_verified: boolean;
    avg_stress_level: number;
    diagnostic_accuracy: number;
}

interface OrganizationState {
    id: number;
    name: string;
    primary_color: string;
    accent_color: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const telemetry = useSentientObserver();
    const { survivorMode } = useNetworkResilience();

    const [user, setUser] = useState<UserState | null>(null);
    const [org, setOrg] = useState<OrganizationState | null>(null);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    
    const userFetchedRef = useRef(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // ─── SILKY GPU MOUSE TRACKING (Zero React Overhead) ─────────────────
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
            document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
        };
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // ─── APPLE PHYSICS SCROLL ENGINE ───────────────────────────────────────
    const { scrollY } = useScroll({ container: scrollContainerRef });
    
    const islandWidth = useTransform(scrollY, [0, 100], ["92%", "40%"]);
    const islandHeight = useTransform(scrollY, [0, 100], ["64px", "40px"]);
    const islandY = useTransform(scrollY, [0, 100], [0, 10]);
    const islandOpacity = useTransform(scrollY, [200, 350], [1, 0]);

    const smoothWidth = useSpring(islandWidth, { stiffness: 300, damping: 30 });
    const smoothHeight = useSpring(islandHeight, { stiffness: 300, damping: 30 });
    const smoothY = useSpring(islandY, { stiffness: 300, damping: 30 });
    const smoothOpacity = useSpring(islandOpacity, { stiffness: 300, damping: 30 });

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            router.push('/login');
            return;
        }
        if (userFetchedRef.current && user) {
            setLoading(false);
            return;
        }
        const fetchData = async () => {
            try {
                const meRes = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!meRes.ok) throw new Error("Invalid session");
                const userData = await meRes.json();
                setUser(userData);
                if (userData.organization_id) {
                    const orgRes = await fetch('/api/hospital/organization/me', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (orgRes.ok) {
                        const orgData = await orgRes.json();
                        setOrg(orgData);
                        document.documentElement.style.setProperty('--org-primary', orgData.primary_color);
                        document.documentElement.style.setProperty('--org-accent', orgData.accent_color);
                    }
                }
                // Fetch unread notification count
                try {
                    const notifRes = await fetch('/api/notifications/count', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (notifRes.ok) {
                        const notifData = await notifRes.json();
                        setUnreadCount(notifData.unread_count || 0);
                    }
                } catch {}

                userFetchedRef.current = true;
                setLoading(false);
            } catch (err) {
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
        const isSuperAdmin = user.role === 'super_admin';
        const isOrgAdmin = user.role === 'org_admin';
        
        if (isSuperAdmin) {
            if (!pathname.startsWith('/admin') && !isProfilePage) router.push('/admin');
        } else if (isOrgAdmin) {
            if (!pathname.startsWith('/org-admin') && !isProfilePage) router.push('/org-admin');
        } else if (user.role === 'doctor') {
            const isSharedPath = pathname.startsWith('/user/messages') || isProfilePage;
            if (user.tier === 'intern') {
                if (!isInternPath && !isSharedPath) router.push('/intern');
            } else {
                if (!pathname.startsWith('/doctor') && !isSharedPath) router.push('/doctor');
            }
        } else {
            if (!pathname.startsWith('/user') && !isProfilePage) router.push('/user');
        }
    }, [pathname, user, loading, router]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        router.push('/login');
    };

    const getNavItems = () => {
        if (!user) return [];
        
        // Super Admin — global platform control
        if (user.role === 'super_admin') {
            return [
                { name: 'Command Center', path: '/admin', icon: <LayoutDashboard size={20} /> },
                { name: 'Organizations', path: '/admin/organizations', icon: <Building2 size={20} /> },
                { name: 'Users', path: '/admin/users', icon: <Users size={20} /> },
                { name: 'Doctors', path: '/admin/doctors', icon: <Stethoscope size={20} /> },
                { name: 'Audit Log', path: '/admin/history', icon: <History size={20} /> },
                { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> }
            ];
        }
        
        // Org Admin — hospital-specific control
        if (user.role === 'org_admin') {
            return [
                { name: 'Hospital HQ', path: '/org-admin', icon: <Building2 size={20} /> },
                { name: 'Departments', path: '/org-admin/departments', icon: <ClipboardList size={20} /> },
                { name: 'Schedules', path: '/org-admin/schedules', icon: <Calendar size={20} /> },
                { name: 'Patients', path: '/org-admin/patients', icon: <Users size={20} /> },
                { name: 'Staff', path: '/org-admin/staff', icon: <Stethoscope size={20} /> },
                { name: 'Settings', path: '/org-admin/settings', icon: <Settings size={20} /> }
            ];
        }
        
        // Doctor
        if (user.role === 'doctor') {
            if (user.tier === 'intern') {
                return [
                    { name: 'Training Terminal', path: '/intern', icon: <GraduationCap size={20} /> },
                    { name: 'Reports', path: '/intern/reports', icon: <History size={20} /> },
                    { name: 'Profile', path: '/user/profile', icon: <UserCircle size={20} /> },
                ];
            }
            return [
                { name: 'Command', path: '/doctor', icon: <Stethoscope size={20} /> },
                { name: 'Training Lab', path: '/doctor/training', icon: <GraduationCap size={20} /> },
                { name: 'History', path: '/doctor/history', icon: <History size={20} /> },
                { name: 'Messages', path: '/user/messages', icon: <Radio size={20} /> },
                { name: 'Profile', path: '/user/profile', icon: <UserCircle size={20} /> },
            ];
        }
        
        // Patient/User
        return [
            { name: 'Dashboard', path: '/user', icon: <LayoutDashboard size={20} /> },
            { name: 'Triage AI', path: '/user/call', icon: <HeartPulse size={20} /> },
            { name: 'Vitals', path: '/user/vitals', icon: <Activity size={20} /> },
            { name: 'Messages', path: '/user/messages', icon: <Radio size={20} /> },
            { name: 'History', path: '/user/history', icon: <History size={20} /> },
            { name: 'Identity', path: '/user/profile', icon: <UserCircle size={20} /> },
        ];
    };

    const navItems = getNavItems();

    return (
        <div className="dashboard-layout">
            <AnimatePresence>
                {loading && (
                    <motion.div 
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
                        transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
                    >
                        <div className="flex flex-col items-center gap-6">
                            <Activity className="text-accent-cyan animate-pulse" size={60} />
                            <p className="text-accent-cyan text-xl font-mono tracking-[0.3em] uppercase opacity-50">
                                Synchronizing Neural Layer
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="neural-glow" style={{ 
                left: 'var(--mouse-x)', 
                top: 'var(--mouse-y)',
                transform: 'translate(-50%, -50%)',
                opacity: loading ? 0 : 0.05
            }} />

            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.03] z-10"></div>
                <div className="fixed inset-0 scanlines opacity-5 z-10"></div>
            </div>

            <header className="top-header">
                <motion.div 
                    style={{ width: smoothWidth, height: smoothHeight, y: smoothY, opacity: smoothOpacity, borderRadius: "24px" }}
                    className="top-header-glass"
                >
                    <AnimatePresence mode="wait">
                        {scrollY.get() < 50 ? (
                            <motion.div key="expanded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-4 text-white">
                                    <ShieldCheck className="text-accent-cyan" size={24} />
                                    <h1 className="header-title tracking-widest">Dignova OS // <span className="opacity-40">{user?.role?.replace('_', ' ')}</span></h1>
                                </div>
                                <div className="header-actions flex items-center gap-6">
                                    {/* GREEN CORRIDOR RADAR */}
                                    <AnimatePresence>
                                        {telemetry.stress > 0.8 && (
                                            <motion.div 
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-black text-emerald-400 uppercase tracking-widest"
                                            >
                                                <Radio size={12} className="animate-pulse" /> Path_Clearing_Active
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {survivorMode && (
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-[10px] font-black text-rose-400 uppercase animate-pulse">
                                            <Zap size={12} /> Survivor_Mode
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4 px-4 py-1.5 rounded-xl bg-white/5 border border-white/5">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[7px] font-mono text-white/30 uppercase">Stress</span>
                                            <div className="w-16 h-1 bg-white/10 rounded-full mt-1">
                                                <motion.div className="h-full bg-accent-cyan" animate={{ width: `${telemetry.stress * 100}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex flex-col"><span className="text-[7px] font-mono text-white/30 uppercase">Focus</span><span className="text-[9px] font-mono text-accent-cyan">{(telemetry.cadence * 100).toFixed(0)}%</span></div>
                                    </div>
                                    {/* Notification Bell */}
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={() => router.push(user?.role === 'super_admin' ? '/admin' : user?.role === 'org_admin' ? '/org-admin' : '/user')}
                                        className="relative p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                                    >
                                        <Bell size={16} className="text-white/60" />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger text-[8px] font-black text-white flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </motion.button>
                                    <div className="user-profile-badge"><div className="avatar" /><span className="text-[10px] font-black uppercase text-white/60">{user?.name?.split(' ')[0]}</span></div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="pill" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex items-center justify-center w-full gap-4">
                                <Activity size={16} className="text-accent-cyan animate-pulse" />
                                <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden"><motion.div className="h-full bg-accent-cyan" animate={{ width: `${telemetry.stress * 100}%` }} /></div>
                                <ShieldCheck size={16} className="text-white/40" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </header>

            <main ref={scrollContainerRef} className="main-content-area">
                <div className="page-content animate-in">{!loading && children}</div>
            </main>

            <nav className="bottom-dock">
                {navItems.map((item) => (
                    <motion.button key={item.name} whileHover={{ y: -8, scale: 1.1 }} whileTap={{ scale: 0.9 }} className={`dock-item ${pathname === item.path ? 'active' : ''}`} onClick={() => router.push(item.path)}>
                        {item.icon}
                        <span className="dock-tooltip">{item.name}</span>
                    </motion.button>
                ))}
                <div className="w-[1px] h-6 bg-white/10 mx-2" />
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="dock-item hover:text-rose-500" onClick={handleLogout}>
                    <LogOut size={20} /><span className="dock-tooltip">Shutdown</span>
                </motion.button>
            </nav>
        </div>
    );
}
