'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { Activity, Heart, Search, Bell, Droplets, Wind, Shield, UserCircle, Calendar, ShieldCheck, ArrowUpRight, Star, Clock, Briefcase, Stethoscope, CreditCard, Sparkles, History, Droplet } from 'lucide-react';
import { MedicalTimeline } from '@/components/dashboard/MedicalTimeline';
import { AppointmentBooking as DoctorBooking } from '@/components/dashboard/DoctorBooking';
import { AshaLocationNode } from '@/components/dashboard/AshaLocationNode';
import { SplitText, BlurIn } from '@/components/ui/SentientMotion';

interface UserStats {
    vitals: {
        heart_rate: number | null;
        systolic_bp: number | null;
        diastolic_bp: number | null;
        spo2: number | null;
        temperature: string | null;
        recorded_at: string | null;
    };
    vitals_chart: { hr: number; systolic: number; diastolic: number; spo2: number; time: string }[];
    recent_calls: { call_id: number; diagnosis: string | null; state: string; severity: string; start_time: string }[];
    active_sessions: number;
    assigned_doctors: { id: number; name: string; specialty: string | null; is_online: boolean; qualification: string | null; department: string | null; experience_years: number | null; rating: number | null; consultation_fee: number | null; languages: string | null; available_hours: string | null }[];
    system_status: string;
    profile: {
        name: string;
        email: string;
        blood_group: string | null;
        age: number | null;
        emergency_contact: string | null;
    };
}

