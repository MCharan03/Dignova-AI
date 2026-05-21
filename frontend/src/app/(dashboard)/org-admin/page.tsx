'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';
import { 
    Building2, Users, Stethoscope, Activity, AlertTriangle, Bed, 
    Calendar, ClipboardList, TrendingUp, Shield, RefreshCcw, 
    UserCheck, HeartPulse, Zap, Megaphone, ChevronRight, DollarSign
} from 'lucide-react';

interface OrgDashboardData {
    organization: {
        id: number; name: string; org_code: string;
        subscription_tier: string; ai_philosophy: string;
        is_active: boolean; primary_color: string; accent_color: string;
    };
    counts: {
        total_staff: number; doctors: number; doctors_online: number;
        patients: number; departments: number; active_calls: number;
        completed_calls: number; critical_alerts: number;
        total_resources: number; available_resources: number;
        today_appointments: number;
    };
    capacity: {
        max_beds: number; max_doctors: number;
        bed_utilization: number; doctor_utilization: number;
    };
}

const StatCard = ({ icon: Icon, label, value, color, subtext, delay = 0 }: any) => (
    <BlurIn delay={delay}>
        <GlassCard className={`group p-6 hover:border-${color}/40 transition-all relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}/5 rounded-bl-full pointer-events-none blur-xl group-hover:bg-${color}/10 transition-all`} />
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.2em] mb-2">{label}</p>
                    <p className="text-3xl font-black text-white leading-none">{value}</p>
                    {subtext && <p className="text-[10px] font-mono text-gray-500 mt-2">{subtext}</p>}
                </div>
                <div className={`p-3 rounded-xl bg-white/5 border border-white/5 group-hover:bg-${color}/10 group-hover:border-${color}/20 transition-all`}>
                    <Icon size={22} className={`text-${color} group-hover:scale-110 transition-transform`} />
                </div>
            </div>
        </GlassCard>
    </BlurIn>
);

const UtilizationRing = ({ percentage, label, color }: { percentage: number; label: string; color: string }) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;
    const isWarning = percentage > 80;
    const strokeColor = isWarning ? '#ef4444' : color;

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} className="stroke-white/5" strokeWidth="6" fill="none" />
                    <motion.circle
                        cx="50" cy="50" r={radius}
                        stroke={strokeColor}
                        strokeWidth="6" fill="none" strokeLinecap="round"
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        style={{ strokeDasharray: circumference, filter: `drop-shadow(0 0 6px ${strokeColor}66)` }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-white">{Math.round(percentage)}%</span>
                </div>
            </div>
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.15em]">{label}</span>
        </div>
    );
};

