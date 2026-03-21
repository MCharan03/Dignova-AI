'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Activity, ShieldCheck, LogOut, Menu, X, LayoutDashboard, History, Settings, Users, UserCircle, GraduationCap, Stethoscope, HeartPulse } from 'lucide-react';
import './dashboard.css';

interface UserState {
    id: number;
    name: string;
    email: string;
    role: string;
    tier?: string;
    is_verified: boolean;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const [user, setUser] = useState<UserState | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            router.push('/login');
            return;
        }

        fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error("Invalid token");
                return res.json();
            })
            .then(data => {
                setUser(data);

                // Role-based Redirection Logic
                const isSharedPage = pathname === '/user/profile';

                if (data.role === 'admin') {
                    if (!pathname.startsWith('/admin') && !isSharedPage) router.push('/admin');
                } else if (data.role === 'doctor') {
                    if (data.tier === 'intern') {
                        if (!pathname.startsWith('/intern') && !isSharedPage) router.push('/intern');
                    } else {
                        if (!pathname.startsWith('/doctor') && !isSharedPage) router.push('/doctor');
                    }
                } else {
                    if (!pathname.startsWith('/user')) router.push('/user');
                }

                setLoading(false);
            })
            .catch(() => {
                localStorage.removeItem('access_token');
                router.push('/login');
            });
    }, [pathname, router]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        router.push('/login');
    };

    // Dynamic Navigation Items based on Role and Tier
    const getNavItems = () => {
        if (!user) return [];

        if (user.role === 'admin') {
            return [
                { name: 'Hospital Matrix', path: '/admin', icon: <LayoutDashboard size={20} /> },
                { name: 'User Management', path: '/admin/users', icon: <Users size={20} /> },
                { name: 'Doctor Profiles', path: '/admin/doctors', icon: <Stethoscope size={20} /> },
                { name: 'System Logs', path: '/admin/history', icon: <History size={20} /> },
                { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> }
            ];
        }

        if (user.role === 'doctor') {
            if (user.tier === 'intern') {
                return [
                    { name: 'Training Terminal', path: '/intern', icon: <GraduationCap size={20} /> },
                    { name: 'Performance Reports', path: '/intern/reports', icon: <History size={20} /> },
                    { name: 'Intern Profile', path: '/user/profile', icon: <UserCircle size={20} /> },
                ];
            }
            return [
                { name: 'Doctor Command', path: '/doctor', icon: <Stethoscope size={20} /> },
                { name: 'Patient History', path: '/doctor/history', icon: <History size={20} /> },
                { name: 'Medical Profile', path: '/user/profile', icon: <UserCircle size={20} /> },
            ];
        }

        return [
            { name: 'Dashboard', path: '/user', icon: <LayoutDashboard size={20} /> },
            { name: 'Emergency AI', path: '/user/call', icon: <HeartPulse size={20} /> },
            { name: 'My History', path: '/user/history', icon: <History size={20} /> },
            { name: 'Identity Matrix', path: '/user/profile', icon: <UserCircle size={20} /> },
        ];
    };

    const navItems = getNavItems();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black" style={{ zIndex: 9999 }}>
                <p className="text-accent-cyan animate-pulse text-xl font-mono tracking-widest uppercase">Verifying Security Clearance...</p>
            </div>
        );
    }

    return (
        <div className="dashboard-layout relative overflow-hidden text-gray-200">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="fixed inset-0 pointer-events-none bg-[url('/noise.png')] opacity-5 z-50"></div>
                <div className="fixed inset-0 pointer-events-none z-50 bg-[linear-gradient(transparent_50%,rgba(0,255,255,0.02)_50%)] bg-[length:100%_4px] scanlines"></div>
            </div>

            <div className="flex-container relative z-10">
                <nav className="bottom-dock">
                    {navItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <button
                                key={item.name}
                                className={`dock-item ${isActive ? 'active' : ''}`}
                                onClick={() => router.push(item.path)}
                            >
                                {item.icon}
                                <span className="dock-tooltip">{item.name}</span>
                                {isActive && <div className="dock-active-indicator" />}
                            </button>
                        )
                    })}
                    
                    <div className="w-[1px] h-8 bg-white/20 mx-2" /> {/* Divider before logout */}
                    
                    <button
                        className="dock-item text-gray-400 hover:text-danger hover:bg-danger/20"
                        onClick={handleLogout}
                    >
                        <LogOut size={20} />
                        <span className="dock-tooltip">Sign Out</span>
                    </button>
                </nav>

                <div className="main-content-area">
                    <header className="top-header">
                        <div className="top-header-glass flex items-center justify-between">
                            <div className="flex items-center gap-4 text-white">
                                <ShieldCheck className="text-accent-cyan" size={24} />
                                <h1 className="header-title uppercase tracking-widest text-sm font-bold">
                                    Dignova Layer // <span className="text-gray-500 font-normal">{user?.role === 'admin' ? 'Central Command' : user?.tier === 'intern' ? 'Training Node' : 'Field Agent'}</span>
                                </h1>
                            </div>
                            <div className="header-actions">
                                <div className="user-profile-badge">
                                    <div className="avatar" />
                                    <span>{user?.name || 'Authorized Personnel'}</span>
                                    {user?.tier && (
                                        <span className="ml-2 px-2 py-0.5 rounded-full bg-accent-blue/20 border border-accent-blue/30 text-[10px] font-black text-accent-cyan uppercase">
                                            {user.tier}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="page-content">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}