export default function UserDashboard() {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeline, setTimeline] = useState<any[]>([]);
    const [healthTips, setHealthTips] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'booking'>('overview');

    useEffect(() => {
        const fetchAllData = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            try {
                const [statsRes, timelineRes, tipsRes] = await Promise.all([
                    fetch('/api/stats/user', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/user/timeline', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('/api/user/health-tips', { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                
                if (statsRes.status === 401) {
                    localStorage.removeItem('access_token');
                    window.location.href = '/login';
                    return;
                }

                if (statsRes.ok) {
                    setStats(await statsRes.json());
                } else {
                    console.error("Stats fetch failed with status:", statsRes.status);
                }

                if (timelineRes.ok) setTimeline(await timelineRes.json());
                if (tipsRes.ok) {
                    const tipsData = await tipsRes.json();
                    setHealthTips(tipsData.tips);
                }
            } catch (err) {
                console.error('Critical failure during neural sync:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                <div className="relative">
                    <div className="w-12 h-12 border-2 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-accent-cyan rounded-full animate-pulse" />
                    </div>
                </div>
                <div className="font-mono text-[10px] tracking-[0.4em] text-accent-cyan uppercase animate-pulse">Syncing_Identity_Layer</div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Shield size={40} className="text-rose-500/50" />
                <p className="text-sm font-mono text-white/40 uppercase tracking-widest text-center">
                    Neural Bridge Disconnected<br/>
                    <span className="text-[10px]">Session verification required</span>
                </p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 px-6 py-2 rounded-full border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                    Re-establish Link
                </button>
            </div>
        );
    }

    const { vitals, vitals_chart, profile, assigned_doctors, recent_calls, active_sessions, system_status } = stats;

    const hrPoints = (vitals_chart || []).map((v: any) => v.hr).filter((hr: number) => hr > 0);
    const minHR = hrPoints.length > 0 ? Math.min(...hrPoints) - 5 : 60;
    const maxHR = hrPoints.length > 0 ? Math.max(...hrPoints) + 5 : 100;
    const hrRange = maxHR - minHR || 1;

    const safeVitals = vitals || {
        heart_rate: null, systolic_bp: null, diastolic_bp: null, spo2: null, temperature: null, recorded_at: null
    };

    return (
        <div className="flex flex-col h-full space-y-8 pb-20">
            <header className="flex flex-col gap-2">
                <SplitText text="IDENTITY DASHBOARD" className="text-3xl font-black text-white tracking-[0.2em]" />
                <BlurIn delay={0.2}>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.1em] flex items-center gap-2">
                        <Activity className="text-accent-cyan" size={14} /> Neural_Sync_Established // Node_44_Active
                    </p>
                </BlurIn>
            </header>
            
            <div className="flex justify-between items-center mb-4">
                <BlurIn delay={0.3}>
                    <div className="flex bg-black/40 border border-white/10 rounded-full p-1">
                        <button onClick={() => setActiveTab('overview')} className={`px-4 py-1.5 rounded-full text-[10px] font-mono transition-all ${activeTab === 'overview' ? 'bg-accent-cyan text-black' : 'text-gray-400 hover:text-white'}`}>OVERVIEW</button>
                        <button onClick={() => setActiveTab('timeline')} className={`px-4 py-1.5 rounded-full text-[10px] font-mono transition-all ${activeTab === 'timeline' ? 'bg-accent-blue text-white' : 'text-gray-400 hover:text-white'}`}>TIMELINE</button>
                        <button onClick={() => setActiveTab('booking')} className={`px-4 py-1.5 rounded-full text-[10px] font-mono transition-all ${activeTab === 'booking' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}>BOOKING</button>
                    </div>
                </BlurIn>
                <div className="w-10 h-10 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center overflow-hidden">
                    <UserCircle size={24} className="text-accent-blue" />
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-8 space-y-6">
                            <BlurIn delay={0.4}>
                                <GlassCard className="border-accent-cyan/20 bg-accent-cyan/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 rounded-lg bg-accent-cyan/20">
                                            <Sparkles className="text-accent-cyan" size={20} />
                                        </div>
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Sentient Health Insights</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {healthTips.map((tip, i) => (
                                            <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-black/40 border border-white/5">
                                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse shrink-0" />
                                                <p className="text-xs text-gray-300 leading-relaxed">{tip}</p>
                                            </div>
                                        ))}
                                    </div>
                                </GlassCard>
                            </BlurIn>

                            <BlurIn delay={0.5}>
                                <div className="grid grid-cols-3 gap-4">
                                    <GlassCard className="flex flex-col items-center justify-center p-6 group hover:border-accent-cyan/40 transition-all">
                                        <Heart className="text-accent-cyan mb-2 group-hover:scale-110 transition-transform" size={32} />
                                        <span className="text-3xl font-bold text-white">{safeVitals.heart_rate || '--'}</span>
                                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">BPM_PULSE</span>
                                    </GlassCard>
                                    <GlassCard className="flex flex-col items-center justify-center p-6 group hover:border-accent-cyan/40 transition-all">
                                        <Droplet className="text-accent-blue mb-2 group-hover:scale-110 transition-transform" size={32} />
                                        <span className="text-3xl font-bold text-white">{safeVitals.spo2 || '--'}<span className="text-sm">%</span></span>
                                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">SPO2_LEVEL</span>
                                    </GlassCard>
                                    <GlassCard className="flex flex-col items-center justify-center p-6 group hover:border-accent-cyan/40 transition-all">
                                        <Shield className="text-success mb-2 group-hover:scale-110 transition-transform" size={32} />
                                        <span className="text-3xl font-bold text-white">{safeVitals.systolic_bp || '--'}<span className="text-sm text-gray-500">/{safeVitals.diastolic_bp || '--'}</span></span>
                                        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">BP_READING</span>
                                    </GlassCard>
                                </div>
                            </BlurIn>

                            <BlurIn delay={0.6}>
                                <GlassCard className="p-6">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Heart className="text-danger" size={18} /> PULSE_HISTORY
                                    </h3>
                                    <div className="w-full h-32 bg-black/40 rounded-xl border border-white/5 flex items-end p-2 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,60,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,60,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
                                        {hrPoints.length > 1 && (
                                            <svg viewBox={`0 0 ${hrPoints.length * 40} 100`} className="w-full h-full drop-shadow-[0_0_8px_rgba(255,0,60,0.8)] opacity-80" preserveAspectRatio="none">
                                                <defs>
                                                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                                        <stop offset="0%" stopColor="#ff003c" stopOpacity="0.2" /><stop offset="50%" stopColor="#ff003c" stopOpacity="1" /><stop offset="100%" stopColor="#ff003c" stopOpacity="0.2" />
                                                    </linearGradient>
                                                </defs>
                                                <motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }} d={`M 0 ${100 - ((hrPoints[0] - minHR) / hrRange) * 80 - 10} ` + hrPoints.map((hr: number, i: number) => { if(i === 0) return ''; const x = i * 40; const y = 100 - ((hr - minHR) / hrRange) * 80 - 10; const prevX = (i-1) * 40; const prevY = 100 - ((hrPoints[i-1] - minHR) / hrRange) * 80 - 10; const ctrlX = prevX + 20; return `C ${ctrlX} ${prevY}, ${ctrlX} ${y}, ${x} ${y}`; }).join(' ')} fill="none" stroke="url(#lineGrad)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                                            </svg>
                                        )}
                                    </div>
                                </GlassCard>
                            </BlurIn>
                        </div>

                        <div className="col-span-4 space-y-6">
                            <BlurIn delay={0.7}>
                                <GlassCard className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">Subject: {profile.name?.split(' ')[0]?.toUpperCase()}</h3>
                                            <p className="text-xs font-mono text-gray-400">{profile.email}</p>
                                        </div>
                                        <div className="px-2 py-1 bg-success/20 border border-success/30 text-success text-xs font-bold rounded">VERIFIED</div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-y-6 gap-x-2 text-sm">
                                        <div><p className="text-xs text-gray-500 font-mono mb-1">Blood</p><p className="font-bold text-white">{profile.blood_group ?? '—'}</p></div>
                                        <div><p className="text-xs text-gray-500 font-mono mb-1">Age</p><p className="font-bold text-white">{profile.age ?? '—'} Y</p></div>
                                        <div><p className="text-xs text-gray-500 font-mono mb-1">Status</p><p className="font-bold text-success text-sm">{system_status === 'Active Triage In Progress' ? 'IN TRIAGE' : 'NOMINAL'}</p></div>
                                        <div><p className="text-xs text-gray-500 font-mono mb-1">Sessions</p><p className="font-bold text-white">{active_sessions}</p></div>
                                        <div><p className="text-xs text-gray-500 font-mono mb-1">Total Calls</p><p className="font-bold text-white">{recent_calls.length}</p></div>
                                        <div><p className="text-xs text-gray-500 font-mono mb-1">Emergency</p><p className="font-bold text-accent-cyan text-xs">{profile.emergency_contact ?? '—'}</p></div>
                                    </div>
                                </GlassCard>
                            </BlurIn>

                            <BlurIn delay={0.8}>
                                <GlassCard>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2"><ShieldCheck className="text-accent-blue" size={18} /> SECURITY_STATUS</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-3 rounded-lg bg-black/40 border border-white/5"><span className="text-[10px] font-mono text-gray-400">ENCRYPTION</span><span className="text-[10px] font-mono text-accent-cyan">AES-256_ACTIVE</span></div>
                                        <div className="flex justify-between items-center p-3 rounded-lg bg-black/40 border border-white/5"><span className="text-[10px] font-mono text-gray-400">IDENTITY_LOCK</span><span className="text-[10px] font-mono text-accent-blue">VERIFIED</span></div>
                                    </div>
                                </GlassCard>
                            </BlurIn>

                            <BlurIn delay={0.9}>
                                <GlassCard>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2"><Stethoscope className="text-accent-cyan" size={18} /> MEDICAL_GRID</h3>
                                    <div className="space-y-3">
                                        {assigned_doctors.map(doc => (
                                            <div key={doc.id} className="p-3 rounded-lg bg-black/40 border border-white/5 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center border border-accent-blue/30"><UserCircle className="text-accent-blue" size={20} /></div>
                                                <div><h4 className="text-xs font-bold text-white">{doc.name}</h4><p className="text-[9px] text-gray-500 uppercase font-mono">{doc.specialty || 'General'}</p></div>
                                            </div>
                                        ))}
                                    </div>
                                </GlassCard>
                            </BlurIn>
                        </div>
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <motion.div key="timeline" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <GlassCard className="border-white/5 bg-black/20"><MedicalTimeline events={timeline} /></GlassCard>
                    </motion.div>
                )}

                {activeTab === 'booking' && (
                    <motion.div key="booking" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}>
                        <GlassCard className="border-white/5 bg-black/20"><DoctorBooking doctors={stats.assigned_doctors as any} onBooked={() => setActiveTab('timeline')} /></GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ASHA LOCATION NODE (Level 06 Geofencing) */}
            <AshaLocationNode />
        </div>
    );
}