export default function OrgAdminDashboard() {
    const [data, setData] = useState<OrgDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showBroadcast, setShowBroadcast] = useState(false);
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');

    const fetchDashboard = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        try {
            const [dashRes, notifRes] = await Promise.all([
                fetch('/api/org/dashboard', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/notifications?limit=5', { headers: { 'Authorization': `Bearer ${token}` } }),
            ]);
            if (dashRes.ok) setData(await dashRes.json());
            if (notifRes.ok) setNotifications(await notifRes.json());
        } catch (err) {
            console.error('Dashboard fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
        const interval = setInterval(fetchDashboard, 30000);
        return () => clearInterval(interval);
    }, [fetchDashboard]);

    const handleBroadcast = async () => {
        if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
        const token = localStorage.getItem('access_token');
        try {
            await fetch('/api/notifications/broadcast', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: broadcastTitle, message: broadcastMessage, type: 'info', category: 'system' })
            });
            setShowBroadcast(false);
            setBroadcastTitle('');
            setBroadcastMessage('');
            fetchDashboard();
        } catch (err) {
            console.error('Broadcast failed:', err);
        }
    };

    if (loading || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                <div className="relative">
                    <div className="w-12 h-12 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-accent-blue rounded-full animate-pulse" />
                    </div>
                </div>
                <div className="font-mono text-[10px] tracking-[0.4em] text-accent-blue uppercase animate-pulse">Initializing_Hospital_Matrix</div>
            </div>
        );
    }

    const { organization: org, counts, capacity } = data;

    return (
        <div className="flex flex-col gap-6 w-full pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pt-4 pb-2">
                <div>
                    <SplitText text={org.name.toUpperCase()} className="text-2xl md:text-3xl font-black text-white tracking-[0.15em]" />
                    <BlurIn delay={0.2}>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.2em]">{org.org_code}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${org.is_active ? 'bg-success/20 text-success border border-success/30' : 'bg-danger/20 text-danger border border-danger/30'}`}>
                                {org.is_active ? 'ACTIVE' : 'SUSPENDED'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-accent-blue/20 text-accent-blue border border-accent-blue/30">
                                {org.subscription_tier}
                            </span>
                        </div>
                    </BlurIn>
                </div>
                <div className="flex items-center gap-3">
                    <GlassButton onClick={() => setShowBroadcast(true)} className="gap-2 !text-xs !py-2">
                        <Megaphone size={16} /> Broadcast
                    </GlassButton>
                    <GlassButton onClick={fetchDashboard} className="!p-3">
                        <RefreshCcw size={18} className={`text-accent-cyan ${loading ? 'animate-spin' : ''}`} />
                    </GlassButton>
                </div>
            </header>

            {/* KPI ROW */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard icon={Stethoscope} label="Doctors" value={counts.doctors} color="accent-blue" subtext={`${counts.doctors_online} online`} delay={0.1} />
                <StatCard icon={Users} label="Patients" value={counts.patients} color="accent-cyan" subtext="Registered" delay={0.15} />
                <StatCard icon={ClipboardList} label="Departments" value={counts.departments} color="accent-purple" subtext="Active" delay={0.2} />
                <StatCard icon={Activity} label="Active Calls" value={counts.active_calls} color="accent-magenta" subtext={`${counts.completed_calls} completed`} delay={0.25} />
                <StatCard icon={AlertTriangle} label="Critical" value={counts.critical_alerts} color="danger" subtext="Needs attention" delay={0.3} />
                <StatCard icon={Calendar} label="Appointments" value={counts.today_appointments} color="purple-400" subtext="Today" delay={0.35} />
            </div>

            {/* SECOND ROW: Capacity + Quick Actions + Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Capacity Utilization */}
                <BlurIn delay={0.4} className="lg:col-span-4">
                    <GlassCard className="p-6 border-white/5 h-full">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Bed className="text-accent-cyan" size={18} /> Capacity_Utilization
                        </h3>
                        <div className="flex justify-around">
                            <UtilizationRing percentage={capacity.bed_utilization} label="Bed Load" color="#00ffff" />
                            <UtilizationRing percentage={capacity.doctor_utilization} label="Doctor Load" color="#3b82f6" />
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                            <div className="text-center">
                                <p className="text-lg font-bold text-white">{capacity.max_beds}</p>
                                <p className="text-[9px] font-mono text-gray-500 uppercase">Max Beds</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-white">{capacity.max_doctors}</p>
                                <p className="text-[9px] font-mono text-gray-500 uppercase">Max Doctors</p>
                            </div>
                        </div>
                    </GlassCard>
                </BlurIn>

                {/* Quick Actions */}
                <BlurIn delay={0.5} className="lg:col-span-4">
                    <GlassCard className="p-6 border-white/5 h-full">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Zap className="text-warning" size={18} /> Quick_Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Command Center', href: '/org-admin/admissions', icon: Zap, color: 'accent-cyan' },
                                { label: 'Ward Matrix', href: '/org-admin/ward', icon: Map, color: 'accent-blue' },
                                { label: 'Staff Management', href: '/org-admin/staff', icon: Users, color: 'accent-purple' },
                                { label: 'Add Department', href: '/org-admin/departments', icon: ClipboardList, color: 'accent-purple' },
                                { label: 'Manage Shifts', href: '/org-admin/schedules', icon: Calendar, color: 'accent-blue' },
                                { label: 'Org Settings', href: '/org-admin/settings', icon: Shield, color: 'success' },
                            ].map((action) => (
                                <motion.a
                                    key={action.label}
                                    href={action.href}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`p-4 rounded-xl bg-black/40 border border-white/5 hover:border-${action.color}/30 flex flex-col items-center gap-2 transition-all group cursor-pointer`}
                                >
                                    <action.icon size={20} className={`text-${action.color} group-hover:scale-110 transition-transform`} />
                                    <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider text-center">{action.label}</span>
                                </motion.a>
                            ))}
                        </div>
                    </GlassCard>
                </BlurIn>

                {/* Recent Notifications */}
                <BlurIn delay={0.6} className="lg:col-span-4">
                    <GlassCard className="p-6 border-white/5 h-full">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                            <HeartPulse className="text-danger" size={18} /> Live_Feed
                        </h3>
                        <div className="space-y-3">
                            {notifications.length > 0 ? notifications.map((n: any) => (
                                <motion.div
                                    key={n.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`p-3 rounded-lg bg-black/40 border ${n.type === 'critical' ? 'border-danger/30' : 'border-white/5'} flex items-start gap-3`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.type === 'critical' ? 'bg-danger animate-pulse' : n.type === 'warning' ? 'bg-warning' : 'bg-accent-cyan'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{n.title}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{n.message}</p>
                                    </div>
                                    <span className="text-[8px] font-mono text-gray-600 shrink-0">
                                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </motion.div>
                            )) : (
                                <div className="py-8 text-center">
                                    <p className="text-[10px] font-mono text-gray-600 uppercase tracking-[0.2em]">No recent activity</p>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </BlurIn>
            </div>

            {/* AI PHILOSOPHY INDICATOR */}
            <BlurIn delay={0.7}>
                <GlassCard className="p-4 border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${org.primary_color}20`, borderColor: `${org.primary_color}40`, borderWidth: 1 }}>
                            <Shield size={20} style={{ color: org.primary_color }} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white uppercase tracking-wider">AI Philosophy: <span style={{ color: org.accent_color }}>{org.ai_philosophy.toUpperCase()}</span></p>
                            <p className="text-[9px] font-mono text-gray-500">
                                {org.ai_philosophy === 'aggressive' ? 'Maximum automation, minimal human gatekeeping' :
                                 org.ai_philosophy === 'conservative' ? 'All AI decisions require doctor approval' :
                                 'AI handles standard cases, escalates elevated+'}
                            </p>
                        </div>
                    </div>
                    <a href="/org-admin/settings" className="flex items-center gap-1 text-[9px] font-mono text-gray-500 hover:text-white transition-all uppercase">
                        Configure <ChevronRight size={12} />
                    </a>
                </GlassCard>
            </BlurIn>

            {/* BROADCAST MODAL */}
            <AnimatePresence>
                {showBroadcast && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setShowBroadcast(false); }}
                    >
                        <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} className="w-full max-w-lg">
                            <GlassCard className="!p-8 border-accent-blue/30 bg-black/90">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                    <Megaphone className="text-accent-blue" /> Broadcast Alert
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Title</label>
                                        <input
                                            value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)}
                                            className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-blue/50 transition-all font-mono text-sm"
                                            placeholder="Emergency maintenance notice..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1 block">Message</label>
                                        <textarea
                                            value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)}
                                            rows={3}
                                            className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent-blue/50 transition-all font-mono text-sm resize-none"
                                            placeholder="Details of the broadcast..."
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button onClick={() => setShowBroadcast(false)} className="flex-1 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-bold uppercase hover:bg-white/10 transition-all">Cancel</button>
                                        <button onClick={handleBroadcast} className="flex-1 py-3 rounded-lg bg-accent-blue/20 border border-accent-blue/50 text-accent-blue text-xs font-bold uppercase hover:bg-accent-blue/30 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">Send Broadcast</button>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
